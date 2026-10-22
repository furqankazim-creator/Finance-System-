import { Request, Response, NextFunction } from "express";
import { Expense, ExpenseCategory, Project } from "../models";
import { sendSuccess, buildPagination } from "../utils/response";
import { AppError } from "../middleware/errorHandler";
import { toCents } from "../utils/money";
import { assertBelongsToOrg, getOrgIdForUser } from "../utils/orgScope";

export const getExpenses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgIdForUser(req.user!.id);
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { orgId };
    if (req.query.categoryId) filter.categoryId = req.query.categoryId;
    if (req.query.projectId) filter.projectId = req.query.projectId;
    if (req.query.source) filter.source = req.query.source;

    // Date range filtering
    if (req.query.from || req.query.to) {
      const dateFilter: Record<string, Date> = {};
      if (req.query.from) dateFilter.$gte = new Date(req.query.from as string);
      if (req.query.to) dateFilter.$lte = new Date(req.query.to as string);
      filter.date = dateFilter;
    }

    const [expenses, total] = await Promise.all([
      Expense.find(filter)
        .populate("categoryId", "name color type")
        .populate("projectId", "name")
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit),
      Expense.countDocuments(filter),
    ]);

    sendSuccess(res, expenses, 200, undefined, buildPagination(total, page, limit));
  } catch (err) { next(err); }
};

export const getExpense = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgIdForUser(req.user!.id);
    const expense = await Expense.findOne({ _id: req.params.id, orgId })
      .populate("categoryId", "name color type")
      .populate("projectId", "name");
    if (!expense) return next(new AppError("Expense not found", 404));
    sendSuccess(res, expense);
  } catch (err) { next(err); }
};

export const createExpense = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgIdForUser(req.user!.id);
    await assertBelongsToOrg(ExpenseCategory, req.body.categoryId, orgId, "Category");
    if (req.body.projectId) {
      await assertBelongsToOrg(Project, req.body.projectId, orgId, "Project");
    }

    const body = { ...req.body, orgId, source: "manual" };
    // Accept amount in dollars from API, convert to cents
    if (body.amount !== undefined) {
      body.amountCents = toCents(body.amount);
      delete body.amount;
    }
    const expense = await Expense.create(body);
    const populated = await expense
      .populate("categoryId", "name color type")
      .then((item) => item.populate("projectId", "name"));
    sendSuccess(res, populated, 201, "Expense created");
  } catch (err) { next(err); }
};

export const updateExpense = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgIdForUser(req.user!.id);
    const existingExpense = await Expense.findOne({ _id: req.params.id, orgId });
    if (!existingExpense) {
      return next(new AppError("Expense not found", 404));
    }

    if (req.body.categoryId) {
      await assertBelongsToOrg(ExpenseCategory, req.body.categoryId, orgId, "Category");
    }
    if (req.body.projectId) {
      await assertBelongsToOrg(Project, req.body.projectId, orgId, "Project");
    }

    const body = { ...req.body };
    if (body.amount !== undefined) {
      body.amountCents = toCents(body.amount);
      delete body.amount;
    }
    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, orgId },
      body,
      { new: true, runValidators: true }
    )
      .populate("categoryId", "name color type")
      .populate("projectId", "name");
    sendSuccess(res, expense, 200, "Expense updated");
  } catch (err) { next(err); }
};

export const deleteExpense = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgIdForUser(req.user!.id);
    const expense = await Expense.findOneAndDelete({ _id: req.params.id, orgId });
    if (!expense) return next(new AppError("Expense not found", 404));
    sendSuccess(res, null, 200, "Expense deleted");
  } catch (err) { next(err); }
};
