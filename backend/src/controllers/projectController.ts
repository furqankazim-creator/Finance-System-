import { Request, Response, NextFunction } from "express";
import { Client, Expense, Invoice, Project } from "../models";
import { sendSuccess, buildPagination } from "../utils/response";
import { AppError } from "../middleware/errorHandler";
import { toCents } from "../utils/money";
import { buildDependencyError } from "../utils/dependencies";
import { assertBelongsToOrg, getOrgIdForUser } from "../utils/orgScope";

const validateProjectDates = (
  startDate?: string | Date,
  endDate?: string | Date
) => {
  if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
    throw new AppError("End date cannot be earlier than start date", 400);
  }
};

const getProjectDependencySummary = async (orgId: unknown, projectId: string) => {
  const [expenseCount, invoiceCount] = await Promise.all([
    Expense.countDocuments({ orgId, projectId }),
    Invoice.countDocuments({ orgId, projectId }),
  ]);

  return buildDependencyError("project", [
    { label: "expense", count: expenseCount },
    { label: "invoice", count: invoiceCount },
  ]);
};

export const getProjects = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgIdForUser(req.user!.id);
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { orgId };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.clientId) filter.clientId = req.query.clientId;
    if (req.query.search) filter.name = { $regex: req.query.search, $options: "i" };

    const [projects, total] = await Promise.all([
      Project.find(filter).populate("clientId", "name email").sort({ createdAt: -1 }).skip(skip).limit(limit),
      Project.countDocuments(filter),
    ]);

    sendSuccess(res, projects, 200, undefined, buildPagination(total, page, limit));
  } catch (err) { next(err); }
};

export const getProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgIdForUser(req.user!.id);
    const project = await Project.findOne({ _id: req.params.id, orgId }).populate("clientId", "name email");
    if (!project) return next(new AppError("Project not found", 404));
    sendSuccess(res, project);
  } catch (err) { next(err); }
};

export const getProjectDeleteImpact = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const orgId = await getOrgIdForUser(req.user!.id);
    const project = await Project.findOne({ _id: req.params.id, orgId });
    if (!project) return next(new AppError("Project not found", 404));

    const dependencyError = await getProjectDependencySummary(orgId, req.params.id);
    sendSuccess(res, {
      blocked: dependencyError.details.length > 0,
      message: dependencyError.details.length
        ? dependencyError.message
        : "This project can be deleted safely.",
      dependencies: dependencyError.details,
    });
  } catch (err) { next(err); }
};

export const createProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgIdForUser(req.user!.id);
    await assertBelongsToOrg(Client, req.body.clientId, orgId, "Client");
    validateProjectDates(req.body.startDate, req.body.endDate);

    const body = { ...req.body, orgId };
    if (body.budget !== undefined) {
      body.budgetCents = toCents(body.budget);
      delete body.budget;
    }
    const project = await Project.create(body);
    const populated = await project.populate("clientId", "name email");
    sendSuccess(res, populated, 201, "Project created");
  } catch (err) { next(err); }
};

export const updateProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgIdForUser(req.user!.id);
    const existingProject = await Project.findOne({ _id: req.params.id, orgId });
    if (!existingProject) {
      return next(new AppError("Project not found", 404));
    }

    if (req.body.clientId) {
      await assertBelongsToOrg(Client, req.body.clientId, orgId, "Client");
    }

    validateProjectDates(
      req.body.startDate ?? existingProject.startDate,
      req.body.endDate ?? existingProject.endDate
    );

    const body = { ...req.body };
    if (body.budget !== undefined) {
      body.budgetCents = toCents(body.budget);
      delete body.budget;
    }
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, orgId },
      body,
      { new: true, runValidators: true }
    ).populate("clientId", "name email");
    sendSuccess(res, project, 200, "Project updated");
  } catch (err) { next(err); }
};

export const deleteProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgIdForUser(req.user!.id);
    const dependencyError = await getProjectDependencySummary(orgId, req.params.id);

    if (dependencyError.details.length > 0) {
      return next(new AppError(dependencyError.message, 409, dependencyError.details));
    }

    const project = await Project.findOneAndDelete({ _id: req.params.id, orgId });
    if (!project) return next(new AppError("Project not found", 404));
    sendSuccess(res, null, 200, "Project deleted");
  } catch (err) { next(err); }
};
