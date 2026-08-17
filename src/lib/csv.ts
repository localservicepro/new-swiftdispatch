/* CSV, the format the office already has. Whatever they keep customers in
   today — a spreadsheet, an old system's export — reaches us as CSV, and what
   we hand back opens in Excel without a conversion step.

   Deliberately handwritten rather than pulled from a library: the whole of
   RFC 4180 is a hundred lines, and a bad parser silently mangling a customer
   list is worse than no import at all. */

/* Quote only when the value would otherwise break the row, and double any
   quotes inside it — the same rule Excel writes by. */
const quote = (v: unknown): string => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  /* A BOM so Excel opens UTF-8 as UTF-8 rather than mangling anything past
     ASCII — "m³" and the like. CRLF for the same reason. */
  return "﻿" + [headers, ...rows].map((r) => r.map(quote).join(",")).join("\r\n") + "\r\n";
}

/* Returns the raw grid. Handles quoted fields containing commas, quotes and
   newlines, and tolerates both CRLF and LF. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let i = 0;

  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    /* A trailing newline should not add a phantom empty record. */
    if (row.length > 1 || row[0] !== "") rows.push(row);
    row = [];
  };

  while (i < src.length) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"' && field === "") {
      quoted = true;
      i++;
      continue;
    }
    if (ch === ",") {
      endField();
      i++;
      continue;
    }
    if (ch === "\r") {
      i++;
      continue;
    }
    if (ch === "\n") {
      endRow();
      i++;
      continue;
    }
    field += ch;
    i++;
  }
  if (field !== "" || row.length) endRow();
  return rows;
}

/* Header matching is forgiving: case, spaces, underscores and punctuation all
   ignored, so "Account No.", "account_no" and "ACCOUNT NO" are one column. */
export const normaliseHeader = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, "");

export interface CsvTable {
  headers: string[];
  rows: Record<string, string>[];
}

export function readCsvTable(text: string): CsvTable {
  const grid = parseCsv(text);
  if (!grid.length) return { headers: [], rows: [] };
  const headers = grid[0].map((h) => h.trim());
  const keys = headers.map(normaliseHeader);
  const rows = grid.slice(1).map((cells) => {
    const row: Record<string, string> = {};
    keys.forEach((k, i) => {
      if (k) row[k] = (cells[i] ?? "").trim();
    });
    return row;
  });
  /* Rows that are entirely blank are spreadsheet residue, not records. */
  return { headers, rows: rows.filter((r) => Object.values(r).some((v) => v !== "")) };
}

/* Money as other systems write it: "$60", "AU$80", "AU $145", "AUD 70",
   "AU70.00", "1,250.00" or a plain "225". The currency marker and separators
   come off, and whatever is left has to be a number — so "forty" is still
   rejected rather than quietly becoming zero. */
export function readMoney(v: string | null | undefined): number | null {
  const cleaned = String(v ?? "")
    .trim()
    .replace(/^(aud|usd|nzd|au|us|nz|a)?\s*\$\s*/i, "")
    .replace(/^(aud|usd|nzd|au|nz)\s*/i, "")
    .replace(/\s*(aud|usd|nzd)$/i, "")
    .replace(/[,\s]/g, "");
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function downloadCsv(filename: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  /* Revoking straight away can cancel the download in Safari. */
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
