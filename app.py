from flask import Flask, render_template, request, jsonify
import sqlite3, os, json
from datetime import datetime, timedelta

app = Flask(__name__)
DB = os.path.join(os.path.dirname(__file__), 'mission-control.db')

def get_db():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn

def init_db():
    conn = get_db()
    conn.executescript('''
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
    ''')
    conn.commit()
    conn.close()

def log_activity(conn, action, task_id, details):
    conn.execute('INSERT INTO activity_log (action, task_id, details) VALUES (?,?,?)',
                 (action, task_id, details))

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/projects')
def projects():
    return render_template('projects.html')

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    conn = get_db()
    tasks = conn.execute('SELECT * FROM tasks ORDER BY created_at DESC').fetchall()
    conn.close()
    return jsonify([dict(t) for t in tasks])

@app.route('/api/tasks', methods=['POST'])
def create_task():
    d = request.json
    conn = get_db()
    cur = conn.execute('INSERT INTO tasks (title,description,stage,project,priority) VALUES (?,?,?,?,?)',
                       (d['title'], d.get('description',''), d.get('stage','backlog'), d.get('project','general'), d.get('priority','normal')))
    task_id = cur.lastrowid
    log_activity(conn, 'created', task_id, f"Created: {d['title']}")
    conn.commit()
    task = dict(conn.execute('SELECT * FROM tasks WHERE id=?', (task_id,)).fetchone())
    conn.close()
    return jsonify(task), 201

@app.route('/api/tasks/<int:tid>', methods=['PUT'])
def update_task(tid):
    d = request.json
    conn = get_db()
    old = conn.execute('SELECT * FROM tasks WHERE id=?', (tid,)).fetchone()
    if not old:
        conn.close()
        return jsonify({'error':'not found'}), 404

    stage = d.get('stage', old['stage'])
    title = d.get('title', old['title'])
    desc = d.get('description', old['description'])
    project = d.get('project', old['project'])
    priority = d.get('priority', old['priority'])
    completed_at = old['completed_at']

    if stage != old['stage']:
        if stage == 'done':
            completed_at = datetime.now().isoformat()
            log_activity(conn, 'completed', tid, f"Completed: {old['title']}")
        elif stage == 'in_progress' and old['stage'] == 'backlog':
            log_activity(conn, 'moved', tid, f"Started: {old['title']}")
        else:
            log_activity(conn, 'moved', tid, f"Moved: {old['title']} → {stage}")
        if stage != 'done':
            completed_at = None

    conn.execute('UPDATE tasks SET title=?,description=?,stage=?,project=?,priority=?,updated_at=?,completed_at=? WHERE id=?',
                 (title, desc, stage, project, priority, datetime.now().isoformat(), completed_at, tid))
    conn.commit()
    task = dict(conn.execute('SELECT * FROM tasks WHERE id=?', (tid,)).fetchone())
    conn.close()
    return jsonify(task)

@app.route('/api/stats')
def get_stats():
    conn = get_db()
    week_ago = (datetime.now() - timedelta(days=7)).isoformat()
    this_week = conn.execute('SELECT COUNT(*) FROM tasks WHERE created_at >= ?', (week_ago,)).fetchone()[0]
    in_progress = conn.execute("SELECT COUNT(*) FROM tasks WHERE stage='in_progress'").fetchone()[0]
    total = conn.execute('SELECT COUNT(*) FROM tasks').fetchone()[0]
    done = conn.execute("SELECT COUNT(*) FROM tasks WHERE stage='done'").fetchone()[0]
    conn.close()
    pct = round(done/total*100) if total else 0
    return jsonify({'this_week': this_week, 'in_progress': in_progress, 'total': total, 'completion': pct})

@app.route('/api/activity')
def get_activity():
    conn = get_db()
    rows = conn.execute('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 20').fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=5053, debug=True)
