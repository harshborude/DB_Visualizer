import { Handle, Position } from 'reactflow';
import type { TableData } from '../../types/schema';

export function TableNode({ data }: { data: { table: TableData, tableId?: string, isHovered?: boolean, isConnected?: boolean, isFaded?: boolean, isImplicitView?: boolean, isQueryBuilderMode?: boolean, selectedColumns?: string[], isTableSelected?: boolean, onToggleColumn?: (tId: string, c: string) => void, onToggleTable?: (tId: string, baseName: string) => void, isMobile?: boolean, isIsolatedMode?: boolean } }) {
  const { table, tableId = table.name, isHovered, isConnected, isFaded, isImplicitView, isQueryBuilderMode, selectedColumns = [], isTableSelected = false, onToggleColumn, onToggleTable, isMobile, isIsolatedMode } = data;
  
  const isCollapsed = isMobile && !isIsolatedMode;
  
  let glowStyle = '0 4px 15px rgba(0,0,0,0.5)'; // default dark shadow
  let borderColor = '#475569'; // lighter slate-600 border so it stands out
  
  if (isTableSelected) {
    glowStyle = '0 0 25px rgba(255, 255, 255, 0.6)'; // Permanent white glow
    borderColor = '#ffffff'; // white border
  } else if (isImplicitView) {
    glowStyle = '0 0 25px rgba(248, 250, 252, 0.4)'; // White glow
    borderColor = '#f8fafc'; // slate-50
  } else if (isHovered) {
    glowStyle = '0 0 25px rgba(56, 189, 248, 0.6)'; // Sky Blue glow
    borderColor = '#38bdf8'; // sky-400
  } else if (isConnected) {
    glowStyle = '0 0 20px rgba(6, 182, 212, 0.4)'; // Cyan glow
    borderColor = '#06b6d4'; // cyan-500
  }

  return (
    <div style={{ 
      border: `2px solid ${borderColor}`, 
      borderRadius: '12px', 
      padding: '1.25rem', 
      minWidth: '280px', 
      backgroundColor: '#1e293b', // slate-800, lighter than before
      boxShadow: glowStyle,
      opacity: isFaded ? 0.3 : 1,
      transition: 'box-shadow 0.3s ease, border-color 0.3s ease, opacity 0.3s ease',
      color: '#f8fafc',
    }}>
      <Handle type="target" position={Position.Left} style={{ background: '#38bdf8', width: '8px', height: '8px', border: 'none' }} />
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: isCollapsed ? '0' : '0 0 1.25rem 0', paddingBottom: isCollapsed ? '0' : '1rem', borderBottom: isCollapsed ? 'none' : '2px dotted #334155' }}>
        {isQueryBuilderMode && (
          <input 
            type="checkbox" 
            checked={isTableSelected}
            onChange={() => onToggleTable?.(tableId, table.name)}
            style={{ marginRight: '1rem', transform: 'scale(1.8)', cursor: 'pointer', accentColor: '#38bdf8' }}
          />
        )}
        <h3 style={{ margin: 0, color: '#f1f5f9', fontSize: '1.4rem', letterSpacing: '0.025em', textAlign: 'center' }}>
          {tableId !== table.name ? tableId : table.name}
        </h3>
      </div>
      
      {!isCollapsed && (
        <ul style={{ paddingLeft: '0', margin: '0', listStyleType: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {table.columns.map(col => {
          const isPrimaryKey = table.primaryKeys?.includes(col.name)
          const isExplicitIndex = table.indexes?.some(idxCols => idxCols.includes(col.name))
          return (
            <li key={col.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
              <Handle type="target" position={Position.Left} id={`${col.name}-left-target`} style={{ left: '-1.25rem', opacity: 0 }} />
              <Handle type="source" position={Position.Left} id={`${col.name}-left-source`} style={{ left: '-1.25rem', opacity: 0 }} />
              <Handle type="target" position={Position.Right} id={`${col.name}-right-target`} style={{ right: '-1.25rem', opacity: 0 }} />
              <Handle type="source" position={Position.Right} id={`${col.name}-right-source`} style={{ right: '-1.25rem', opacity: 0 }} />
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {isQueryBuilderMode && (
                  <input 
                    type="checkbox" 
                    checked={selectedColumns.includes(col.name)}
                    onChange={() => onToggleColumn?.(tableId, col.name)}
                    style={{ marginRight: '0.75rem', transform: 'scale(1.4)', cursor: 'pointer', accentColor: '#38bdf8' }}
                  />
                )}
                <strong style={{ color: '#f8fafc', fontWeight: '500' }}>{col.name}</strong> 
                <span style={{ color: '#94a3b8', marginLeft: '0.5rem', fontSize: '0.85em', fontFamily: 'monospace' }}>{col.type}</span>
              </div>
              <div>
                {isExplicitIndex && (
                  <span title="Indexed Column" className="index-badge" style={{ 
                    marginLeft: '0.5rem', 
                    fontSize: '0.7rem', 
                    fontWeight: '600', 
                    padding: '2px 6px',
                    borderRadius: '4px',
                    letterSpacing: '0.05em',
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    color: '#34d399',
                    border: '1px solid rgba(16, 185, 129, 0.3)'
                  }}>IDX</span>
                )}
                {isPrimaryKey && (
                  <span title="Primary Key" className="primary-badge" style={{ 
                    marginLeft: '0.5rem', 
                    fontSize: '0.7rem', 
                    fontWeight: '600', 
                    padding: '2px 6px',
                    borderRadius: '4px',
                    letterSpacing: '0.05em'
                  }}>P.K</span>
                )}
              </div>
            </li>
          )
        })}
        </ul>
      )}

      {!isCollapsed && table.foreignKeys && table.foreignKeys.length > 0 && (
        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '2px dotted #334155' }}>
          <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Relationships</h4>
          <ul style={{ paddingLeft: '0', margin: '0', fontSize: '0.85rem', listStyleType: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {table.foreignKeys.map((fk, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="relationship-badge" style={{
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '0.7rem',
                  fontWeight: '600',
                  letterSpacing: '0.05em'
                }}>
                  {fk.relationType}
                </span>
                <span style={{ color: '#cbd5e1' }}>
                  <code style={{ color: '#e2e8f0', background: '#1e293b', padding: '2px 4px', borderRadius: '4px' }}>{fk.columnNames.join(', ')}</code> 
                  <span style={{ color: '#64748b', margin: '0 4px' }}>&rarr;</span> 
                  <code style={{ color: '#e2e8f0', background: '#1e293b', padding: '2px 4px', borderRadius: '4px' }}>{fk.targetTable}({fk.targetColumnNames.join(', ')})</code>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <Handle type="source" position={Position.Right} style={{ background: '#38bdf8', width: '8px', height: '8px', border: 'none' }} />
    </div>
  )
}
