import type { AnalyzedTableData } from '../../../utils/graphAnalytics';

interface RelationshipsTabProps {
  selectedTable: AnalyzedTableData;
  tables: AnalyzedTableData[];
}

export function RelationshipsTab({ selectedTable, tables }: RelationshipsTabProps) {
  // Outgoing dependencies are directly defined by this table's foreign keys.
  const outgoingFKs = selectedTable.foreignKeys || [];

  // Incoming dependencies are defined by OTHER tables having foreign keys pointing to THIS table.
  const incomingFKs: { sourceTable: string; sourceColumns: string[]; targetColumns: string[] }[] = [];
  
  tables.forEach(table => {
    table.foreignKeys?.forEach(fk => {
      if (fk.targetTable === selectedTable.name) {
        incomingFKs.push({
          sourceTable: table.name,
          sourceColumns: fk.columnNames,
          targetColumns: fk.targetColumnNames,
        });
      }
    });
  });

  const hasIncoming = incomingFKs.length > 0;
  const hasOutgoing = outgoingFKs.length > 0;

  if (!hasIncoming && !hasOutgoing) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', backgroundColor: '#1e293b', borderRadius: '12px', border: '1px dashed #475569' }}>
        This table is completely isolated. It has no relationships with any other tables.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Tables that depend on this table */}
      <div>
        <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"></path><path d="m19 12-7 7-7-7"></path></svg>
          Incoming Dependencies (Tables depending on this)
        </h4>
        
        {hasIncoming ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {incomingFKs.map((fk, i) => (
              <div key={i} style={{ backgroundColor: '#1e293b', padding: '1rem', borderRadius: '8px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ color: '#38bdf8', fontWeight: 600, fontSize: '0.95rem' }}>{fk.sourceTable}</div>
                <div style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <code style={{ background: '#0f172a', padding: '4px 8px', borderRadius: '4px' }}>{fk.sourceColumns.join(', ')}</code>
                  <span style={{ color: '#64748b' }}>&rarr;</span>
                  <code style={{ background: '#0f172a', padding: '4px 8px', borderRadius: '4px' }}>{selectedTable.name}({fk.targetColumns.join(', ')})</code>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: '#94a3b8', fontSize: '0.9rem', fontStyle: 'italic' }}>No incoming dependencies. (This is a leaf table).</div>
        )}
      </div>

      {/* Tables that this table depends on */}
      <div>
        <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#0ea5e9', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5"></path><path d="m5 12 7-7 7 7"></path></svg>
          Outgoing Dependencies (Tables this relies on)
        </h4>
        
        {hasOutgoing ? (
           <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {outgoingFKs.map((fk, i) => (
              <div key={i} style={{ backgroundColor: '#1e293b', padding: '1rem', borderRadius: '8px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ color: '#0ea5e9', fontWeight: 600, fontSize: '0.95rem' }}>{fk.targetTable}</div>
                <div style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <code style={{ background: '#0f172a', padding: '4px 8px', borderRadius: '4px' }}>{fk.columnNames.join(', ')}</code>
                  <span style={{ color: '#64748b' }}>&rarr;</span>
                  <code style={{ background: '#0f172a', padding: '4px 8px', borderRadius: '4px' }}>{fk.targetTable}({fk.targetColumnNames.join(', ')})</code>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: '#94a3b8', fontSize: '0.9rem', fontStyle: 'italic' }}>No outgoing dependencies. (This is a root table).</div>
        )}
      </div>
    </div>
  );
}
