import CalendarView from "@/components/production/CalendarView";

export const dynamic = "force-dynamic";

export default function CalendarPage() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Calendar</div>
          <div className="muted">Shoots, deadlines, and publish dates</div>
        </div>
      </div>
      <CalendarView />
    </div>
  );
}
