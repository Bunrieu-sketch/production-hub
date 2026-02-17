const API = '';

async function loadAll() {
    const [tasks, stats, activity] = await Promise.all([
        fetch(`${API}/api/tasks`).then(r=>r.json()),
        fetch(`${API}/api/stats`).then(r=>r.json()),
        fetch(`${API}/api/activity`).then(r=>r.json())
    ]);
    renderStats(stats);
    renderKanban(tasks);
    renderActivity(activity);
}

function renderStats(s) {
    document.getElementById('stats-bar').innerHTML = `
        <div class="stat-item"><span class="stat-value green">${s.this_week}</span><span class="stat-label">This week</span></div>
        <div class="stat-item"><span class="stat-value purple">${s.in_progress}</span><span class="stat-label">In progress</span></div>
        <div class="stat-item"><span class="stat-value white">${s.total}</span><span class="stat-label">Total</span></div>
        <div class="stat-item"><span class="stat-value purple">${s.completion}%</span><span class="stat-label">Completion</span></div>
    `;
}

const tagLabels = { general:'General', youtube_dashboard:'YouTube', competitor_tracker:'Competitor' };

function renderKanban(tasks) {
    const stages = ['backlog','in_progress','review','done'];
    stages.forEach(s => {
        const col = document.getElementById(`cards-${s}`);
        const filtered = tasks.filter(t => t.stage === s);
        document.getElementById(`count-${s}`).textContent = filtered.length;
        col.innerHTML = filtered.map(t => `
            <div class="task-card" draggable="true" data-id="${t.id}"
                 ondragstart="dragStart(event)" ondragend="dragEnd(event)">
                <div class="card-top">
                    <span class="priority-dot ${t.priority}"></span>
                    <span class="card-title">${esc(t.title)}</span>
                </div>
                ${t.description ? `<div class="card-desc">${esc(t.description)}</div>` : ''}
                <span class="card-tag tag-${t.project}">${tagLabels[t.project]||t.project}</span>
            </div>
        `).join('');
    });
}

function renderActivity(items) {
    const feed = document.getElementById('activity-feed');
    if (!feed) return;
    feed.innerHTML = items.map(a => `
        <div class="activity-item">
            <div class="activity-text">${esc(a.details)}</div>
            <div class="activity-time">${timeAgo(a.created_at)}</div>
        </div>
    `).join('') || '<div class="activity-item"><div class="activity-text" style="color:var(--text-dim)">No activity yet</div></div>';
}

function timeAgo(ts) {
    const diff = (Date.now() - new Date(ts+'Z').getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff/60) + ' min ago';
    if (diff < 86400) return Math.floor(diff/3600) + 'h ago';
    return Math.floor(diff/86400) + 'd ago';
}

function esc(s) { const d=document.createElement('div'); d.textContent=s||''; return d.innerHTML; }

// Drag & Drop
let dragId = null;
function dragStart(e) { dragId = e.target.dataset.id; e.target.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; }
function dragEnd(e) { e.target.classList.remove('dragging'); dragId=null; document.querySelectorAll('.kanban-col').forEach(c=>c.classList.remove('drag-over')); }

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.kanban-col').forEach(col => {
        col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('drag-over'); });
        col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
        col.addEventListener('drop', async e => {
            e.preventDefault(); col.classList.remove('drag-over');
            if (!dragId) return;
            const stage = col.dataset.stage;
            await fetch(`${API}/api/tasks/${dragId}`, {
                method:'PUT', headers:{'Content-Type':'application/json'},
                body: JSON.stringify({stage})
            });
            loadAll();
        });
    });
    loadAll();
});

// Modal
function openModal() { document.getElementById('modal').style.display='flex'; }
function closeModal() { document.getElementById('modal').style.display='none'; document.getElementById('task-form').reset(); }

async function createTask(e) {
    e.preventDefault();
    const f = new FormData(e.target);
    await fetch(`${API}/api/tasks`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify(Object.fromEntries(f))
    });
    closeModal();
    loadAll();
}
