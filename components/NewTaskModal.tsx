'use client';

import { useState } from 'react';

interface NewTaskModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export function NewTaskModal({ onClose, onCreated }: NewTaskModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project: 'general',
    priority: 'normal',
    stage: 'backlog',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    onCreated();
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h3>New Task</h3>
        <form onSubmit={handleSubmit}>
          <input
            name="title"
            placeholder="Task title"
            required
            value={formData.title}
            onChange={e => setFormData({ ...formData, title: e.target.value })}
          />
          <textarea
            name="description"
            placeholder="Description"
            rows={3}
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
          />
          
          <select
            name="project"
            value={formData.project}
            onChange={e => setFormData({ ...formData, project: e.target.value })}
          >
            <option value="general">General</option>
            <option value="youtube_dashboard">YouTube Dashboard</option>
            <option value="competitor_tracker">Competitor Tracker</option>
          </select>
          
          <select
            name="priority"
            value={formData.priority}
            onChange={e => setFormData({ ...formData, priority: e.target.value })}
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          
          <select
            name="stage"
            value={formData.stage}
            onChange={e => setFormData({ ...formData, stage: e.target.value })}
          >
            <option value="backlog">Backlog</option>
            <option value="in_progress">In Progress</option>
            <option value="review">Review</option>
            <option value="done">Done</option>
          </select>
          
          <button type="submit" className="btn-primary">Create</button>
        </form>
      </div>
    </div>
  );
}
