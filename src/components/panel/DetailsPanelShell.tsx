import React from 'react';
import type { AnalyzedTableData } from '../../utils/graphAnalytics';
import { type ActiveTab, TABS } from '../../types/ui';
import { OverviewTab } from './tabs/OverviewTab';

interface DetailsPanelShellProps {
  selectedTable: AnalyzedTableData;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onClose: () => void;
}

export function DetailsPanelShell({ selectedTable, activeTab, onTabChange, onClose }: DetailsPanelShellProps) {
  return (
    <div style={{
      position: 'absolute',
      top: '73px', // Below the header
      right: 0,
      bottom: 0,
      width: '400px',
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      backdropFilter: 'blur(16px)',
      borderLeft: '1px solid #334155',
      boxShadow: '-10px 0 25px rgba(0,0,0,0.5)',
      zIndex: 100,
      padding: '2rem',
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#f8fafc', fontWeight: 600 }}>{selectedTable.name}</h2>
        <button 
          onClick={onClose}
          style={{ 
            background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.5rem',
            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#1e293b'; e.currentTarget.style.color = '#f8fafc'; }}
          onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      {/* TAB NAVIGATION */}
      <div style={{ display: 'flex', gap: '1.5rem', overflowX: 'auto', marginBottom: '2rem', borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              background: 'transparent',
              border: 'none',
              color: activeTab === tab.id ? '#38bdf8' : '#94a3b8',
              fontWeight: activeTab === tab.id ? 600 : 500,
              cursor: 'pointer',
              padding: '0.5rem 0',
              whiteSpace: 'nowrap',
              borderBottom: activeTab === tab.id ? '2px solid #38bdf8' : '2px solid transparent',
              transition: 'all 0.2s ease',
              fontSize: '0.95rem'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      {activeTab === 'overview' && <OverviewTab selectedTable={selectedTable} />}

      {activeTab !== 'overview' && (
        <div style={{ padding: '3rem 2rem', textAlign: 'center', color: '#94a3b8', backgroundColor: '#1e293b', borderRadius: '12px', border: '1px dashed #475569' }}>
          <h3 style={{ color: '#f8fafc', marginBottom: '1rem', fontSize: '1.25rem' }}>{TABS.find(t => t.id === activeTab)?.label} Panel</h3>
          <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.5 }}>
            This section will display advanced {TABS.find(t => t.id === activeTab)?.label.toLowerCase()} intelligence and metrics for <strong>{selectedTable.name}</strong>.
          </p>
        </div>
      )}
    </div>
  );
}
