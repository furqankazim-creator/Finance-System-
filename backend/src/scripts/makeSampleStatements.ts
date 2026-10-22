import * as XLSX from "xlsx";
import path from "path";
import fs from "fs";

// Creates sample statement files you can upload on the Bank Statement page.
const outDir = path.join(__dirname, "..", "..", "sample-statements");
fs.mkdirSync(outDir, { recursive: true });

const d = (daysAgo: number) => {
  const x = new Date();
  x.setDate(x.getDate() - daysAgo);
  return x.toISOString().slice(0, 10);
};

const rows = [
  { Date: d(25), Description: "Client payment - Acme Corp", Debit: "", Credit: 250000 },
  { Date: d(23), Description: "Office rent - October", Debit: 120000, Credit: "" },
  { Date: d(20), Description: "AWS monthly bill", Debit: 48000, Credit: "" },
  { Date: d(17), Description: "Client payment - Global Tech", Debit: "", Credit: 180000 },
  { Date: d(14), Description: "Google Ads", Debit: 35000, Credit: "" },
  { Date: d(10), Description: "Salary disbursement", Debit: 760000, Credit: "" },
  { Date: d(6), Description: "Client payment - Nova Retail", Debit: "", Credit: 320000 },
  { Date: d(3), Description: "Internet & utilities", Debit: 24500, Credit: "" },
];
const ws = XLSX.utils.json_to_sheet(rows);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Statement");
XLSX.writeFile(wb, path.join(outDir, "sample-bank-statement.xlsx"));

const csv = "date,description,amount\n" + rows.map((r) => `${r.Date},"${r.Description}",${r.Credit !== "" ? r.Credit : -Number(r.Debit)}`).join("\n");
fs.writeFileSync(path.join(outDir, "sample-bank-statement.csv"), csv);
console.log("Sample files written to", outDir);

