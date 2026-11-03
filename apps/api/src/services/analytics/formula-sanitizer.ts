/**
 * Formula Sanitizer Utility
 * Defends against OWASP CSV & Excel Formula Injection (CWE-1236).
 * Any cell value starting with '=', '+', '-', '@', '\t', or '\r' can trigger
 * formula execution in spreadsheet viewers. Prefix with a single quote "'"
 * to force the client to interpret the value as plain text.
 */
export class FormulaSanitizer {
  private static readonly FORMULA_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];

  static sanitizeCellValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    let stringVal = typeof value === 'string' ? value : JSON.stringify(value);

    // If string starts with any dangerous prefix (or whitespace then prefix), prepend a single quote
    const trimmed = stringVal.trimStart();
    if (this.FORMULA_PREFIXES.some((prefix) => stringVal.startsWith(prefix) || trimmed.startsWith(prefix))) {
      stringVal = `'${stringVal}`;
    }

    return stringVal;
  }

  static escapeCsvField(value: unknown): string {
    const sanitized = this.sanitizeCellValue(value);
    // Escape double quotes and enclose in quotes if contains comma, quote, or newline
    if (sanitized.includes('"') || sanitized.includes(',') || sanitized.includes('\n') || sanitized.includes('\r')) {
      return `"${sanitized.replace(/"/g, '""')}"`;
    }
    return sanitized;
  }
}
