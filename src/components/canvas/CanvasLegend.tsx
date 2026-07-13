import { useState } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';

export function CanvasLegend() {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);

  if (isMobile && !isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'absolute',
          bottom: '24px',
          left: '16px',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(12px)',
          border: '1px solid #334155',
          color: '#38bdf8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 40,
          cursor: 'pointer',
          boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
        }}
        title="Show Legend"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
      </button>
    );
  }

  return (
    <div style={{
      position: 'absolute',
      bottom: '24px',
      left: isMobile ? '16px' : '304px', // adjust for left panel width on desktop
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Canvas Legend
        </h4>
        {isMobile && (
          <button onClick={() => setIsOpen(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        )}
      </div>
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
