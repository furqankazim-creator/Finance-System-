import { Request, Response, NextFunction } from "express";
import { CostSettings, ProjectEstimate, Payroll, Transaction, Expense, Project, Organization } from "../models";
import { sendSuccess } from "../utils/response";
import { AppError } from "../middleware/errorHandler";
import { toCents } from "../utils/money";

const getOrgId = async (userId: string) => {
  const org = await Organization.findOne({ userId });
  if (!org) throw new AppError("Organization not found", 404);
  return org._id;
};

// Atomic upsert — avoids a find-then-create race if two requests for a brand-new
// org's settings land at the same time (e.g. the rate check and the estimate
// creation firing together on first page load).
const getOrCreateSettings = async (orgId: unknown) => {
  return CostSettings.findOneAndUpdate(
    { orgId },
    { $setOnInsert: { orgId } },
    { new: true, upsert: true }
  );
};

// perHourCostCents = (monthly org overhead + this month's payroll cost) / monthly capacity hours
const computeRate = async (orgId: unknown) => {
  const settings = await getOrCreateSettings(orgId);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const [monthlyPayroll, monthlyBookkeepingExpenses] = await Promise.all([
    Payroll.aggregate([
      { $match: { orgId, month: now.getMonth() + 1, year: now.getFullYear() } },
      { $group: { _id: null, total: { $sum: "$grossCents" } } },
    ]),
    // What's actually been logged in Daily Bookkeeping this month against expense
    // accounts (rent, utilities, etc) — shown as a reference so the manual
    // "monthly overhead" figure below can be reconciled against real entries
    // instead of drifting from what's actually being recorded.
    Transaction.aggregate([
      { $match: { orgId, type: "expense", date: { $gte: monthStart, $lte: monthEnd } } },
      { $group: { _id: null, total: { $sum: "$amountCents" } } },
    ]),
  ]);
  const monthlyPayrollCostCents = monthlyPayroll[0]?.total || 0;
  const recordedOverheadCents = monthlyBookkeepingExpenses[0]?.total || 0;

  const totalMonthlyCostCents = settings.monthlyOverheadCents + monthlyPayrollCostCents;
  const perHourCostCents = settings.monthlyCapacityHours > 0
    ? Math.round(totalMonthlyCostCents / settings.monthlyCapacityHours)
    : 0;

  // Where did this month's spend actually go, by project — answers "which
  // project consumed the hours/cost" right next to the rate it feeds into.
  const projectSpend = await Expense.aggregate([
    { $match: { orgId, date: { $gte: monthStart, $lte: monthEnd }, projectId: { $ne: null } } },
    { $group: { _id: "$projectId", totalCents: { $sum: "$amountCents" } } },
    { $sort: { totalCents: -1 } },
  ]);
  const unassignedSpend = await Expense.aggregate([
    { $match: { orgId, date: { $gte: monthStart, $lte: monthEnd }, projectId: null } },
    { $group: { _id: null, totalCents: { $sum: "$amountCents" } } },
  ]);
  const projects = await Project.find({ _id: { $in: projectSpend.map((p) => p._id) } });
  const projectNameMap = new Map(projects.map((p) => [p._id.toString(), p.name]));
  const costByProject = projectSpend.map((p) => ({
    projectName: projectNameMap.get(p._id.toString()) || "Unknown project",
    totalCents: p.totalCents,
  }));
  if (unassignedSpend[0]?.totalCents) {
    costByProject.push({ projectName: "Not tied to a project", totalCents: unassignedSpend[0].totalCents });
  }

  return { settings, monthlyPayrollCostCents, recordedOverheadCents, totalMonthlyCostCents, perHourCostCents, costByProject };
};

export const getSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgId(req.user!.id);
    const settings = await getOrCreateSettings(orgId);
    sendSuccess(res, settings);
  } catch (err) { next(err); }
};

export const updateSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgId(req.user!.id);
    const body: Record<string, unknown> = {};
    if (req.body.monthlyOverhead !== undefined) body.monthlyOverheadCents = toCents(req.body.monthlyOverhead);
    if (req.body.monthlyCapacityHours !== undefined) body.monthlyCapacityHours = req.body.monthlyCapacityHours;
    if (req.body.defaultProfitMarginPct !== undefined) body.defaultProfitMarginPct = req.body.defaultProfitMarginPct;

    const settings = await CostSettings.findOneAndUpdate(
      { orgId },
      { $set: body },
      { new: true, upsert: true, runValidators: true }
    );
    sendSuccess(res, settings, 200, "Costing settings updated");
  } catch (err) { next(err); }
};

export const getRate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgId(req.user!.id);
    const rate = await computeRate(orgId);
    sendSuccess(res, rate);
  } catch (err) { next(err); }
};

export const getEstimates = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgId(req.user!.id);
    const estimates = await ProjectEstimate.find({ orgId })
      .populate("clientId", "name")
      .populate("projectId", "name")
      .sort({ createdAt: -1 });
    sendSuccess(res, estimates);
  } catch (err) { next(err); }
};

export const createEstimate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgId(req.user!.id);
    const { title, estimatedManHours, profitMarginPct, clientId, projectId, notes } = req.body;
    if (!title || !estimatedManHours) throw new AppError("Title and estimated man hours are required", 400);

    const { perHourCostCents } = await computeRate(orgId);
    const settings = await getOrCreateSettings(orgId);
    const margin = profitMarginPct !== undefined ? Number(profitMarginPct) : settings.defaultProfitMarginPct;

    const baseCostCents = Math.round(Number(estimatedManHours) * perHourCostCents);
    const finalBidCostCents = Math.round(baseCostCents * (1 + margin / 100));

    const estimate = await ProjectEstimate.create({
      orgId,
      title,
      clientId: clientId || undefined,
      projectId: projectId || undefined,
      estimatedManHours,
      hourlyCostCentsUsed: perHourCostCents,
      baseCostCents,
      profitMarginPct: margin,
      finalBidCostCents,
      notes,
    });

    sendSuccess(res, estimate, 201, "Estimate created");
  } catch (err) { next(err); }
};

export const updateEstimate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgId(req.user!.id);
    const existing = await ProjectEstimate.findOne({ _id: req.params.id, orgId });
    if (!existing) return next(new AppError("Estimate not found", 404));

    const body = { ...req.body };
    const recalcNeeded = body.estimatedManHours !== undefined || body.profitMarginPct !== undefined;
    if (recalcNeeded) {
      const manHours = body.estimatedManHours !== undefined ? Number(body.estimatedManHours) : existing.estimatedManHours;
      const margin = body.profitMarginPct !== undefined ? Number(body.profitMarginPct) : existing.profitMarginPct;
      const baseCostCents = Math.round(manHours * existing.hourlyCostCentsUsed);
      body.baseCostCents = baseCostCents;
      body.finalBidCostCents = Math.round(baseCostCents * (1 + margin / 100));
    }

    const estimate = await ProjectEstimate.findOneAndUpdate(
      { _id: req.params.id, orgId },
      body,
      { new: true, runValidators: true }
    );
    sendSuccess(res, estimate, 200, "Estimate updated");
  } catch (err) { next(err); }
};

export const deleteEstimate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgId(req.user!.id);
    const estimate = await ProjectEstimate.findOneAndDelete({ _id: req.params.id, orgId });
    if (!estimate) return next(new AppError("Estimate not found", 404));
    sendSuccess(res, null, 200, "Estimate deleted");
  } catch (err) { next(err); }
};
