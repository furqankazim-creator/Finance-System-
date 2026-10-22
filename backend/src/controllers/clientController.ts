import { Request, Response, NextFunction } from "express";
import { Client, Invoice, Project } from "../models";
import { sendSuccess, buildPagination } from "../utils/response";
import { AppError } from "../middleware/errorHandler";
import { buildDependencyError } from "../utils/dependencies";
import { getOrgIdForUser } from "../utils/orgScope";

const getClientDependencySummary = async (orgId: unknown, clientId: string) => {
  const [projectCount, invoiceCount] = await Promise.all([
    Project.countDocuments({ orgId, clientId }),
    Invoice.countDocuments({ orgId, clientId }),
  ]);

  return buildDependencyError("client", [
    { label: "project", count: projectCount },
    { label: "invoice", count: invoiceCount },
  ]);
};

export const getClients = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgIdForUser(req.user!.id);
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;
    const search = req.query.search as string;

    const filter: Record<string, unknown> = { orgId };
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === "true";
    if (search) filter.name = { $regex: search, $options: "i" };

    const [clients, total] = await Promise.all([
      Client.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
      Client.countDocuments(filter),
    ]);

    sendSuccess(res, clients, 200, undefined, buildPagination(total, page, limit));
  } catch (err) { next(err); }
};

export const getClient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgIdForUser(req.user!.id);
    const client = await Client.findOne({ _id: req.params.id, orgId });
    if (!client) return next(new AppError("Client not found", 404));
    sendSuccess(res, client);
  } catch (err) { next(err); }
};

export const getClientDeleteImpact = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const orgId = await getOrgIdForUser(req.user!.id);
    const client = await Client.findOne({ _id: req.params.id, orgId });
    if (!client) return next(new AppError("Client not found", 404));

    const dependencyError = await getClientDependencySummary(orgId, req.params.id);
    sendSuccess(res, {
      blocked: dependencyError.details.length > 0,
      message: dependencyError.details.length
        ? dependencyError.message
        : `This client can be deleted safely.`,
      dependencies: dependencyError.details,
    });
  } catch (err) { next(err); }
};

export const createClient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgIdForUser(req.user!.id);
    const client = await Client.create({ ...req.body, orgId });
    sendSuccess(res, client, 201, "Client created");
  } catch (err) { next(err); }
};

export const updateClient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgIdForUser(req.user!.id);
    const client = await Client.findOneAndUpdate(
      { _id: req.params.id, orgId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!client) return next(new AppError("Client not found", 404));
    sendSuccess(res, client, 200, "Client updated");
  } catch (err) { next(err); }
};

export const deleteClient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgIdForUser(req.user!.id);
    const dependencyError = await getClientDependencySummary(orgId, req.params.id);

    if (dependencyError.details.length > 0) {
      return next(new AppError(dependencyError.message, 409, dependencyError.details));
    }

    const client = await Client.findOneAndDelete({ _id: req.params.id, orgId });
    if (!client) return next(new AppError("Client not found", 404));
    sendSuccess(res, null, 200, "Client deleted");
  } catch (err) { next(err); }
};
