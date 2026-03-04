export function getCompaniesHouseApiKey(): string | null {
  const raw = process.env.COMPANIES_HOUSE_API_KEY;
  if (!raw) return null;

  // Normalize common copy/paste mistakes from dashboard env fields.
  let key = raw.trim();

  // Handle values wrapped in single or double quotes.
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }

  // Handle escaped newline sequences and actual newlines.
  key = key.replace(/\\n/g, '').replace(/\r?\n/g, '').trim();

  return key || null;
}
