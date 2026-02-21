export default function MediaKitPreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#0d1117', overflowY: 'scroll', overflowX: 'hidden' }}>
      {children}
    </div>
  );
}
