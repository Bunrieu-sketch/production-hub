import { getDb } from '@/lib/db';

export type HealthStatus = 'healthy' | 'warning' | 'critical';

export interface HealthArea {
  id: string;
  name: string;
  icon: string;
  status: HealthStatus;
  summary: string;
  details: string[];
  agent: string;
  model: string;
}

export interface HealthRecommendation {
  number: number;
  severity: 'warning' | 'critical';
  text: string;
}

export interface CouncilMember {
  role: string;
  model: string;
}

export interface HealthCouncilReport {
  date: string;
  overall_score: number;
  areas: HealthArea[];
  recommendations: HealthRecommendation[];
  council: {
    moderator: string;
    members: CouncilMember[];
  };
}

function ensureHealthCouncilTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS health_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      overall_score INTEGER NOT NULL,
      report_json TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  return db;
}

export function saveHealthReport(report: HealthCouncilReport) {
  const db = ensureHealthCouncilTable();
  const payload = JSON.stringify(report);
  db.prepare(`
    INSERT INTO health_reports (date, overall_score, report_json)
    VALUES (?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET
      overall_score = excluded.overall_score,
      report_json = excluded.report_json
  `).run(report.date, report.overall_score, payload);

  const row = db.prepare('SELECT id FROM health_reports WHERE date = ?').get(report.date) as { id: number } | undefined;
  return row?.id ?? 0;
}

export function getLatestHealthReport() {
  const db = ensureHealthCouncilTable();
  const latest = db.prepare(`
    SELECT date, overall_score, report_json
    FROM health_reports
    ORDER BY date DESC
    LIMIT 1
  `).get() as { report_json: string; overall_score: number } | undefined;

  if (!latest) return null;

  const previous = db.prepare(`
    SELECT overall_score
    FROM health_reports
    ORDER BY date DESC
    LIMIT 1 OFFSET 1
  `).get() as { overall_score: number } | undefined;

  return {
    report: JSON.parse(latest.report_json) as HealthCouncilReport,
    previousScore: previous ? previous.overall_score : null,
  };
}

export function getHealthHistory(days: number) {
  const db = ensureHealthCouncilTable();
  const limit = Math.max(1, Math.min(days || 7, 30));
  const rows = db.prepare(`
    SELECT date, overall_score
    FROM health_reports
    ORDER BY date DESC
    LIMIT ?
  `).all(limit) as Array<{ date: string; overall_score: number }>;

  return rows.reverse();
}
