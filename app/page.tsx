'use client';

import { useState, useEffect } from 'react';
import { TaskCard } from '@/components/TaskCard';
import { NewTaskModal } from '@/components/NewTaskModal';
import { ActivityFeed } from '@/components/ActivityFeed';

interface Task {
  id: number;
  title: string;
  description: string | null;
  stage: 'backlog' | 'in_progress' | 'review' | 'done';
  project: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

interface Stats {
  thisWeek: number;
  inProgress: number;
  total: number;
  completion: number;
}

const stages = [
  { id: 'backlog', label: 'Backlog', color: 'backlog' },
  { id: 'in_progress', label: 'In Progress', color: 'in_progress' },
  { id: 'review', label: 'Review', color: 'review' },
  { id: 'done', label: 'Done', color: 'done' },
] as const;

export default function HomePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<Stats>({ thisWeek: 0, inProgress: 0, total: 0, completion: 0 });
  const [showModal, setShowModal] = useState(false);
  const [draggingTask, setDraggingTask] = useState<number | null>(null);

  useEffect(() => {
    loadTasks();
    loadStats();
  }, []);

  async function loadTasks() {
    const res = await fetch('/api/tasks');
    const data = await res.json();
    setTasks(data);
  }

  async function loadStats() {
    const res = await fetch('/api/stats');
    const data = await res.json();
    setStats(data);
  }

  async function moveTask(taskId: number, newStage: string) {
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: newStage }),
    });
    loadTasks();
    loadStats();
  }

  function handleDragStart(taskId: number) {
    setDraggingTask(taskId);
  }

  function handleDragOver(e: React.DragEvent, stageId: string) {
    e.preventDefault();
    const col = e.currentTarget as HTMLElement;
    col.classList.add('drag-over');
  }

  function handleDragLeave(e: React.DragEvent) {
    const col = e.currentTarget as HTMLElement;
    col.classList.remove('drag-over');
  }

  function handleDrop(e: React.DragEvent, stageId: string) {
    e.preventDefault();
    const col = e.currentTarget as HTMLElement;
    col.classList.remove('drag-over');
    if (draggingTask) {
      moveTask(draggingTask, stageId);
      setDraggingTask(null);
    }
  }

  const tasksByStage = (stage: string) => tasks.filter(t => t.stage === stage);

  return (
    <div className="mc-layout">
      <div className="mc-main">
        <div className="mc-header">
          <h1>Production Hub</h1>
          <button className="btn-primary" onClick={() => setShowModal(true)}>+ New Task</button>
        </div>

        <div className="stats-bar">
          <div className="stat-item">
            <span className="stat-value green">{stats.thisWeek}</span>
            <span className="stat-label">This week</span>
          </div>
          <div className="stat-item">
            <span className="stat-value purple">{stats.inProgress}</span>
            <span className="stat-label">In progress</span>
          </div>
          <div className="stat-item">
            <span className="stat-value white">{stats.total}</span>
            <span className="stat-label">Total tasks</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{stats.completion}%</span>
            <span className="stat-label">Completion</span>
          </div>
        </div>

        <div className="kanban">
          {stages.map(stage => (
            <div
              key={stage.id}
              className="kanban-col"
              onDragOver={e => handleDragOver(e, stage.id)}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDrop(e, stage.id)}
            >
              <div className="col-header">
                <span className={`col-dot ${stage.color}`}></span>
                {stage.label}
                <span className="col-count">{tasksByStage(stage.id).length}</span>
              </div>
              <div className="col-cards">
                {tasksByStage(stage.id).map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onDragStart={() => handleDragStart(task.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <ActivityFeed />

      {showModal && (
        <NewTaskModal
          onClose={() => setShowModal(false)}
          onCreated={() => {
            loadTasks();
            loadStats();
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}
