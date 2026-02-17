import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'mission-control.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initDb();
  }
  return db;
}

function initDb() {
  if (!db) return;
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      stage TEXT DEFAULT 'backlog' CHECK(stage IN ('backlog','in_progress','review','done')),
      project TEXT,
      priority TEXT DEFAULT 'normal' CHECK(priority IN ('low','normal','high','urgent')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      task_id INTEGER,
      details TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  stage: 'backlog' | 'in_progress' | 'review' | 'done';
  project: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface Activity {
  id: number;
  action: string;
  task_id: number | null;
  details: string | null;
  created_at: string;
}

export function getAllTasks(): Task[] {
  const db = getDb();
  return db.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all() as Task[];
}

export function createTask(data: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'completed_at'>): Task {
  const db = getDb();
  const result = db.prepare(
    'INSERT INTO tasks (title, description, stage, project, priority) VALUES (?, ?, ?, ?, ?)'
  ).run(data.title, data.description, data.stage, data.project, data.priority);
  
  const taskId = result.lastInsertRowid as number;
  
  db.prepare('INSERT INTO activity_log (action, task_id, details) VALUES (?, ?, ?)')
    .run('created', taskId, `Created: ${data.title}`);
  
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as Task;
}

export function updateTask(id: number, data: Partial<Task>): Task | null {
  const db = getDb();
  const old = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task | undefined;
  if (!old) return null;
  
  const stage = data.stage ?? old.stage;
  const title = data.title ?? old.title;
  const description = data.description ?? old.description;
  const project = data.project ?? old.project;
  const priority = data.priority ?? old.priority;
  let completed_at = old.completed_at;
  
  if (stage !== old.stage) {
    if (stage === 'done') {
      completed_at = new Date().toISOString();
      db.prepare('INSERT INTO activity_log (action, task_id, details) VALUES (?, ?, ?)')
        .run('completed', id, `Completed: ${old.title}`);
    } else if (stage === 'in_progress' && old.stage === 'backlog') {
      db.prepare('INSERT INTO activity_log (action, task_id, details) VALUES (?, ?, ?)')
        .run('moved', id, `Started: ${old.title}`);
    } else {
      db.prepare('INSERT INTO activity_log (action, task_id, details) VALUES (?, ?, ?)')
        .run('moved', id, `Moved: ${old.title} → ${stage}`);
    }
    if (stage !== 'done') {
      completed_at = null;
    }
  }
  
  db.prepare(
    'UPDATE tasks SET title=?, description=?, stage=?, project=?, priority=?, updated_at=?, completed_at=? WHERE id=?'
  ).run(title, description, stage, project, priority, new Date().toISOString(), completed_at, id);
  
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task;
}

export function getStats() {
  const db = getDb();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  
  const thisWeek = (db.prepare('SELECT COUNT(*) as count FROM tasks WHERE created_at >= ?').get(weekAgo) as { count: number }).count;
  const inProgress = (db.prepare("SELECT COUNT(*) as count FROM tasks WHERE stage='in_progress'").get() as { count: number }).count;
  const total = (db.prepare('SELECT COUNT(*) as count FROM tasks').get() as { count: number }).count;
  const done = (db.prepare("SELECT COUNT(*) as count FROM tasks WHERE stage='done'").get() as { count: number }).count;
  
  return {
    thisWeek,
    inProgress,
    total,
    completion: total ? Math.round(done / total * 100) : 0
  };
}

export function getActivity(): Activity[] {
  const db = getDb();
  return db.prepare('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 20').all() as Activity[];
}
