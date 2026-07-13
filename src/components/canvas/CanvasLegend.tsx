export function CanvasLegend() {
  return (
    <div style={{
      position: 'absolute',
      bottom: '24px',
      left: '304px', // 280px (left panel width) + 24px padding
      backgroundColor: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(12px)',
      border: '1px solid #334155',
      borderRadius: '8px',
      padding: '1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
      zIndex: 10,
      boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
      color: '#f8fafc',
    }}>
      <h4 style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Canvas Legend
      </h4>
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="primary-badge" style={{ 
            fontSize: '0.7rem', 
            fontWeight: '600', 
            padding: '2px 6px',
            borderRadius: '4px',
            letterSpacing: '0.05em'
          }}>P.K</span>
          <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>Primary Key</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="index-badge" style={{ 
            fontSize: '0.7rem', 
            fontWeight: '600', 
            padding: '2px 6px',
            borderRadius: '4px',
            letterSpacing: '0.05em',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            color: '#34d399',
            border: '1px solid rgba(16, 185, 129, 0.3)'
          }}>IDX</span>
          <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>Index</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="relationship-badge" style={{
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '0.7rem',
            fontWeight: '600',
            letterSpacing: '0.05em'
          }}>1:N</span>
          <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>Relationship Type</span>
        </div>
      </div>
    </div>
  );
}
