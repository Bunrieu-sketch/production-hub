import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'production-hub.db');

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
      country TEXT DEFAULT '',
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
      like_count INTEGER DEFAULT 0,
      comment_count INTEGER DEFAULT 0,
      description TEXT DEFAULT '',
      duration_seconds INTEGER DEFAULT 0,
      scraped_at TEXT,
      view_count_updated_at TEXT,
      thumbnail_url TEXT DEFAULT '',
      script_url TEXT DEFAULT '',
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
      sponsor_source TEXT DEFAULT 'manual' CHECK(sponsor_source IN ('manual', 'description', 'pinned_comment')),
      detected_text TEXT DEFAULT '',

      notes TEXT DEFAULT '',
      next_action TEXT DEFAULT '',
      next_action_due TEXT,

      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- ── Episode Phases ───────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS episode_phases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      episode_id INTEGER NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
      phase TEXT NOT NULL CHECK(phase IN ('preprod', 'shoot', 'post', 'publish')),
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      status TEXT DEFAULT 'planned' CHECK(status IN ('planned', 'in_progress', 'done')),
      confidence REAL DEFAULT 1.0,
      source TEXT DEFAULT 'manual' CHECK(source IN ('manual', 'inferred', 'youtube')),
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(episode_id, phase)
    );

    -- ── YouTube Analytics cache ───────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS youtube_analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fetched_at TEXT DEFAULT (datetime('now')),

      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,

      channel_id TEXT NOT NULL,
      channel_title TEXT DEFAULT '',

      subscribers INTEGER DEFAULT 0,
      views INTEGER DEFAULT 0,
      watch_time_hours REAL DEFAULT 0,
      estimated_revenue REAL DEFAULT 0,

      -- JSON blobs stored as TEXT
      top_videos TEXT DEFAULT '[]',
      traffic_sources TEXT DEFAULT '{}',
      demographics TEXT DEFAULT '{}',

      realtime_subscribers INTEGER DEFAULT 0,
      realtime_views_48h INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_youtube_analytics_fetched_at ON youtube_analytics(fetched_at);
    CREATE INDEX IF NOT EXISTS idx_youtube_analytics_channel_id ON youtube_analytics(channel_id);

    -- ── Hiring ───────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS job_positions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      role_type TEXT DEFAULT 'producer' CHECK(role_type IN ('producer', 'editor', 'fixer', 'camera', 'other')),
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'paused', 'filled', 'cancelled')),
      description TEXT DEFAULT '',
      requirements TEXT DEFAULT '',
      rate_range TEXT DEFAULT '',
      location_preference TEXT DEFAULT '',
      job_board_urls TEXT DEFAULT '',
      trial_task_doc_url TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS applicants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      position_id INTEGER NOT NULL REFERENCES job_positions(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      email TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      source TEXT DEFAULT '' CHECK(source IN ('onlinejobs_ph', 'vietnamworks', 'referral', 'direct', 'other', '')),
      portfolio_url TEXT DEFAULT '',
      resume_url TEXT DEFAULT '',
      stage TEXT DEFAULT 'applied' CHECK(stage IN ('applied', 'contacted', 'trial_sent', 'evaluation', 'interview', 'hired', 'rejected')),
      screening_score INTEGER DEFAULT 0,
      screening_notes TEXT DEFAULT '',
      interview_date TEXT,
      interview_notes TEXT DEFAULT '',
      trial_task_sent_at TEXT,
      trial_task_received_at TEXT,
      trial_task_score INTEGER DEFAULT 0,
      trial_task_notes TEXT DEFAULT '',
      probation_start TEXT,
      probation_30_day TEXT,
      probation_60_day TEXT,
      probation_90_day TEXT,
      probation_notes TEXT DEFAULT '',
      overall_rating INTEGER DEFAULT 0,
      communication_rating INTEGER DEFAULT 0,
      attitude_rating INTEGER DEFAULT 0,
      motivation_rating INTEGER DEFAULT 0,
      rejection_reason TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- ── Mission Control ────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS mc_agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      codename TEXT,
      role TEXT NOT NULL,
      role_type TEXT DEFAULT 'SPC' CHECK(role_type IN ('LEAD', 'INT', 'SPC')),
      status TEXT DEFAULT 'idle' CHECK(status IN ('idle', 'working', 'blocked', 'offline')),
      current_task_id INTEGER,
      session_key TEXT,
      avatar_color TEXT DEFAULT '#10b981',
      avatar_icon TEXT DEFAULT 'bot',
      last_heartbeat TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS mc_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'inbox' CHECK(status IN ('inbox', 'assigned', 'in_progress', 'review', 'done')),
      priority TEXT DEFAULT 'normal' CHECK(priority IN ('low', 'normal', 'high', 'urgent')),
      assignee_ids TEXT DEFAULT '[]',
      tags TEXT DEFAULT '[]',
      created_by TEXT REFERENCES mc_agents(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS mc_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER REFERENCES mc_tasks(id),
      from_agent_id TEXT REFERENCES mc_agents(id),
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS mc_activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      agent_id TEXT REFERENCES mc_agents(id),
      message TEXT NOT NULL,
      task_id INTEGER REFERENCES mc_tasks(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS mc_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT,
      type TEXT DEFAULT 'deliverable' CHECK(type IN ('deliverable', 'research', 'protocol', 'brief', 'other')),
      task_id INTEGER REFERENCES mc_tasks(id),
      agent_id TEXT REFERENCES mc_agents(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS mc_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mentioned_agent_id TEXT REFERENCES mc_agents(id),
      content TEXT NOT NULL,
      delivered INTEGER DEFAULT 0,
      task_id INTEGER REFERENCES mc_tasks(id),
      from_agent_id TEXT REFERENCES mc_agents(id),
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  const seedAgent = db.prepare(`
    INSERT OR IGNORE INTO mc_agents
      (id, name, codename, role, role_type, avatar_color, avatar_icon, session_key)
    VALUES
      (@id, @name, @codename, @role, @role_type, @avatar_color, @avatar_icon, @session_key)
  `);

  const seedAgents = [
    {
      id: 'monty',
      name: 'Monty',
      codename: null,
      role: 'Chief of Staff',
      role_type: 'LEAD',
      avatar_color: '#f59e0b',
      avatar_icon: 'crown',
      session_key: 'agent:main:main',
    },
    {
      id: 'scout',
      name: 'Scout',
      codename: null,
      role: 'Hiring Coordinator',
      role_type: 'SPC',
      avatar_color: '#10b981',
      avatar_icon: 'search',
      session_key: 'agent:scout:main',
    },
    {
      id: 'ray',
      name: 'Ray',
      codename: 'Radar',
      role: 'Pre-Production Lead',
      role_type: 'SPC',
      avatar_color: '#6366f1',
      avatar_icon: 'radar',
      session_key: 'agent:ray:main',
    },
  ];

  const seedAgentsTx = db.transaction(() => {
    for (const agent of seedAgents) seedAgent.run(agent);
  });

  seedAgentsTx();

  migrateEpisodesSchema();
  migrateSeriesSchema();
  migrateSponsorsSchema();
  migrateHiringStages();
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
  addColumn('like_count', 'INTEGER DEFAULT 0');
  addColumn('comment_count', 'INTEGER DEFAULT 0');
  addColumn('description', "TEXT DEFAULT ''");
  addColumn('duration_seconds', 'INTEGER DEFAULT 0');
  addColumn('scraped_at', 'TEXT');
  addColumn('view_count_updated_at', 'TEXT');
  addColumn('thumbnail_url', "TEXT DEFAULT ''");
  addColumn('script_url', "TEXT DEFAULT ''");
}

function migrateSeriesSchema() {
  if (!db) return;
  const database = db;

  const columns = database.prepare("PRAGMA table_info(series)").all() as Array<{ name: string }>;
  const columnNames = new Set(columns.map(col => col.name));

  if (!columnNames.has('country')) {
    database.exec("ALTER TABLE series ADD COLUMN country TEXT DEFAULT ''");
  }
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
        sponsor_source TEXT DEFAULT 'manual' CHECK(sponsor_source IN ('manual', 'description', 'pinned_comment')),
        detected_text TEXT DEFAULT '',

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

  const spCols = db.prepare("PRAGMA table_info(sponsors)").all() as Array<{ name: string }>;
  const spColNames = new Set(spCols.map(col => col.name));
  if (!spColNames.has('sponsor_source')) {
    db.exec("ALTER TABLE sponsors ADD COLUMN sponsor_source TEXT DEFAULT 'manual' CHECK(sponsor_source IN ('manual', 'description', 'pinned_comment'))");
  }
  if (!spColNames.has('detected_text')) {
    db.exec("ALTER TABLE sponsors ADD COLUMN detected_text TEXT DEFAULT ''");
  }
}

function migrateHiringStages() {
  if (!db) return;

  // Check if we still have the old CHECK constraint (contains 'screening')
  const tableDef = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='applicants'").get() as { sql?: string } | undefined;
  if (!tableDef?.sql || !tableDef.sql.includes("'screening'")) return;

  // Recreate table with new CHECK constraint, mapping old stages during INSERT
  db.exec('BEGIN');
  try {
    db.exec(`
      CREATE TABLE applicants_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        position_id INTEGER NOT NULL REFERENCES job_positions(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        email TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        source TEXT DEFAULT '' CHECK(source IN ('onlinejobs_ph', 'vietnamworks', 'referral', 'direct', 'other', '')),
        portfolio_url TEXT DEFAULT '',
        resume_url TEXT DEFAULT '',
        stage TEXT DEFAULT 'applied' CHECK(stage IN ('applied', 'contacted', 'trial_sent', 'evaluation', 'interview', 'hired', 'rejected')),
        screening_score INTEGER DEFAULT 0,
        screening_notes TEXT DEFAULT '',
        interview_date TEXT,
        interview_notes TEXT DEFAULT '',
        trial_task_sent_at TEXT,
        trial_task_received_at TEXT,
        trial_task_score INTEGER DEFAULT 0,
        trial_task_notes TEXT DEFAULT '',
        probation_start TEXT,
        probation_30_day TEXT,
        probation_60_day TEXT,
        probation_90_day TEXT,
        probation_notes TEXT DEFAULT '',
        overall_rating INTEGER DEFAULT 0,
        communication_rating INTEGER DEFAULT 0,
        attitude_rating INTEGER DEFAULT 0,
        motivation_rating INTEGER DEFAULT 0,
        rejection_reason TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);

    // Insert with stage mapping applied inline
    db.exec(`
      INSERT INTO applicants_new
      SELECT id, position_id, name, email, phone, source, portfolio_url, resume_url,
        CASE stage
          WHEN 'screening' THEN 'contacted'
          WHEN 'trial_task' THEN 'trial_sent'
          WHEN 'probation' THEN 'evaluation'
          ELSE stage
        END,
        screening_score, screening_notes, interview_date, interview_notes,
        trial_task_sent_at, trial_task_received_at, trial_task_score, trial_task_notes,
        probation_start, probation_30_day, probation_60_day, probation_90_day, probation_notes,
        overall_rating, communication_rating, attitude_rating, motivation_rating,
        rejection_reason, notes, created_at, updated_at
      FROM applicants;
    `);

    db.exec('DROP TABLE applicants');
    db.exec('ALTER TABLE applicants_new RENAME TO applicants');
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

export function logActivity(entityType: string, entityId: number, action: string, details = '') {
  const database = getDb();
  database.prepare('INSERT INTO activity_log (action, task_id, details) VALUES (?, ?, ?)')
    .run(action, entityId, `[${entityType}] ${details}`);
}

export function getActivity(): Activity[] {
  const database = getDb();
  return database.prepare('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 20').all() as Activity[];
}
