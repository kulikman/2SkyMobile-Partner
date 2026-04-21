export type ImportedRow = {
  position: number;
  group_label: string;
  title: string;
  type: string;
  role: string;
  estimated_hours: number;
  /** 1-based row numbers this task depends on */
  depends_on_rows: number[];
};

export type ScheduledTask = ImportedRow & {
  start_date: string; // YYYY-MM-DD
  due_date: string;   // YYYY-MM-DD
};

/** Skip Sat/Sun when advancing dates. */
function addWorkingDays(from: Date, days: number): Date {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return d;
}

function toYMD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Parse Google Sheets CSV export into ImportedRow[].
 * Expected columns (header row detected automatically):
 *   Task / Deliverable | Type | Role | Hours | [Depends On]
 * Section-header rows (no Hours value) become group_label for following rows.
 */
export function parseDecompositionCsv(csv: string): ImportedRow[] {
  const lines = csv.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  // Detect and skip header row
  const firstLower = lines[0].toLowerCase();
  const startIdx = firstLower.includes('task') || firstLower.includes('deliverable') ? 1 : 0;

  const rows: ImportedRow[] = [];
  let currentGroup = '';
  let position = 0;

  for (let i = startIdx; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    if (cols.length < 2) continue;

    const title = cols[0]?.trim() ?? '';
    const type  = cols[1]?.trim() ?? '';
    const role  = cols[2]?.trim() ?? '';
    const hoursRaw = cols[3]?.trim() ?? '';
    const depRaw   = cols[4]?.trim() ?? '';

    if (!title) continue;

    const hours = parseFloat(hoursRaw.replace(/[^0-9.]/g, ''));

    // Rows without a valid hours value are section headers
    if (!hoursRaw || isNaN(hours)) {
      currentGroup = title;
      continue;
    }

    const depends_on_rows = depRaw
      ? depRaw.split(/[;,]/).map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n))
      : [];

    rows.push({
      position: position++,
      group_label: currentGroup,
      title,
      type,
      role,
      estimated_hours: hours,
      depends_on_rows,
    });
  }

  return rows;
}

/**
 * Assign start_date / due_date to each task based on:
 * - project start date
 * - 8 working hours per day
 * - depends_on_rows: task starts after the latest end of its dependencies
 */
export function scheduleTask(rows: ImportedRow[], projectStart: Date): ScheduledTask[] {
  const endDates: Date[] = new Array(rows.length);
  const startDates: Date[] = new Array(rows.length);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const days = Math.ceil(row.estimated_hours / 8);

    let start = new Date(projectStart);

    // Start after latest dependency end
    for (const depRow of row.depends_on_rows) {
      const depIdx = depRow - 1; // depends_on_rows is 1-based
      if (depIdx >= 0 && depIdx < i && endDates[depIdx]) {
        const depEnd = new Date(endDates[depIdx]);
        depEnd.setDate(depEnd.getDate() + 1); // next day after dep ends
        if (depEnd > start) start = depEnd;
      }
    }

    // Skip if start falls on weekend
    while (start.getDay() === 0 || start.getDay() === 6) {
      start.setDate(start.getDate() + 1);
    }

    const end = days > 0 ? addWorkingDays(start, days - 1) : new Date(start);
    startDates[i] = start;
    endDates[i] = end;
  }

  return rows.map((row, i) => ({
    ...row,
    start_date: toYMD(startDates[i]),
    due_date:   toYMD(endDates[i]),
  }));
}

/** Minimal CSV line splitter — handles quoted commas. */
function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}
