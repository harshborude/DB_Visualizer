import type { AnalyzedTableData } from '../../utils/graphAnalytics';
import { type ActiveTab, TABS } from '../../types/ui';
import { OverviewTab } from './tabs/OverviewTab';
import { ColumnsTab } from './tabs/ColumnsTab';
import { KeysTab } from './tabs/KeysTab';
import { RelationshipsTab } from './tabs/RelationshipsTab';
import { HealthTab } from './tabs/HealthTab';
import { ImpactTab } from './tabs/ImpactTab';
import { SuggestionsTab } from './tabs/SuggestionsTab';
import { DocsTab } from './tabs/DocsTab';

interface DetailsPanelShellProps {
  tables: AnalyzedTableData[];
  selectedTable: AnalyzedTableData;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onClose: () => void;
  isIsolatedMode?: boolean;
  onToggleIsolation?: () => void;
}

export function DetailsPanelShell({ tables, selectedTable, activeTab, onTabChange, onClose, isIsolatedMode, onToggleIsolation }: DetailsPanelShellProps) {
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexShrink: 0 }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#f8fafc', fontWeight: 600 }}>{selectedTable.name}</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={onToggleIsolation}
            title={isIsolatedMode ? "Show all tables" : "Isolate dependent/referenced tables"}
            style={{
              background: isIsolatedMode ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
              border: '1px solid',
              borderColor: isIsolatedMode ? '#38bdf8' : '#334155',
              color: isIsolatedMode ? '#38bdf8' : '#cbd5e1',
              cursor: 'pointer',
              padding: '0.4rem 0.75rem',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontSize: '0.85rem',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease',
              boxShadow: isIsolatedMode ? '0 0 10px rgba(56, 189, 248, 0.1)' : 'none'
            }}
            onMouseOver={(e) => { 
              if (!isIsolatedMode) {
                e.currentTarget.style.backgroundColor = '#1e293b'; 
                e.currentTarget.style.borderColor = '#475569';
                e.currentTarget.style.color = '#f8fafc'; 
              }
            }}
            onMouseOut={(e) => { 
              if (!isIsolatedMode) {
                e.currentTarget.style.backgroundColor = 'transparent'; 
                e.currentTarget.style.borderColor = '#334155';
                e.currentTarget.style.color = '#cbd5e1'; 
              }
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            <span>{isIsolatedMode ? "Show All" : "Isolate"}</span>
          </button>
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
      </div>

      {/* TAB NAVIGATION */}
      <div style={{ display: 'flex', gap: '1.5rem', overflowX: 'auto', marginBottom: '2rem', borderBottom: '1px solid #334155', paddingBottom: '0.5rem', flexShrink: 0 }}>
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
      {activeTab === 'columns' && <ColumnsTab selectedTable={selectedTable} />}
      {activeTab === 'keys' && <KeysTab selectedTable={selectedTable} />}
      {activeTab === 'relationships' && <RelationshipsTab selectedTable={selectedTable} tables={tables} />}
      {activeTab === 'health' && <HealthTab selectedTable={selectedTable} tables={tables} />}
      {activeTab === 'impact' && <ImpactTab selectedTable={selectedTable} />}
      {activeTab === 'suggestions' && <SuggestionsTab selectedTable={selectedTable} tables={tables} />}
      {activeTab === 'docs' && <DocsTab selectedTable={selectedTable} />}

      {activeTab !== 'overview' && activeTab !== 'columns' && activeTab !== 'keys' && activeTab !== 'relationships' && activeTab !== 'health' && activeTab !== 'impact' && activeTab !== 'suggestions' && activeTab !== 'docs' && (
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
