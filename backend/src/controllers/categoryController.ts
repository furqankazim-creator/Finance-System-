import { Request, Response, NextFunction } from "express";
import { Expense, ExpenseCategory } from "../models";
import { sendSuccess } from "../utils/response";
import { AppError } from "../middleware/errorHandler";
import { buildDependencyError } from "../utils/dependencies";
import { assertBelongsToOrg, getOrgIdForUser } from "../utils/orgScope";

const getCategoryDependencySummary = async (orgId: unknown, categoryId: string) => {
  const [expenseCount, childCategoryCount] = await Promise.all([
    Expense.countDocuments({ orgId, categoryId }),
    ExpenseCategory.countDocuments({ orgId, parentCategoryId: categoryId }),
  ]);

  return buildDependencyError("category", [
    { label: "expense", count: expenseCount },
    { label: "child category", count: childCategoryCount },
  ]);
};

export const getCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgIdForUser(req.user!.id);
    const filter: Record<string, unknown> = { orgId };
    if (req.query.type) filter.type = req.query.type;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === "true";
    
    const categories = await ExpenseCategory.find(filter).sort({ name: 1 });
    sendSuccess(res, categories);
  } catch (err) { next(err); }
};

export const getCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgIdForUser(req.user!.id);
    const category = await ExpenseCategory.findOne({ _id: req.params.id, orgId });
    if (!category) return next(new AppError("Category not found", 404));
    sendSuccess(res, category);
  } catch (err) { next(err); }
};

export const getCategoryDeleteImpact = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const orgId = await getOrgIdForUser(req.user!.id);
    const category = await ExpenseCategory.findOne({ _id: req.params.id, orgId });
    if (!category) return next(new AppError("Category not found", 404));

    const dependencyError = await getCategoryDependencySummary(orgId, req.params.id);
    sendSuccess(res, {
      blocked: dependencyError.details.length > 0,
      message: dependencyError.details.length
        ? dependencyError.message
        : "This category can be deleted safely.",
      dependencies: dependencyError.details,
    });
  } catch (err) { next(err); }
};

export const createCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgIdForUser(req.user!.id);
    if (req.body.parentCategoryId) {
      await assertBelongsToOrg(
        ExpenseCategory,
        req.body.parentCategoryId,
        orgId,
        "Parent category"
      );
    }
    const category = await ExpenseCategory.create({ ...req.body, orgId });
    sendSuccess(res, category, 201, "Category created");
  } catch (err) { next(err); }
};

export const updateCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgIdForUser(req.user!.id);
    if (req.body.parentCategoryId) {
      if (req.body.parentCategoryId === req.params.id) {
        return next(new AppError("A category cannot be its own parent", 400));
      }

      await assertBelongsToOrg(
        ExpenseCategory,
        req.body.parentCategoryId,
        orgId,
        "Parent category"
      );
    }

    const category = await ExpenseCategory.findOneAndUpdate(
      { _id: req.params.id, orgId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!category) return next(new AppError("Category not found", 404));
    sendSuccess(res, category, 200, "Category updated");
  } catch (err) { next(err); }
};

export const deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgIdForUser(req.user!.id);
    const dependencyError = await getCategoryDependencySummary(orgId, req.params.id);

    if (dependencyError.details.length > 0) {
      return next(new AppError(dependencyError.message, 409, dependencyError.details));
    }

    const category = await ExpenseCategory.findOneAndDelete({ _id: req.params.id, orgId });
    if (!category) return next(new AppError("Category not found", 404));
    sendSuccess(res, null, 200, "Category deleted");
  } catch (err) { next(err); }
};
