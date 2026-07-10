import { useState } from 'react';
import type { PathResult } from '../../utils/pathfinder';
import type { AnalyzedTableData } from '../../utils/graphAnalytics';

interface PathfinderSQLPanelProps {
  pathResult: PathResult;
  tables: AnalyzedTableData[];
  onClose: () => void;
}

function getPathSemantics(edges: PathResult['edges']): { title: string; description: string } {
  if (edges.length === 1) {
    return {
      title: 'Direct Relationship',
      description: edges[0].direction === 'forward' 
        ? `${edges[0].fromTable} directly references ${edges[0].toTable}.`
        : `${edges[0].toTable} directly references ${edges[0].fromTable}.`
    };
  }

  if (edges.length === 2) {
    const d1 = edges[0].direction;
    const d2 = edges[1].direction;

    if (d1 === 'forward' && d2 === 'backward') {
      return {
        title: 'Shared Parent',
        description: `Both ${edges[0].fromTable} and ${edges[1].toTable} reference ${edges[0].toTable}. They are not directly related.`
      };
    }
    if (d1 === 'backward' && d2 === 'forward') {
      return {
        title: 'Junction / Shared Child',
        description: `${edges[0].toTable} acts as a junction, referencing both ${edges[0].fromTable} and ${edges[1].toTable}.`
      };
    }
    if (d1 === 'forward' && d2 === 'forward') {
      return {
        title: 'Transitive Relationship',
        description: `${edges[0].fromTable} references ${edges[0].toTable}, which references ${edges[1].toTable}.`
      };
    }
    if (d1 === 'backward' && d2 === 'backward') {
      return {
        title: 'Transitive Relationship',
        description: `${edges[1].toTable} references ${edges[1].fromTable}, which references ${edges[0].fromTable}.`
      };
    }
  }

  return {
    title: 'Complex Path',
    description: `A ${edges.length}-step relationship joining across multiple tables.`
  };
}

function getQueryResultDescription(edges: PathResult['edges'], pathTables: string[], allTables: AnalyzedTableData[]): string {
  let description = `This query returns:\n\n`;

  pathTables.forEach(tableName => {
    const tableData = allTables.find(t => t.name === tableName);
    if (tableData) {
      const colNames = tableData.columns.map(c => c.name).join(', ');
      description += `• ${tableName.charAt(0).toUpperCase() + tableName.slice(1)} information\n`;
      description += `  (Columns: ${colNames})\n\n`;
    }
  });
  if (edges.length === 1) {
    description += `for records where ${edges[0].fromTable} directly references ${edges[0].toTable}.`;
  } else if (edges.length === 2) {
    const d1 = edges[0].direction;
    const d2 = edges[1].direction;

    if (d1 === 'forward' && d2 === 'backward') {
      description += `for records where both ${edges[0].fromTable} and ${edges[1].toTable} reference the same ${edges[0].toTable}.`;
    } else if (d1 === 'backward' && d2 === 'forward') {
      description += `for records mapped together by the junction table ${edges[0].toTable}.`;
    } else {
      description += `for records matching the relationship path across these tables.`;
    }
  } else {
    description += `for records matching the complex join condition across these tables.`;
  }

  return description;
}

export function PathfinderSQLPanel({ pathResult, tables, onClose }: PathfinderSQLPanelProps) {
  const [copied, setCopied] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'sql' | 'result'>('sql');

  const handleCopy = () => {
    navigator.clipboard.writeText(pathResult.sqlQuery);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!pathResult || !pathResult.found || !pathResult.sqlQuery) return null;

  const semantics = getPathSemantics(pathResult.edges);
  const queryResultDesc = getQueryResultDescription(pathResult.edges, pathResult.tables, tables);

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
        
        <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #334155', flex: 1, marginRight: '1rem' }}>
          <button
            onClick={() => setActiveTab('sql')}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'sql' ? '2px solid #38bdf8' : '2px solid transparent',
              color: activeTab === 'sql' ? '#38bdf8' : '#94a3b8',
              cursor: 'pointer',
              padding: '0.5rem 0',
              fontSize: '0.9rem',
              fontWeight: 600,
              transition: 'all 0.2s'
            }}
          >
            SQL Query
          </button>
          <button
            onClick={() => setActiveTab('result')}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'result' ? '2px solid #38bdf8' : '2px solid transparent',
              color: activeTab === 'result' ? '#38bdf8' : '#94a3b8',
              cursor: 'pointer',
              padding: '0.5rem 0',
              fontSize: '0.9rem',
              fontWeight: 600,
              transition: 'all 0.2s'
            }}
          >
            Query Result
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {activeTab === 'sql' && (
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
          )}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? "Expand Panel" : "Collapse Panel"}
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
        <>
          {activeTab === 'sql' ? (
            <>
              <div style={{
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1rem'
              }}>
                <div style={{ color: '#38bdf8', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                  Relationship Type
                </div>
                <div style={{ color: '#f8fafc', fontWeight: 500, marginBottom: '0.25rem' }}>
                  {semantics.title}
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                  {semantics.description}
                </div>
                
                <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.85rem', color: '#cbd5e1', flexWrap: 'wrap' }}>
                  {pathResult.edges.map((edge, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {idx > 0 && <span style={{ color: '#64748b' }}>•</span>}
                      <span>{edge.fromTable}</span>
                      <span style={{ color: '#38bdf8' }}>
                        {edge.direction === 'forward' ? '→' : '←'}
                      </span>
                      <span>{edge.toTable}</span>
                    </div>
                  ))}
                </div>
              </div>
              
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
                  <code>{pathResult.sqlQuery}</code>
                </pre>
              </div>
            </>
          ) : (
            <div style={{
              backgroundColor: '#0f172a',
              padding: '1rem',
              borderRadius: '8px',
              border: '1px solid #1e293b',
              overflowX: 'auto',
              maxHeight: '40vh',
              overflowY: 'auto',
              color: '#f8fafc'
            }}>
              <div style={{ marginBottom: '1rem', color: '#cbd5e1', fontSize: '0.9rem' }}>
                This query returns the following columns:
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    {pathResult.tables.flatMap(tableName => {
                      const tableData = tables.find(t => t.name === tableName);
                      return tableData ? tableData.columns.map(c => ({ table: tableName, column: c.name })) : [];
                    }).map((col, idx) => (
                      <th key={idx} style={{ 
                        padding: '0.75rem', 
                        borderBottom: '1px solid #334155',
                        backgroundColor: 'rgba(56, 189, 248, 0.1)',
                        borderRight: '1px solid #1e293b',
                        color: '#38bdf8',
                        fontWeight: 600,
                        whiteSpace: 'nowrap'
                      }}>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 'normal', marginBottom: '0.25rem', textTransform: 'uppercase' }}>{col.table}</div>
                        {col.column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3].map(rowIdx => (
                    <tr key={rowIdx} style={{ borderBottom: '1px solid #1e293b' }}>
                      {pathResult.tables.flatMap(tableName => {
                        const tableData = tables.find(t => t.name === tableName);
                        return tableData ? tableData.columns.map(c => c.name) : [];
                      }).map((_, idx) => (
                        <td key={idx} style={{ padding: '0.75rem', borderRight: '1px solid #1e293b', color: '#64748b' }}>...</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
