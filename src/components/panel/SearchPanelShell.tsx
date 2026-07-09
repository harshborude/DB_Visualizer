import { useState, useMemo } from 'react';
import type { AnalyzedTableData } from '../../utils/graphAnalytics';

interface SearchPanelShellProps {
  tables: AnalyzedTableData[];
  selectedTable: AnalyzedTableData | null;
  onSelectTable: (table: AnalyzedTableData) => void;
  onHoverTable: (tableName: string | null) => void;
}

export function SearchPanelShell({ tables, selectedTable, onSelectTable, onHoverTable }: SearchPanelShellProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTables = useMemo(() => {
    let result = tables;
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      result = tables.filter(t => t.name.toLowerCase().includes(lowerQuery));
    }
    // Sort alphabetically by name
    return [...result].sort((a, b) => a.name.localeCompare(b.name));
  }, [tables, searchQuery]);

  return (
    <div style={{
      position: 'absolute',
      top: '73px', // Below the header
      left: 0,
      bottom: 0,
      width: '280px', // Thinner than DetailsPanelShell (400px)
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      backdropFilter: 'blur(16px)',
      borderRight: '1px solid #334155',
      boxShadow: '10px 0 25px rgba(0,0,0,0.5)',
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Search Header */}
      <div style={{ padding: '1.5rem', borderBottom: '1px solid #334155', flexShrink: 0 }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#f8fafc', fontWeight: 600, textAlign: 'center' }}>Tables</h3>
        <div style={{ position: 'relative' }}>
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="16" height="16" 
            viewBox="0 0 24 24" fill="none" stroke="#64748b" 
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            placeholder="Search tables..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '6px',
              padding: '0.6rem 0.6rem 0.6rem 2.2rem',
              color: '#f8fafc',
              fontSize: '0.9rem',
              outline: 'none',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = '#38bdf8'}
            onBlur={(e) => e.currentTarget.style.borderColor = '#334155'}
          />
        </div>
      </div>

      {/* Table List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {filteredTables.length > 0 ? (
          filteredTables.map(table => {
            const isSelected = selectedTable?.name === table.name;
            return (
              <div
                key={table.name}
                onClick={() => onSelectTable(table)}
                onMouseEnter={() => onHoverTable(table.name)}
                onMouseLeave={() => onHoverTable(null)}
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                  border: `1px solid ${isSelected ? '#0ea5e9' : 'transparent'}`,
                  borderRadius: '6px',
                  color: isSelected ? '#38bdf8' : '#cbd5e1',
                  cursor: 'pointer',
                  fontWeight: isSelected ? 600 : 400,
                  transition: 'all 0.15s ease',
                  fontSize: '0.9rem',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  textAlign: 'center'
                }}
                onMouseOver={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = '#1e293b';
                    e.currentTarget.style.color = '#f8fafc';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#cbd5e1';
                  }
                }}
              >
                {table.name}
              </div>
            );
          })
        ) : (
          <div style={{ color: '#64748b', textAlign: 'center', marginTop: '2rem', fontSize: '0.9rem' }}>
            No tables found.
          </div>
        )}
      </div>
    </div>
  );
}
