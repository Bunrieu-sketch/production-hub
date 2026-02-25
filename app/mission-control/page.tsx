'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Crown,
  Search,
  Radar,
  Bot,
  MessageSquare,
  FileText,
  Activity,
  CheckCircle,
} from 'lucide-react';

const statusLabels: Record<string, string> = {
  inbox: 'INBOX',
  assigned: 'ASSIGNED',
  in_progress: 'IN PROGRESS',
  review: 'REVIEW',
  done: 'DONE',
};

const statusDotColor: Record<string, string> = {
  inbox: 'bg-[#b45309]',
  assigned: 'bg-[#0f766e]',
  in_progress: 'bg-[#1d4ed8]',
  review: 'bg-[#a16207]',
  done: 'bg-[#15803d]',
};

const iconMap: Record<string, React.ReactNode> = {
  crown: <Crown size={14} className="text-white" />,
  search: <Search size={14} className="text-white" />,
  radar: <Radar size={14} className="text-white" />,
  bot: <Bot size={14} className="text-white" />,
};

const activityTabs = [
  { key: 'all', label: 'All', icon: <Activity size={14} /> },
  { key: 'task', label: 'Tasks', icon: <CheckCircle size={14} /> },
  { key: 'comment', label: 'Comments', icon: <MessageSquare size={14} /> },
  { key: 'doc', label: 'Docs', icon: <FileText size={14} /> },
  { key: 'status', label: 'Status', icon: <Activity size={14} /> },
];

const formatTimeAgo = (value?: string | null) => {
  if (!value) return 'just now';
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  if (Number.isNaN(diff)) return 'just now';
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
};

const formatClock = (date: Date) => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const formatDay = (date: Date) => {
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
};

const getTagColor = (tag: string) => {
  const colors = ['bg-[#fee2e2] text-[#7f1d1d]', 'bg-[#dcfce7] text-[#14532d]', 'bg-[#e0e7ff] text-[#312e81]', 'bg-[#fef3c7] text-[#78350f]'];
  const index = Math.abs(tag.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % colors.length;
  return colors[index];
};

type Agent = {
  id: string;
  name: string;
  codename: string | null;
  role: string;
  role_type: 'LEAD' | 'INT' | 'SPC';
  status: 'idle' | 'working' | 'blocked' | 'offline';
  current_task_id?: number | null;
  current_task_title?: string | null;
  avatar_color?: string | null;
  avatar_icon?: string | null;
};

type Task = {
  id: number;
  title: string;
  description?: string | null;
  status: 'inbox' | 'assigned' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assignee_ids: string[];
  tags: string[];
  created_at: string;
  updated_at: string;
};

type ActivityItem = {
  id: number;
  type: string;
  agent_id?: string | null;
  agent_name?: string | null;
  agent_color?: string | null;
  message: string;
  task_id?: number | null;
  task_title?: string | null;
  created_at: string;
};

type Message = {
  id: number;
  task_id: number;
  from_agent_id?: string | null;
  agent_name?: string | null;
  agent_color?: string | null;
  content: string;
  created_at: string;
};

type DocumentItem = {
  id: number;
  title: string;
  type: string;
  task_id?: number | null;
  agent_id?: string | null;
  agent_name?: string | null;
  agent_color?: string | null;
  created_at: string;
};

export default function MissionControlPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [stats, setStats] = useState({ agentsActive: 0, tasksInQueue: 0, totalTasks: 0 });
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [clock, setClock] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskMessages, setTaskMessages] = useState<Message[]>([]);
  const [taskDocuments, setTaskDocuments] = useState<DocumentItem[]>([]);
  const [commentDraft, setCommentDraft] = useState('');

  const agentMap = useMemo(() => new Map(agents.map((agent) => [agent.id, agent])), [agents]);

  const fetchAgents = useCallback(async () => {
    const res = await fetch('/api/mission-control/agents', { cache: 'no-store' });
    if (res.ok) setAgents(await res.json());
  }, []);

  const fetchTasks = useCallback(async () => {
    const res = await fetch('/api/mission-control/tasks', { cache: 'no-store' });
    if (res.ok) setTasks(await res.json());
  }, []);

  const fetchStats = useCallback(async () => {
    const res = await fetch('/api/mission-control/stats', { cache: 'no-store' });
    if (res.ok) setStats(await res.json());
  }, []);

  const fetchActivities = useCallback(async (agentId?: string | null) => {
    const params = new URLSearchParams();
    if (agentId) params.set('agent', agentId);
    params.set('limit', '60');
    const res = await fetch(`/api/mission-control/activities?${params.toString()}`, { cache: 'no-store' });
    if (res.ok) setActivities(await res.json());
  }, []);

  const fetchTaskMessages = useCallback(async (taskId: number) => {
    const res = await fetch(`/api/mission-control/messages?task_id=${taskId}`, { cache: 'no-store' });
    if (res.ok) setTaskMessages(await res.json());
  }, []);

  const fetchTaskDocuments = useCallback(async (taskId: number) => {
    const res = await fetch(`/api/mission-control/documents?task_id=${taskId}`, { cache: 'no-store' });
    if (res.ok) setTaskDocuments(await res.json());
  }, []);

  useEffect(() => {
    fetchAgents();
    fetchTasks();
    fetchStats();
    fetchActivities();
  }, [fetchAgents, fetchTasks, fetchStats, fetchActivities]);

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchActivities(activeAgentId);
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchActivities, activeAgentId]);

  useEffect(() => {
    fetchActivities(activeAgentId);
  }, [activeAgentId, fetchActivities]);

  const columns = useMemo(() => {
    return (['inbox', 'assigned', 'in_progress', 'review', 'done'] as const).map((status) => ({
      status,
      label: statusLabels[status],
      tasks: tasks.filter((task) => task.status === status),
    }));
  }, [tasks]);

  const activeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: activities.length };
    for (const tab of activityTabs) {
      if (tab.key !== 'all') counts[tab.key] = 0;
    }
    for (const item of activities) {
      if (item.type) counts[item.type] = (counts[item.type] ?? 0) + 1;
    }
    return counts;
  }, [activities]);

  const filteredActivities = useMemo(() => {
    return activities.filter((item) => activeTab === 'all' || item.type === activeTab);
  }, [activities, activeTab]);

  const handleDrop = async (status: Task['status'], taskId: number) => {
    const res = await fetch(`/api/mission-control/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTasks((prev) => prev.map((task) => (task.id === taskId ? updated : task)));
      fetchStats();
      fetchActivities(activeAgentId);
    }
  };

  const openTask = (task: Task) => {
    setSelectedTask(task);
    fetchTaskMessages(task.id);
    fetchTaskDocuments(task.id);
  };

  const submitComment = async () => {
    if (!selectedTask || !commentDraft.trim()) return;
    const res = await fetch('/api/mission-control/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task_id: selectedTask.id,
        from_agent_id: 'monty',
        content: commentDraft.trim(),
      }),
    });
    if (res.ok) {
      setCommentDraft('');
      fetchTaskMessages(selectedTask.id);
      fetchActivities(activeAgentId);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#1a1a1a]">
      <div className="fixed top-0 left-0 right-0 z-20 h-16 border-b border-black/10 bg-[#faf9f6]/95 backdrop-blur">
        <div className="mx-auto flex h-full max-w-[1600px] items-center justify-between px-6">
          <div className="text-sm font-semibold tracking-[0.3em] text-[#1a1a1a]">◇ MISSION CONTROL</div>
          <div className="flex items-baseline gap-8 text-center">
            <div>
              <div className="text-2xl font-semibold">{stats.agentsActive}</div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-gray-500">Agents Active</div>
            </div>
            <div>
              <div className="text-2xl font-semibold">{stats.tasksInQueue}</div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-gray-500">Tasks In Queue</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold">{formatClock(clock)}</div>
            <div className="flex items-center justify-end gap-2 text-xs uppercase tracking-[0.2em] text-gray-500">
              <span>{formatDay(clock)}</span>
              <span className="inline-flex items-center gap-1 text-[#15803d]">
                <span className="h-2 w-2 rounded-full bg-[#22c55e]" /> ONLINE
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1600px] gap-6 px-6 pt-20">
        <aside className="h-[calc(100vh-5rem)] w-[220px] overflow-y-auto pb-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">Agents</h2>
            <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-700">
              {agents.length}
            </span>
          </div>
          <div className="space-y-3">
            {agents.map((agent) => {
              const isActive = activeAgentId === agent.id;
              return (
                <button
                  key={agent.id}
                  onClick={() => setActiveAgentId(isActive ? null : agent.id)}
                  className={`w-full rounded-xl border border-black/10 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 ${
                    isActive ? 'ring-2 ring-black/60' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-full"
                      style={{ backgroundColor: agent.avatar_color ?? '#10b981' }}
                    >
                      {iconMap[agent.avatar_icon ?? 'bot'] ?? <Bot size={14} className="text-white" />}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{agent.name}</div>
                      <div className="text-xs text-gray-500">{agent.role}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="rounded-full border border-black/10 px-2 py-0.5 text-[10px] font-semibold text-gray-700">
                      {agent.role_type}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] uppercase tracking-[0.2em] text-gray-500">
                      <span
                        className={`h-2 w-2 rounded-full ${agent.status === 'working' ? 'bg-[#22c55e]' : 'bg-gray-400'}`}
                      />
                      {agent.status === 'working' ? 'WORKING' : 'IDLE'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="flex h-[calc(100vh-5rem)] flex-1 flex-col overflow-hidden">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">Mission Queue</h2>
            <span className="text-xs uppercase tracking-[0.3em] text-gray-400">
              {stats.totalTasks} total tasks
            </span>
          </div>
          <div className="flex-1 overflow-x-auto pb-6">
            <div className="grid min-w-[1100px] grid-cols-5 gap-4">
              {columns.map((column) => (
                <div
                  key={column.status}
                  className="flex h-full flex-col rounded-2xl border border-black/10 bg-white/70 p-3"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    const taskId = Number(event.dataTransfer.getData('text/plain'));
                    if (taskId) handleDrop(column.status, taskId);
                  }}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-gray-600">
                      <span className={`h-2 w-2 rounded-full ${statusDotColor[column.status]}`} />
                      {column.label}
                    </div>
                    <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-700">
                      {column.tasks.length}
                    </span>
                  </div>
                  <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                    {column.tasks.map((task) => {
                      const assigned = task.assignee_ids?.[0] ? agentMap.get(task.assignee_ids[0]) : null;
                      return (
                        <button
                          key={task.id}
                          draggable
                          onDragStart={(event) => event.dataTransfer.setData('text/plain', String(task.id))}
                          onClick={() => openTask(task)}
                          className="w-full rounded-xl border border-black/10 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5"
                        >
                          <div className="text-sm font-semibold">{task.title}</div>
                          <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                            {task.description || 'No description yet.'}
                          </p>
                          <div className="mt-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {assigned ? (
                                <div
                                  className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                                  style={{ backgroundColor: assigned.avatar_color ?? '#10b981' }}
                                >
                                  {assigned.name.slice(0, 1).toUpperCase()}
                                </div>
                              ) : (
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-[10px] text-gray-600">
                                  —
                                </div>
                              )}
                              <div className="flex flex-wrap gap-1">
                                {task.tags?.map((tag) => (
                                  <span
                                    key={tag}
                                    className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${getTagColor(tag)}`}
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400">
                              {formatTimeAgo(task.created_at)}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="h-[calc(100vh-5rem)] w-[320px] overflow-y-auto pb-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">Live Feed</h2>
            <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-700">
              {activities.length}
            </span>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {activityTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${
                  activeTab === tab.key
                    ? 'border-black/60 bg-black/5'
                    : 'border-black/10 bg-white'
                }`}
              >
                {tab.icon}
                {tab.label}
                <span className="ml-1 rounded-full bg-gray-200 px-1.5 py-0.5 text-[9px] text-gray-700">
                  {activeCounts[tab.key] ?? 0}
                </span>
              </button>
            ))}
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            <button
              onClick={() => setActiveAgentId(null)}
              className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${
                !activeAgentId ? 'border-black/60 bg-black/5' : 'border-black/10 bg-white'
              }`}
            >
              All Agents
            </button>
            {agents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => setActiveAgentId(agent.id)}
                className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${
                  activeAgentId === agent.id ? 'border-black/60 bg-black/5' : 'border-black/10 bg-white'
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: agent.avatar_color ?? '#10b981' }} />
                  {agent.name}
                </span>
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filteredActivities.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-black/10 bg-white p-3 shadow-sm"
                style={{ borderLeftWidth: 4, borderLeftColor: item.agent_color ?? '#94a3b8' }}
              >
                <div className="text-sm">
                  <span className="font-semibold" style={{ color: item.agent_color ?? '#1a1a1a' }}>
                    {item.agent_name ?? 'System'}
                  </span>{' '}
                  <span className="text-gray-600">{item.message}</span>{' '}
                  {item.task_title ? (
                    <span className="font-semibold">"{item.task_title}"</span>
                  ) : null}
                </div>
                <div className="mt-2 text-[10px] uppercase tracking-[0.2em] text-gray-400">
                  {formatTimeAgo(item.created_at)}
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {selectedTask ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 p-6">
          <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-2xl font-semibold">{selectedTask.title}</h3>
                <p className="mt-2 text-sm text-gray-600">
                  {selectedTask.description || 'No description provided.'}
                </p>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="rounded-full border border-black/10 px-3 py-1 text-xs uppercase tracking-[0.2em]"
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-[0.3em] text-gray-500">Status</label>
                <select
                  value={selectedTask.status}
                  onChange={async (event) => {
                    const nextStatus = event.target.value as Task['status'];
                    const res = await fetch(`/api/mission-control/tasks/${selectedTask.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ status: nextStatus }),
                    });
                    if (res.ok) {
                      const updated = await res.json();
                      setSelectedTask(updated);
                      setTasks((prev) => prev.map((task) => (task.id === updated.id ? updated : task)));
                      fetchStats();
                      fetchActivities(activeAgentId);
                    }
                  }}
                  className="mt-2 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
                >
                  {Object.keys(statusLabels).map((key) => (
                    <option key={key} value={key}>{statusLabels[key]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-[0.3em] text-gray-500">Assigned</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedTask.assignee_ids?.length ? (
                    selectedTask.assignee_ids.map((id) => {
                      const agent = agentMap.get(id);
                      if (!agent) return null;
                      return (
                        <span key={id} className="flex items-center gap-2 rounded-full border border-black/10 px-3 py-1 text-xs">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: agent.avatar_color ?? '#10b981' }} />
                          {agent.name}
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-xs text-gray-500">No assignees.</span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <label className="text-[10px] font-semibold uppercase tracking-[0.3em] text-gray-500">Tags</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedTask.tags?.length ? (
                  selectedTask.tags.map((tag) => (
                    <span key={tag} className={`rounded-full px-3 py-1 text-[10px] font-semibold ${getTagColor(tag)}`}>
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-500">No tags.</span>
                )}
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-[0.3em] text-gray-500">Comment Thread</label>
                <div className="mt-3 space-y-3">
                  {taskMessages.length ? (
                    taskMessages.map((message) => (
                      <div key={message.id} className="rounded-xl border border-black/10 bg-[#faf9f6] p-3">
                        <div className="text-xs font-semibold" style={{ color: message.agent_color ?? '#1a1a1a' }}>
                          {message.agent_name ?? 'Unknown'}
                        </div>
                        <p className="mt-1 text-sm text-gray-600">{message.content}</p>
                        <div className="mt-2 text-[10px] uppercase tracking-[0.2em] text-gray-400">
                          {formatTimeAgo(message.created_at)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-500">No comments yet.</p>
                  )}
                </div>
                <div className="mt-4 flex gap-2">
                  <input
                    value={commentDraft}
                    onChange={(event) => setCommentDraft(event.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm"
                  />
                  <button
                    onClick={submitComment}
                    className="rounded-lg bg-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
                  >
                    Send
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-[0.3em] text-gray-500">Documents</label>
                <div className="mt-3 space-y-2">
                  {taskDocuments.length ? (
                    taskDocuments.map((doc) => (
                      <div key={doc.id} className="rounded-xl border border-black/10 bg-[#faf9f6] p-3">
                        <div className="text-sm font-semibold">{doc.title}</div>
                        <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-gray-500">{doc.type}</div>
                        <div className="mt-2 text-[10px] uppercase tracking-[0.2em] text-gray-400">
                          {formatTimeAgo(doc.created_at)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-500">No documents attached.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
