import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'mission-control.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initDb();
  }
  return db;
}

function initDb() {
  if (!db) return;

  db.exec(`
    -- ── Core tasks ──────────────────────────────────────────────────────
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
      source TEXT DEFAULT 'monty',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- ── People ───────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS people (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'other' CHECK(role IN ('editor', 'fixer', 'producer', 'camera', 'other')),
      email TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      rate_per_day REAL DEFAULT 0,
      currency TEXT DEFAULT 'USD',
      location TEXT DEFAULT '',
      instagram TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- ── Series ───────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS series (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      location TEXT DEFAULT '',
      status TEXT DEFAULT 'ideation' CHECK(status IN ('ideation', 'pre_prod', 'shooting', 'post_prod', 'published', 'archived')),
      target_shoot_start TEXT,
      target_shoot_end TEXT,
      actual_shoot_start TEXT,
      actual_shoot_end TEXT,
      fixer_id INTEGER REFERENCES people(id),
      producer_id INTEGER REFERENCES people(id),
      camera_id INTEGER REFERENCES people(id),
      budget_target REAL DEFAULT 0,
      budget_actual REAL DEFAULT 0,
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- ── Episodes ─────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS episodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      series_id INTEGER REFERENCES series(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      stage TEXT DEFAULT 'idea' CHECK(stage IN ('idea', 'outlined', 'confirmed', 'filming', 'editing', 'review', 'published')),
      sort_order INTEGER DEFAULT 0,
      episode_type TEXT DEFAULT 'cornerstone',
      shoot_date TEXT,
      rough_cut_due TEXT,
      publish_date TEXT,
      actual_publish_date TEXT,
      editor_id INTEGER REFERENCES people(id),
      youtube_video_id TEXT DEFAULT '',
      youtube_url TEXT DEFAULT '',
      view_count INTEGER DEFAULT 0,
      view_count_updated_at TEXT,
      thumbnail_url TEXT DEFAULT '',
      thumbnail_concept TEXT DEFAULT '',
      hook TEXT DEFAULT '',
      outline TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- ── Milestones ───────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS milestones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      series_id INTEGER NOT NULL REFERENCES series(id) ON DELETE CASCADE,
      week_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      due_date TEXT,
      completed INTEGER DEFAULT 0,
      completed_at TEXT,
      notes TEXT DEFAULT ''
    );

    -- ── Travel ───────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS travel (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      series_id INTEGER NOT NULL REFERENCES series(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK(type IN ('flight', 'hotel', 'transport', 'permit', 'other')),
      title TEXT NOT NULL,
      details TEXT DEFAULT '',
      date_start TEXT,
      date_end TEXT,
      cost REAL DEFAULT 0,
      currency TEXT DEFAULT 'USD',
      booked INTEGER DEFAULT 0,
      confirmation_number TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- ── Sponsors (V2 enhanced) ────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS sponsors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      brand_name TEXT NOT NULL,

      deal_type TEXT DEFAULT 'flat_rate' CHECK(deal_type IN ('flat_rate', 'cpm', 'full_video')),
      deal_value_gross REAL DEFAULT 0,
      deal_value_net REAL DEFAULT 0,
      cpm_rate REAL,
      cpm_cap REAL,
      mvg INTEGER,

      stage TEXT DEFAULT 'leads' CHECK(stage IN (
        'leads', 'contracted', 'content', 'published', 'invoiced', 'paid'
      )),
      sub_status TEXT,

      contact_name TEXT DEFAULT '',
      contact_email TEXT DEFAULT '',
      agency_name TEXT DEFAULT '',
      agency_contact TEXT DEFAULT '',

      offer_date TEXT,
      contract_date TEXT,
      brief_due TEXT,
      brief_received_date TEXT,
      script_due TEXT,
      film_by TEXT,
      rough_cut_due TEXT,
      brand_review_due TEXT,
      live_date TEXT,
      invoice_date TEXT,
      payment_due_date TEXT,
      payment_received_date TEXT,

      payment_terms_brand_days INTEGER DEFAULT 30,
      payment_terms_agency_days INTEGER DEFAULT 15,
      invoice_amount REAL DEFAULT 0,

      placement TEXT DEFAULT 'first_5_min',
      integration_length_seconds INTEGER DEFAULT 60,
      brief_text TEXT DEFAULT '',
      brief_link TEXT DEFAULT '',
      script_draft TEXT DEFAULT '',
      script_status TEXT DEFAULT 'not_started' CHECK(script_status IN (
        'not_started', 'drafting', 'submitted', 'revision_1', 'revision_2', 'revision_3', 'approved'
      )),

      has_tracking_link INTEGER DEFAULT 0,
      has_pinned_comment INTEGER DEFAULT 0,
      has_qr_code INTEGER DEFAULT 0,
      tracking_link TEXT DEFAULT '',
      promo_code TEXT DEFAULT '',

      youtube_video_id TEXT DEFAULT '',
      youtube_video_title TEXT DEFAULT '',
      views_at_30_days INTEGER DEFAULT 0,

      cpm_screenshot_taken INTEGER DEFAULT 0,
      cpm_invoice_generated INTEGER DEFAULT 0,

      mvg_met INTEGER,
      make_good_required INTEGER DEFAULT 0,
      make_good_video_id TEXT DEFAULT '',

      exclusivity_window_days INTEGER DEFAULT 0,
      exclusivity_category TEXT DEFAULT '',

      requires_product INTEGER DEFAULT 0,
      product_ordered_date TEXT,
      product_ship_to TEXT DEFAULT '',
      product_received INTEGER DEFAULT 0,

      episode_id INTEGER REFERENCES episodes(id) ON DELETE SET NULL,

      notes TEXT DEFAULT '',
      next_action TEXT DEFAULT '',
      next_action_due TEXT,

      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- ── Media kit config ────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS media_kit_config (
      id INTEGER PRIMARY KEY DEFAULT 1,
      youtube_handle TEXT DEFAULT '@Andrew_Fraser',
      channel_name TEXT DEFAULT 'Andrew Fraser',
      subscriber_count INTEGER DEFAULT 190000,
      avg_views_per_video INTEGER DEFAULT 80000,
      avg_engagement_rate REAL DEFAULT 4.2,
      niche_description TEXT DEFAULT 'Extreme travel, street food & cultural documentaries from Southeast Asia and beyond.',
      content_pillars TEXT DEFAULT '["Extreme Food","Travel Documentaries","Street Culture","Adventure Vlogs"]',
      audience_age_range TEXT DEFAULT '18-34',
      audience_gender_split TEXT DEFAULT '{"male": 68, "female": 32}',
      audience_top_geos TEXT DEFAULT '["United States","United Kingdom","Australia","Canada","Vietnam"]',
      posting_frequency TEXT DEFAULT '2-3 videos/month',
      channel_url TEXT DEFAULT 'https://youtube.com/@Andrew_Fraser',
      instagram_handle TEXT DEFAULT '@andrewfraser',
      tiktok_handle TEXT DEFAULT '',
      contact_email TEXT DEFAULT 'andrew@fraser.vn',
      updated_at TEXT DEFAULT (datetime('now'))
    );

    INSERT OR IGNORE INTO media_kit_config (id) VALUES (1);
  `);

  migrateEpisodesSchema();
  migrateSponsorsSchema();
}

function migrateEpisodesSchema() {
  if (!db) return;
  const database = db;

  const columns = database.prepare("PRAGMA table_info(episodes)").all() as Array<{ name: string }>;
  const columnNames = new Set(columns.map(col => col.name));

  const addColumn = (name: string, definition: string) => {
    if (!columnNames.has(name)) {
      database.exec(`ALTER TABLE episodes ADD COLUMN ${name} ${definition}`);
    }
  };

  addColumn('youtube_video_id', "TEXT DEFAULT ''");
  addColumn('view_count', 'INTEGER DEFAULT 0');
  addColumn('view_count_updated_at', 'TEXT');
  addColumn('thumbnail_url', "TEXT DEFAULT ''");
}

function migrateSponsorsSchema() {
  if (!db) return;

  const table = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='sponsors'").get() as { sql?: string } | undefined;
  if (!table?.sql) return;

  const columns = db.prepare("PRAGMA table_info(sponsors)").all() as Array<{ name: string }>;
  const columnNames = new Set(columns.map(col => col.name));
  const hasSubStatus = columnNames.has('sub_status');
  const newStages = ['leads', 'contracted', 'content', 'published', 'invoiced', 'paid'];
  const hasNewStageCheck = newStages.every(stage => table.sql?.includes(`'${stage}'`));

  if (hasSubStatus && hasNewStageCheck) return;

  const stageCase = `
    CASE
      WHEN stage IN ('inquiry', 'negotiation') THEN 'leads'
      WHEN stage = 'contract' THEN 'contracted'
      WHEN stage IN ('brief_received', 'script_writing', 'script_submitted', 'script_approved', 'filming', 'brand_review') THEN 'content'
      WHEN stage = 'live' THEN 'published'
      WHEN stage IN ('invoiced', 'paid', 'leads', 'contracted', 'content', 'published') THEN stage
      ELSE stage
    END
  `;

  const subStatusCase = `
    CASE
      WHEN stage IN ('inquiry', 'negotiation') THEN stage
      WHEN stage IN ('brief_received', 'script_writing', 'script_submitted', 'script_approved', 'filming', 'brand_review') THEN stage
      WHEN stage = 'content' THEN ${hasSubStatus ? 'sub_status' : 'NULL'}
      WHEN stage = 'leads' THEN ${hasSubStatus ? 'sub_status' : 'NULL'}
      ELSE NULL
    END
  `;

  db.exec('BEGIN');
  try {
    db.exec(`
      CREATE TABLE sponsors_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        brand_name TEXT NOT NULL,

        deal_type TEXT DEFAULT 'flat_rate' CHECK(deal_type IN ('flat_rate', 'cpm', 'full_video')),
        deal_value_gross REAL DEFAULT 0,
        deal_value_net REAL DEFAULT 0,
        cpm_rate REAL,
        cpm_cap REAL,
        mvg INTEGER,

        stage TEXT DEFAULT 'leads' CHECK(stage IN (
          'leads', 'contracted', 'content', 'published', 'invoiced', 'paid'
        )),
        sub_status TEXT,

        contact_name TEXT DEFAULT '',
        contact_email TEXT DEFAULT '',
        agency_name TEXT DEFAULT '',
        agency_contact TEXT DEFAULT '',

        offer_date TEXT,
        contract_date TEXT,
        brief_due TEXT,
        brief_received_date TEXT,
        script_due TEXT,
        film_by TEXT,
        rough_cut_due TEXT,
        brand_review_due TEXT,
        live_date TEXT,
        invoice_date TEXT,
        payment_due_date TEXT,
        payment_received_date TEXT,

        payment_terms_brand_days INTEGER DEFAULT 30,
        payment_terms_agency_days INTEGER DEFAULT 15,
        invoice_amount REAL DEFAULT 0,

        placement TEXT DEFAULT 'first_5_min',
        integration_length_seconds INTEGER DEFAULT 60,
        brief_text TEXT DEFAULT '',
        brief_link TEXT DEFAULT '',
        script_draft TEXT DEFAULT '',
        script_status TEXT DEFAULT 'not_started' CHECK(script_status IN (
          'not_started', 'drafting', 'submitted', 'revision_1', 'revision_2', 'revision_3', 'approved'
        )),

        has_tracking_link INTEGER DEFAULT 0,
        has_pinned_comment INTEGER DEFAULT 0,
        has_qr_code INTEGER DEFAULT 0,
        tracking_link TEXT DEFAULT '',
        promo_code TEXT DEFAULT '',

        youtube_video_id TEXT DEFAULT '',
        youtube_video_title TEXT DEFAULT '',
        views_at_30_days INTEGER DEFAULT 0,

        cpm_screenshot_taken INTEGER DEFAULT 0,
        cpm_invoice_generated INTEGER DEFAULT 0,

        mvg_met INTEGER,
        make_good_required INTEGER DEFAULT 0,
        make_good_video_id TEXT DEFAULT '',

        exclusivity_window_days INTEGER DEFAULT 0,
        exclusivity_category TEXT DEFAULT '',

        requires_product INTEGER DEFAULT 0,
        product_ordered_date TEXT,
        product_ship_to TEXT DEFAULT '',
        product_received INTEGER DEFAULT 0,

        episode_id INTEGER REFERENCES episodes(id) ON DELETE SET NULL,

        notes TEXT DEFAULT '',
        next_action TEXT DEFAULT '',
        next_action_due TEXT,

        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);

    const existingColumns = Array.from(columnNames);
    const baseColumns = existingColumns.filter(col => col !== 'stage' && col !== 'sub_status');
    const selectColumns = baseColumns.map(col => `"${col}"`);
    selectColumns.unshift(stageCase.trim());
    selectColumns.splice(1, 0, subStatusCase.trim());
    const insertColumns = ['stage', 'sub_status', ...baseColumns].map(col => `"${col}"`);

    db.prepare(`
      INSERT INTO sponsors_new (${insertColumns.join(', ')})
      SELECT ${selectColumns.join(', ')} FROM sponsors
    `).run();

    db.exec('DROP TABLE sponsors');
    db.exec('ALTER TABLE sponsors_new RENAME TO sponsors');
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

// ── Migration helpers ──────────────────────────────────────────────────────

export function generateMilestones(seriesId: number, shootStart: string) {
  const database = getDb();
  const shoot = new Date(shootStart);

  const milestoneTemplates = [
    { week: -5, title: 'Ideation: Generate 10–20 ideas' },
    { week: -5, title: 'Fixer Search: Interview candidates' },
    { week: -4, title: 'Lock Episodes (90% confirmed)' },
    { week: -4, title: 'Thumbnail Concepts Ready' },
    { week: -3, title: 'All Locations Confirmed' },
    { week: -3, title: 'Photo/Video Proof from Fixer' },
    { week: -2, title: 'Book Flights & Hotels' },
    { week: -2, title: 'Daily Fixer Comms Established' },
    { week: -1, title: 'Packing Checklist Complete' },
    { week: -1, title: 'Final Confirmation Call' },
  ];

  const insert = database.prepare(
    'INSERT INTO milestones (series_id, week_number, title, due_date) VALUES (?, ?, ?, ?)'
  );

  const insertMany = database.transaction((items: typeof milestoneTemplates) => {
    for (const item of items) {
      const dueDate = new Date(shoot);
      dueDate.setDate(dueDate.getDate() + item.week * 7);
      insert.run(seriesId, item.week, item.title, dueDate.toISOString().split('T')[0]);
    }
  });

  insertMany(milestoneTemplates);
}

// ── Task helpers ───────────────────────────────────────────────────────────

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
  source: string | null;
  created_at: string;
}

export function getAllTasks(): Task[] {
  const database = getDb();
  return database.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all() as Task[];
}

export function createTask(data: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'completed_at'>): Task {
  const database = getDb();
  const result = database.prepare(
    'INSERT INTO tasks (title, description, stage, project, priority) VALUES (?, ?, ?, ?, ?)'
  ).run(data.title, data.description, data.stage, data.project, data.priority);

  const taskId = result.lastInsertRowid as number;

  database.prepare('INSERT INTO activity_log (action, task_id, details) VALUES (?, ?, ?)')
    .run('created', taskId, `Created: ${data.title}`);

  return database.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as Task;
}

export function updateTask(id: number, data: Partial<Task>): Task | null {
  const database = getDb();
  const old = database.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task | undefined;
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
      database.prepare('INSERT INTO activity_log (action, task_id, details) VALUES (?, ?, ?)')
        .run('completed', id, `Completed: ${old.title}`);
    } else if (stage === 'in_progress' && old.stage === 'backlog') {
      database.prepare('INSERT INTO activity_log (action, task_id, details) VALUES (?, ?, ?)')
        .run('moved', id, `Started: ${old.title}`);
    } else {
      database.prepare('INSERT INTO activity_log (action, task_id, details) VALUES (?, ?, ?)')
        .run('moved', id, `Moved: ${old.title} → ${stage}`);
    }
    if (stage !== 'done') completed_at = null;
  }

  database.prepare(
    'UPDATE tasks SET title=?, description=?, stage=?, project=?, priority=?, updated_at=?, completed_at=? WHERE id=?'
  ).run(title, description, stage, project, priority, new Date().toISOString(), completed_at, id);

  return database.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task;
}

export function getStats() {
  const database = getDb();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const thisWeek = (database.prepare('SELECT COUNT(*) as count FROM tasks WHERE created_at >= ?').get(weekAgo) as { count: number }).count;
  const inProgress = (database.prepare("SELECT COUNT(*) as count FROM tasks WHERE stage='in_progress'").get() as { count: number }).count;
  const total = (database.prepare('SELECT COUNT(*) as count FROM tasks').get() as { count: number }).count;
  const done = (database.prepare("SELECT COUNT(*) as count FROM tasks WHERE stage='done'").get() as { count: number }).count;

  return {
    thisWeek,
    inProgress,
    total,
    completion: total ? Math.round(done / total * 100) : 0,
  };
}

export function getActivity(): Activity[] {
  const database = getDb();
  return database.prepare('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 20').all() as Activity[];
}

// ── Media kit helpers ────────────────────────────────────────────────────

export interface MediaKitConfig {
  id: number;
  youtube_handle: string;
  channel_name: string;
  subscriber_count: number;
  avg_views_per_video: number;
  avg_engagement_rate: number;
  niche_description: string;
  content_pillars: string;
  audience_age_range: string;
  audience_gender_split: string;
  audience_top_geos: string;
  posting_frequency: string;
  channel_url: string;
  instagram_handle: string;
  tiktok_handle: string;
  contact_email: string;
  updated_at: string;
}

export interface MediaKitStats {
  total_sponsors: number;
  total_revenue: number;
  avg_deal_value: number;
  top_brands: string[];
}

export function getMediaKitConfig(): MediaKitConfig {
  const database = getDb();
  const row = database.prepare('SELECT * FROM media_kit_config WHERE id = 1').get() as MediaKitConfig | undefined;
  if (row) return row;
  database.prepare('INSERT OR IGNORE INTO media_kit_config (id) VALUES (1)').run();
  return database.prepare('SELECT * FROM media_kit_config WHERE id = 1').get() as MediaKitConfig;
}

export function updateMediaKitConfig(data: Partial<MediaKitConfig>): MediaKitConfig {
  const database = getDb();
  const fields = [
    'youtube_handle', 'channel_name', 'subscriber_count', 'avg_views_per_video',
    'avg_engagement_rate', 'niche_description', 'content_pillars', 'audience_age_range',
    'audience_gender_split', 'audience_top_geos', 'posting_frequency', 'channel_url',
    'instagram_handle', 'tiktok_handle', 'contact_email',
  ];
  const updates: string[] = [];
  const values: unknown[] = [];

  for (const field of fields) {
    if (field in data) {
      updates.push(`${field} = ?`);
      values.push((data as Record<string, unknown>)[field]);
    }
  }

  if (!updates.length) return getMediaKitConfig();

  updates.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(1);

  database.prepare(`UPDATE media_kit_config SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  return getMediaKitConfig();
}

export function getMediaKitStats(): MediaKitStats {
  const database = getDb();
  const summary = database.prepare(`
    SELECT
      COUNT(*) as count,
      COALESCE(SUM(deal_value_gross), 0) as total
    FROM sponsors
    WHERE stage = 'published'
  `).get() as { count: number; total: number };

  const top = database.prepare(`
    SELECT brand_name
    FROM sponsors
    WHERE stage = 'published' AND brand_name != ''
    ORDER BY deal_value_gross DESC
    LIMIT 12
  `).all() as Array<{ brand_name: string }>;

  const totalSponsors = summary?.count || 0;
  const totalRevenue = summary?.total || 0;
  const avgDealValue = totalSponsors ? totalRevenue / totalSponsors : 0;

  return {
    total_sponsors: totalSponsors,
    total_revenue: totalRevenue,
    avg_deal_value: avgDealValue,
    top_brands: top.map(row => row.brand_name),
  };
}
