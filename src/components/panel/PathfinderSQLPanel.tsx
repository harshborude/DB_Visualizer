import { useState } from 'react';

interface PathfinderSQLPanelProps {
  sqlQuery: string;
  onClose: () => void;
}

export function PathfinderSQLPanel({ sqlQuery, onClose }: PathfinderSQLPanelProps) {
  const [copied, setCopied] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlQuery);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!sqlQuery) return null;

  return (
    <div style={{
      position: 'absolute',
      bottom: '2rem',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      backdropFilter: 'blur(12px)',
      border: '1px solid #334155',
      borderRadius: '12px',
      padding: '1.5rem',
      width: '600px',
      maxWidth: '90vw',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      zIndex: 60
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, color: '#38bdf8', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          Generated JOIN Query
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={handleCopy}
            style={{
              background: 'transparent',
              border: '1px solid #334155',
              color: copied ? '#10b981' : '#cbd5e1',
              cursor: 'pointer',
              padding: '0.25rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              transition: 'all 0.2s'
            }}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? "Expand SQL Panel" : "Collapse SQL Panel"}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '0.25rem'
            }}
          >
            {isCollapsed ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            )}
          </button>
        </div>
      </div>
      {!isCollapsed && (
        <div style={{
          backgroundColor: '#0f172a',
          padding: '1rem',
          borderRadius: '8px',
          border: '1px solid #1e293b',
          overflowX: 'auto',
          maxHeight: '40vh',
          overflowY: 'auto'
        }}>
          <pre style={{ margin: 0, color: '#f8fafc', fontSize: '0.9rem', lineHeight: 1.5, fontFamily: 'monospace' }}>
            <code>{sqlQuery}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
