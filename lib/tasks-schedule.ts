export type ImportedRow = {
  position: number;
  group_label: string;
  title: string;
  type: string;
  role: string;
  estimated_hours: number;
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

/** Convert "2 weeks", "3–4 weeks", "8–10 weeks" → hours (40h/week). */
function parseWeeksToHours(estimate: string): number {
  if (!estimate) return 0;
  const lower = estimate.toLowerCase().trim();
  if (lower === 'included' || lower === '') return 0;
  const rangeMatch = lower.match(/(\d+(?:\.\d+)?)\s*[–\-]\s*(\d+(?:\.\d+)?)\s*weeks?/);
  if (rangeMatch) {
    const avg = (parseFloat(rangeMatch[1]) + parseFloat(rangeMatch[2])) / 2;
    return Math.round(avg * 40);
  }
  const single = lower.match(/(\d+(?:\.\d+)?)\s*weeks?/);
  if (single) return Math.round(parseFloat(single[1]) * 40);
  // Fallback: bare number = hours
  const num = parseFloat(lower.replace(/[^0-9.]/g, ''));
  return isNaN(num) ? 0 : num;
}

/**
 * Parse the phase-based decomposition sheet:
 *   Phase | Module | Key Tasks | Deliverable | Estimate (Commercial)
 *
 * Phase numbering rules:
 *   - Top-level (0, 1, 2, …) with sub-rows (3.1, 4.2…) → group header only
 *   - Top-level without sub-rows (Discovery, Infra, Testing, Launch) → task
 *   - Sub-rows (3.1, 4.2…) → tasks under parent group
 */
export function parseDecompositionCsv(csv: string): ImportedRow[] {
  const lines = csv.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  // Skip header row if present
  const firstLower = lines[0].toLowerCase();
  const startIdx = (firstLower.includes('phase') || firstLower.includes('module') ||
    firstLower.includes('task') || firstLower.includes('deliverable')) ? 1 : 0;

  type RawRow = { phase: string; module: string; tasks: string; deliverable: string; estimate: string };
  const rawRows: RawRow[] = [];

  for (let i = startIdx; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const phase = cols[0]?.trim() ?? '';
    if (!phase) continue;
    // Skip summary/total rows (e.g. empty phase, or "~26–30 weeks")
    if (!phase.match(/^[\d.]+$/)) continue;
    rawRows.push({
      phase,
      module: cols[1]?.trim() ?? '',
      tasks: cols[2]?.trim() ?? '',
      deliverable: cols[3]?.trim() ?? '',
      estimate: cols[4]?.trim() ?? '',
    });
  }

  // Find which top-level phases have children
  const topWithChildren = new Set<string>();
  for (const r of rawRows) {
    if (r.phase.includes('.')) {
      topWithChildren.add(r.phase.split('.')[0]);
    }
  }

  // Collect parent estimates and child counts for hour distribution
  const parentHours = new Map<string, number>();
  const parentChildCount = new Map<string, number>();
  for (const r of rawRows) {
    if (!r.phase.includes('.') && topWithChildren.has(r.phase)) {
      parentHours.set(r.phase, parseWeeksToHours(r.estimate));
    }
    if (r.phase.includes('.')) {
      const parent = r.phase.split('.')[0];
      parentChildCount.set(parent, (parentChildCount.get(parent) ?? 0) + 1);
    }
  }

  const result: ImportedRow[] = [];
  const groupLabels = new Map<string, string>(); // phase number → group label
  let position = 0;

  // First pass: build group labels for top-level phases with children
  for (const r of rawRows) {
    if (!r.phase.includes('.') && topWithChildren.has(r.phase)) {
      groupLabels.set(r.phase, `Phase ${r.phase}: ${r.module}`);
    }
  }

  // Second pass: emit tasks
  for (const r of rawRows) {
    const isSubPhase = r.phase.includes('.');
    const parentPhase = isSubPhase ? r.phase.split('.')[0] : null;

    if (!isSubPhase && topWithChildren.has(r.phase)) {
      // Group header — no task emitted
      continue;
    }

    let hours: number;
    if (isSubPhase) {
      // Distribute parent estimate evenly across children
      const ph = parentHours.get(parentPhase!) ?? 0;
      const cc = parentChildCount.get(parentPhase!) ?? 1;
      hours = Math.round(ph / cc);
    } else {
      hours = parseWeeksToHours(r.estimate);
    }
    if (hours === 0) hours = 8; // minimum 1 day

    const group = isSubPhase
      ? (groupLabels.get(parentPhase!) ?? '')
      : '';

    // title: sub-task uses Key Tasks column, standalone uses Module
    const title = isSubPhase
      ? (r.tasks || r.module)
      : (r.module);

    result.push({
      position: position++,
      group_label: group,
      title,
      type: r.module,
      role: '',
      estimated_hours: hours,
      depends_on_rows: [],
    });
  }

  return result;
}

/**
 * Assign start_date / due_date to each task:
 * - 8 working hours per day
 * - depends_on_rows: starts after latest dependency ends
 */
export function scheduleTask(rows: ImportedRow[], projectStart: Date): ScheduledTask[] {
  const endDates: Date[] = new Array(rows.length);
  const startDates: Date[] = new Array(rows.length);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const days = Math.ceil(row.estimated_hours / 8);

    let start = new Date(projectStart);

    for (const depRow of row.depends_on_rows) {
      const depIdx = depRow - 1;
      if (depIdx >= 0 && depIdx < i && endDates[depIdx]) {
        const depEnd = new Date(endDates[depIdx]);
        depEnd.setDate(depEnd.getDate() + 1);
        if (depEnd > start) start = depEnd;
      }
    }

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
    due_date: toYMD(endDates[i]),
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
