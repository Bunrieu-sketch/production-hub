import TimelineView from "@/components/production/TimelineView";

export const dynamic = "force-dynamic";

export default function TimelinePage() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Timeline</div>
          <div className="muted">Gantt view across shoots and publish dates</div>
        </div>
      </div>
      <TimelineView />
    </div>
  );
}
