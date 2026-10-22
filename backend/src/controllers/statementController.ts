import { Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import * as XLSX from "xlsx";
import { BankTransaction, BankAccount } from "../models";
import StatementFile from "../models/StatementFile";
import { sendSuccess } from "../utils/response";
import { AppError } from "../middleware/errorHandler";
import { getOrgIdForUser } from "../utils/orgScope";

const UPLOAD_ROOT = path.join(__dirname, "..", "..", "uploads", "statements");
const MAX_BYTES = 7 * 1024 * 1024;
const ALLOWED_EXT = [".xlsx", ".xls", ".csv", ".pdf", ".png", ".jpg", ".jpeg", ".webp"];

const decodeFile = (req: Request) => {
  const { fileName, dataBase64 } = req.body as { fileName?: string; dataBase64?: string };
  if (!fileName || !dataBase64) throw new AppError("File is required", 400);
  const ext = path.extname(fileName).toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) {
    throw new AppError(`Unsupported file type. Allowed: ${ALLOWED_EXT.join(", ")}`, 400);
  }
  const buffer = Buffer.from(dataBase64.replace(/^data:[^;]+;base64,/, ""), "base64");
  if (buffer.length === 0) throw new AppError("File is empty", 400);
  if (buffer.length > MAX_BYTES) throw new AppError("File is larger than 7 MB", 400);
  return { fileName, ext, buffer };
};

const toNumber = (v: unknown) => {
  if (typeof v === "number") return v;
  const n = parseFloat(String(v ?? "").replace(/[^0-9.\-]/g, ""));
  return n;
};

const toDate = (v: unknown): Date | null => {
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === "number" && v > 20000 && v < 80000) {
    // Excel serial date
    return new Date(Math.round((v - 25569) * 86400 * 1000));
  }
  const s = String(v ?? "").trim();
  if (!s) return null;
  // dd/mm/yyyy or dd-mm-yyyy
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    const d = new Date(Date.UTC(y, Number(m[2]) - 1, Number(m[1])));
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

interface ParsedRow {
  date: string;
  description: string;
  amount: number;
  direction: "inflow" | "outflow";
}

// rows: array of arrays (first row = header)
const rowsToTransactions = (rows: unknown[][]): ParsedRow[] => {
  const headerIdx = rows.findIndex(
    (r) => r.some((c) => /date/i.test(String(c))) && r.some((c) => /(amount|debit|credit|withdraw|deposit)/i.test(String(c)))
  );
  if (headerIdx < 0) return [];
  const header = rows[headerIdx].map((h) => String(h ?? "").toLowerCase());
  const find = (names: string[]) => header.findIndex((h) => names.some((n) => h.includes(n)));
  const dateI = find(["date"]);
  let descI = find(["description", "narration", "details", "particular", "memo", "remarks"]);
  const amountI = find(["amount"]);
  const debitI = find(["debit", "withdraw"]);
  const creditI = find(["credit", "deposit"]);
  if (descI < 0) descI = header.findIndex((_, i) => i !== dateI && i !== amountI && i !== debitI && i !== creditI);

  const out: ParsedRow[] = [];
  for (const r of rows.slice(headerIdx + 1)) {
    const date = toDate(r[dateI]);
    if (!date) continue;
    let amount = 0;
    let direction: "inflow" | "outflow" = "inflow";
    if (amountI >= 0 && Number.isFinite(toNumber(r[amountI])) && toNumber(r[amountI]) !== 0) {
      const n = toNumber(r[amountI]);
      amount = Math.abs(n);
      direction = n < 0 ? "outflow" : "inflow";
    } else {
      const debit = debitI >= 0 ? toNumber(r[debitI]) : NaN;
      const credit = creditI >= 0 ? toNumber(r[creditI]) : NaN;
      if (Number.isFinite(debit) && debit > 0) {
        amount = debit;
        direction = "outflow";
      } else if (Number.isFinite(credit) && credit > 0) {
        amount = credit;
        direction = "inflow";
      }
    }
    if (!amount) continue;
    out.push({
      date: date.toISOString().slice(0, 10),
      description: String(r[descI] ?? "").trim() || "Bank entry",
      amount,
      direction,
    });
  }
  return out;
};

// Best-effort parse of text-based PDF statements: "<date> <description> <amount>" per line
const pdfTextToTransactions = (text: string): ParsedRow[] => {
  const out: ParsedRow[] = [];
  const re = /^(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{4}-\d{2}-\d{2})\s+(.+?)\s+(-?\(?[\d,]+\.\d{2}\)?)\s*(CR|DR)?\s*(?:-?[\d,]+\.\d{2})?$/i;
  for (const line of text.split(/\r?\n/)) {
    const m = line.trim().match(re);
    if (!m) continue;
    const date = toDate(m[1]);
    if (!date) continue;
    const raw = m[3];
    const negative = raw.includes("-") || raw.includes("(") || (m[4] || "").toUpperCase() === "DR";
    const amount = Math.abs(toNumber(raw));
    if (!amount) continue;
    out.push({
      date: date.toISOString().slice(0, 10),
      description: m[2].trim(),
      amount,
      direction: negative ? "outflow" : "inflow",
    });
  }
  return out;
};

// Parse an uploaded file and return preview rows (nothing is saved)
export const parseStatementFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await getOrgIdForUser(req.user!.id);
    const { fileName, ext, buffer } = decodeFile(req);

    if ([".png", ".jpg", ".jpeg", ".webp"].includes(ext)) {
      return sendSuccess(res, {
        kind: "image",
        rows: [],
        message: "Images can't be read automatically. Save it as an attachment and add the entries manually.",
      });
    }

    let rows: ParsedRow[] = [];
    if (ext === ".pdf") {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const pdfParse = require("pdf-parse");
      const parsed = await pdfParse(buffer);
      rows = pdfTextToTransactions(parsed.text || "");
    } else {
      const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
      for (const sheetName of wb.SheetNames) {
        const sheet = wb.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: "" });
        rows = rowsToTransactions(data);
        if (rows.length) break;
      }
    }

    sendSuccess(res, {
      kind: ext.slice(1),
      fileName,
      rows: rows.slice(0, 1000),
      message: rows.length
        ? undefined
        : "No transactions detected. Make sure the file has date, description and amount (or debit/credit) columns.",
    });
  } catch (err) { next(err); }
};

// Export statement lines as Excel
export const exportBankTransactions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgIdForUser(req.user!.id);
    const filter: Record<string, unknown> = { orgId };
    if (req.query.bankAccountId) filter.bankAccountId = req.query.bankAccountId;
    if (req.query.status) filter.status = req.query.status;

    const txs = await BankTransaction.find(filter)
      .populate("bankAccountId", "bankName accountNumberMasked")
      .sort({ date: -1 });

    const data = txs.map((t: any) => ({
      Date: t.date.toISOString().slice(0, 10),
      Bank: t.bankAccountId?.bankName ?? "",
      Account: t.bankAccountId?.accountNumberMasked ?? "",
      Description: t.description,
      "Money in": t.direction === "inflow" ? t.amountCents / 100 : "",
      "Money out": t.direction === "outflow" ? t.amountCents / 100 : "",
      Status: t.status,
      Notes: t.notes ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [{ wch: 12 }, { wch: 16 }, { wch: 12 }, { wch: 40 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 30 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bank Statement");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="bank-statement.xlsx"');
    res.send(buf);
  } catch (err) { next(err); }
};

// ── Saved statement files (excel / pdf / image) ───────────────────────────────
const MIME: Record<string, string> = {
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls": "application/vnd.ms-excel",
  ".csv": "text/csv",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

export const uploadStatementFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgIdForUser(req.user!.id);
    const { fileName, ext, buffer } = decodeFile(req);

    let bankAccountId: unknown = null;
    if (req.body.bankAccountId) {
      const acc = await BankAccount.findOne({ _id: req.body.bankAccountId, orgId });
      if (!acc) return next(new AppError("Bank account not found", 404));
      bankAccountId = acc._id;
    }

    const dir = path.join(UPLOAD_ROOT, String(orgId));
    fs.mkdirSync(dir, { recursive: true });
    const storedName = `${crypto.randomBytes(12).toString("hex")}${ext}`;
    fs.writeFileSync(path.join(dir, storedName), buffer);

    const file = await StatementFile.create({
      orgId,
      bankAccountId,
      originalName: path.basename(fileName).slice(0, 255),
      mimeType: MIME[ext] || "application/octet-stream",
      sizeBytes: buffer.length,
      storedName,
      notes: req.body.notes || undefined,
    });
    sendSuccess(res, file, 201, "File saved");
  } catch (err) { next(err); }
};

export const getStatementFiles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgIdForUser(req.user!.id);
    const filter: Record<string, unknown> = { orgId };
    if (req.query.bankAccountId) filter.bankAccountId = req.query.bankAccountId;
    const files = await StatementFile.find(filter)
      .populate("bankAccountId", "bankName accountNumberMasked")
      .sort({ createdAt: -1 });
    sendSuccess(res, files);
  } catch (err) { next(err); }
};

export const downloadStatementFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgIdForUser(req.user!.id);
    const file = await StatementFile.findOne({ _id: req.params.id, orgId });
    if (!file) return next(new AppError("File not found", 404));
    const full = path.join(UPLOAD_ROOT, String(orgId), file.storedName);
    if (!fs.existsSync(full)) return next(new AppError("File is missing from storage", 404));
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(file.originalName)}"`);
    res.sendFile(full);
  } catch (err) { next(err); }
};

export const deleteStatementFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgIdForUser(req.user!.id);
    const file = await StatementFile.findOneAndDelete({ _id: req.params.id, orgId });
    if (!file) return next(new AppError("File not found", 404));
    fs.rmSync(path.join(UPLOAD_ROOT, String(orgId), file.storedName), { force: true });
    sendSuccess(res, null, 200, "File deleted");
  } catch (err) { next(err); }
};
