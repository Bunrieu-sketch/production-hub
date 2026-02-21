import ProductionForm from '@/components/production/ProductionForm';

export default function NewSeriesPage() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">New Series</div>
          <div className="muted">Create a new production series</div>
        </div>
      </div>
      <div className="panel">
        <ProductionForm />
      </div>
    </div>
  );
}
