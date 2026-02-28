'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, ChevronRight, GripVertical, Clock, AlertTriangle } from 'lucide-react';
import { useMissionControl } from '@/app/mission-control/lib/store';
import { triggerAutoDispatch, shouldTriggerAutoDispatch } from '@/app/mission-control/lib/auto-dispatch';
import type { Task, TaskStatus } from '@/app/mission-control/lib/types';
import { TaskModal } from './TaskModal';
import { formatDistanceToNow } from 'date-fns';

interface ScheduledJob {
  id: string;
  name: string;
  agentId: string;
  schedule: {
    kind: 'every' | 'cron';
    everyMs?: number;
    expr?: string;
    tz?: string;
  };
  state: {
    nextRunAtMs?: number;
    lastRunAtMs?: number;
    lastStatus?: string;
    consecutiveErrors?: number;
    lastError?: string;
  };
  enabled: boolean;
}

const AGENT_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  scout: { bg: 'bg-mc-accent/20', text: 'text-mc-accent' },
  max: { bg: 'bg-mc-accent-purple/20', text: 'text-mc-accent-purple' },
  ray: { bg: 'bg-teal-500/20', text: 'text-teal-400' },
  main: { bg: 'bg-mc-bg-tertiary', text: 'text-mc-text-secondary' },
};

function formatSchedule(schedule: ScheduledJob['schedule']): string {
  if (schedule.kind === 'every' && schedule.everyMs) {
    const hours = schedule.everyMs / 3_600_000;
    if (hours >= 1) return `Every ${hours}h`;
    const mins = schedule.everyMs / 60_000;
    return `Every ${mins}m`;
  }
  if (schedule.kind === 'cron' && schedule.expr) {
    const parts = schedule.expr.split(' ');
    if (parts.length < 5) return schedule.expr;
    const [min, hour, , , dow] = parts;
    const tz = schedule.tz ? ` ${schedule.tz.split('/')[1] || schedule.tz}` : '';
    // Weekly patterns
    if (dow !== '*') {
      const dayNames: Record<string, string> = { '0': 'Sun', '1': 'Mon', '2': 'Tue', '3': 'Wed', '4': 'Thu', '5': 'Fri', '6': 'Sat' };
      const days = dow.split(',').map((d) => dayNames[d] || d).join(', ');
      return `${days} ${hour}:${min.padStart(2, '0')}${tz}`;
    }
    // Daily
    if (hour !== '*') return `Daily ${hour}:${min.padStart(2, '0')}${tz}`;
    return schedule.expr;
  }
  return 'Unknown';
}

function formatNextRun(nextRunAtMs?: number): string {
  if (!nextRunAtMs) return '';
  return formatDistanceToNow(new Date(nextRunAtMs), { addSuffix: true });
}

interface MissionQueueProps {
  workspaceId?: string;
}

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'planning', label: '📋 PLANNING', color: 'border-t-mc-accent-purple' },
  { id: 'inbox', label: 'INBOX', color: 'border-t-mc-accent-pink' },
  { id: 'assigned', label: 'ASSIGNED', color: 'border-t-mc-accent-yellow' },
  { id: 'in_progress', label: 'IN PROGRESS', color: 'border-t-mc-accent' },
  { id: 'testing', label: 'TESTING', color: 'border-t-mc-accent-cyan' },
  { id: 'review', label: 'REVIEW', color: 'border-t-mc-accent-purple' },
  { id: 'done', label: 'DONE', color: 'border-t-mc-accent-green' },
];

export function MissionQueue({ workspaceId }: MissionQueueProps) {
  const { tasks, updateTaskStatus, addEvent } = useMissionControl();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledJob[]>([]);

  const fetchScheduledJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/mission-control/scheduled-tasks');
      if (res.ok) {
        const data = await res.json();
        setScheduledJobs(data.jobs ?? []);
      }
    } catch (err) {
      console.error('Failed to fetch scheduled jobs:', err);
    }
  }, []);

  useEffect(() => {
    fetchScheduledJobs();
    const interval = setInterval(fetchScheduledJobs, 60_000);
    return () => clearInterval(interval);
  }, [fetchScheduledJobs]);

  const getTasksByStatus = (status: TaskStatus) =>
    tasks.filter((task) => task.status === status);

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    if (!draggedTask || draggedTask.status === targetStatus) {
      setDraggedTask(null);
      return;
    }

    // Optimistic update
    updateTaskStatus(draggedTask.id, targetStatus);

    // Persist to API
    try {
      const res = await fetch(`/api/mission-control/tasks/${draggedTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus }),
      });

      if (res.ok) {
        // Add event
        addEvent({
          id: crypto.randomUUID(),
          type: targetStatus === 'done' ? 'task_completed' : 'task_status_changed',
          task_id: draggedTask.id,
          message: `Task "${draggedTask.title}" moved to ${targetStatus}`,
          created_at: new Date().toISOString(),
        });

        // Check if auto-dispatch should be triggered and execute it
        if (shouldTriggerAutoDispatch(draggedTask.status, targetStatus, draggedTask.assigned_agent_id)) {
          const result = await triggerAutoDispatch({
            taskId: draggedTask.id,
            taskTitle: draggedTask.title,
            agentId: draggedTask.assigned_agent_id,
            agentName: draggedTask.assigned_agent?.name || 'Unknown Agent',
            workspaceId: draggedTask.workspace_id
          });

          if (!result.success) {
            console.error('Auto-dispatch failed:', result.error);
            // Optionally show error to user here if needed
          }
        }
      }
    } catch (error) {
      console.error('Failed to update task status:', error);
      // Revert on error
      updateTaskStatus(draggedTask.id, draggedTask.status);
    }

    setDraggedTask(null);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-mc-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChevronRight className="w-4 h-4 text-mc-text-secondary" />
          <span className="text-sm font-medium uppercase tracking-wider">Mission Queue</span>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-mc-accent-pink text-mc-bg rounded text-sm font-medium hover:bg-mc-accent-pink/90"
        >
          <Plus className="w-4 h-4" />
          New Task
        </button>
      </div>

      {/* Kanban Columns */}
      <div className="flex-1 flex gap-3 p-3 overflow-x-auto">
        {/* Scheduled Column — read-only, no drag */}
        <div className="flex-1 min-w-[220px] max-w-[300px] flex flex-col bg-mc-bg rounded-lg border border-mc-border/50 border-t-2 border-t-mc-accent-cyan">
          <div className="p-2 border-b border-mc-border flex items-center justify-between">
            <span className="text-xs font-medium uppercase text-mc-text-secondary flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              SCHEDULED
            </span>
            <span className="text-xs bg-mc-bg-tertiary px-2 py-0.5 rounded text-mc-text-secondary">
              {scheduledJobs.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {scheduledJobs.map((job) => (
              <ScheduledJobCard key={job.id} job={job} />
            ))}
          </div>
        </div>

        {COLUMNS.map((column) => {
          const columnTasks = getTasksByStatus(column.id);
          return (
            <div
              key={column.id}
              className={`flex-1 min-w-[220px] max-w-[300px] flex flex-col bg-mc-bg rounded-lg border border-mc-border/50 border-t-2 ${column.color}`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              {/* Column Header */}
              <div className="p-2 border-b border-mc-border flex items-center justify-between">
                <span className="text-xs font-medium uppercase text-mc-text-secondary">
                  {column.label}
                </span>
                <span className="text-xs bg-mc-bg-tertiary px-2 py-0.5 rounded text-mc-text-secondary">
                  {columnTasks.length}
                </span>
              </div>

              {/* Tasks */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onDragStart={handleDragStart}
                    onClick={() => setEditingTask(task)}
                    isDragging={draggedTask?.id === task.id}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <TaskModal onClose={() => setShowCreateModal(false)} workspaceId={workspaceId} />
      )}
      {editingTask && (
        <TaskModal task={editingTask} onClose={() => setEditingTask(null)} workspaceId={workspaceId} />
      )}
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  onDragStart: (e: React.DragEvent, task: Task) => void;
  onClick: () => void;
  isDragging: boolean;
}

function TaskCard({ task, onDragStart, onClick, isDragging }: TaskCardProps) {
  const priorityStyles = {
    low: 'text-mc-text-secondary',
    normal: 'text-mc-accent',
    high: 'text-mc-accent-yellow',
    urgent: 'text-mc-accent-red',
  };

  const priorityDots = {
    low: 'bg-mc-text-secondary/40',
    normal: 'bg-mc-accent',
    high: 'bg-mc-accent-yellow',
    urgent: 'bg-mc-accent-red',
  };

  const isPlanning = task.status === 'planning';

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onClick={onClick}
      className={`group bg-mc-bg-secondary border rounded-lg cursor-pointer transition-all hover:shadow-lg hover:shadow-black/20 ${
        isDragging ? 'opacity-50 scale-95' : ''
      } ${isPlanning ? 'border-purple-500/40 hover:border-purple-500' : 'border-mc-border/50 hover:border-mc-accent/40'}`}
    >
      {/* Drag handle bar */}
      <div className="flex items-center justify-center py-1.5 border-b border-mc-border/30 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="w-4 h-4 text-mc-text-secondary/50 cursor-grab" />
      </div>

      {/* Card content */}
      <div className="p-4">
        {/* Title */}
        <h4 className="text-sm font-medium leading-snug line-clamp-2 mb-3">
          {task.title}
        </h4>
        
        {/* Planning mode indicator */}
        {isPlanning && (
          <div className="flex items-center gap-2 mb-3 py-2 px-3 bg-purple-500/10 rounded-md border border-purple-500/20">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse flex-shrink-0" />
            <span className="text-xs text-purple-400 font-medium">Continue planning</span>
          </div>
        )}

        {/* Assigned agent */}
        {task.assigned_agent && (
          <div className="flex items-center gap-2 mb-3 py-1.5 px-2 bg-mc-bg-tertiary/50 rounded">
            <span className="text-base">{(task.assigned_agent as unknown as { avatar_emoji: string }).avatar_emoji}</span>
            <span className="text-xs text-mc-text-secondary truncate">
              {(task.assigned_agent as unknown as { name: string }).name}
            </span>
          </div>
        )}

        {/* Footer: priority + timestamp */}
        <div className="flex items-center justify-between pt-2 border-t border-mc-border/20">
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${priorityDots[task.priority]}`} />
            <span className={`text-xs capitalize ${priorityStyles[task.priority]}`}>
              {task.priority}
            </span>
          </div>
          <span className="text-[10px] text-mc-text-secondary/80">
            {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
          </span>
        </div>
      </div>
    </div>
  );
}

function ScheduledJobCard({ job }: { job: ScheduledJob }) {
  const badge = AGENT_BADGE_COLORS[job.agentId] ?? AGENT_BADGE_COLORS.main;
  const isOk = job.state.lastStatus === 'ok';
  const errors = job.state.consecutiveErrors ?? 0;

  return (
    <div className="bg-mc-bg-secondary border border-mc-border/50 rounded-lg p-3 space-y-2 shadow-sm shadow-black/10">
      {/* Job name */}
      <h4 className="text-sm font-semibold leading-snug line-clamp-2">{job.name}</h4>

      {/* Agent badge */}
      <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded ${badge.bg} ${badge.text}`}>
        {job.agentId}
      </span>

      {/* Schedule + next run */}
      <div className="text-xs text-mc-text-secondary space-y-0.5">
        <div>{formatSchedule(job.schedule)}</div>
        {job.state.nextRunAtMs && (
          <div className="text-[10px] text-mc-text-secondary/80">
            Next: {formatNextRun(job.state.nextRunAtMs)}
          </div>
        )}
      </div>

      {/* Status row */}
      <div className="flex items-center justify-between pt-1.5 border-t border-mc-border/20">
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${isOk ? 'bg-mc-accent-green' : 'bg-mc-accent-red'}`} />
          <span className={`text-[10px] ${isOk ? 'text-mc-accent-green' : 'text-mc-accent-red'}`}>
            {isOk ? 'ok' : 'error'}
          </span>
        </div>
        {errors > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-mc-accent-red font-medium">
            <AlertTriangle className="w-3 h-3" />
            {errors} error{errors !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
}
