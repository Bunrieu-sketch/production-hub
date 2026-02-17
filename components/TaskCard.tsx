interface Task {
  id: number;
  title: string;
  description: string | null;
  stage: 'backlog' | 'in_progress' | 'review' | 'done';
  project: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

interface TaskCardProps {
  task: Task;
  onDragStart: () => void;
}

const priorityColors = {
  low: 'low',
  normal: 'normal',
  high: 'high',
  urgent: 'urgent',
};

const projectLabels: Record<string, string> = {
  general: 'General',
  youtube_dashboard: 'YouTube Dashboard',
  competitor_tracker: 'Competitor Tracker',
  Dashboards: 'Dashboards',
};

export function TaskCard({ task, onDragStart }: TaskCardProps) {
  return (
    <div
      className="task-card"
      draggable
      onDragStart={onDragStart}
    >
      <div className="card-top">
        <span className={`priority-dot ${priorityColors[task.priority]}`}></span>
        <span className="card-title">{task.title}</span>
      </div>
      {task.description && (
        <div className="card-desc">{task.description}</div>
      )}
      {task.project && task.project !== 'general' && (
        <span className={`card-tag tag-${task.project}`}>
          {projectLabels[task.project] || task.project}
        </span>
      )}
    </div>
  );
}
