import type { AnalyzedTableData } from '../../../utils/graphAnalytics';

interface KeysTabProps {
  selectedTable: AnalyzedTableData;
}

export function KeysTab({ selectedTable }: KeysTabProps) {
  const hasPrimaryKeys = selectedTable.primaryKeys && selectedTable.primaryKeys.length > 0;
  const hasForeignKeys = selectedTable.foreignKeys && selectedTable.foreignKeys.length > 0;
  const hasUniqueKeys = selectedTable.uniqueKeys && selectedTable.uniqueKeys.length > 0;

  if (!hasPrimaryKeys && !hasForeignKeys && !hasUniqueKeys) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', backgroundColor: '#1e293b', borderRadius: '12px', border: '1px dashed #475569' }}>
        No keys defined for this table.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Primary Keys */}
      {hasPrimaryKeys && (
        <div>
          <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#06b6d4', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Primary Key
          </h4>
          <div style={{ backgroundColor: '#1e293b', padding: '1rem', borderRadius: '8px', border: '1px solid #334155' }}>
            <code style={{ color: '#f8fafc', background: '#0f172a', padding: '4px 8px', borderRadius: '4px', fontSize: '0.9rem' }}>
              {selectedTable.primaryKeys.join(', ')}
            </code>
          </div>
        </div>
      )}

      {/* Foreign Keys */}
      {hasForeignKeys && (
        <div>
          <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Foreign Keys
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {selectedTable.foreignKeys.map((fk, index) => (
              <div key={index} style={{ backgroundColor: '#1e293b', padding: '1rem', borderRadius: '8px', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <code style={{ color: '#f8fafc', background: '#0f172a', padding: '4px 8px', borderRadius: '4px' }}>{fk.columnNames.join(', ')}</code>
                  <span style={{ color: '#64748b' }}>&rarr; references</span>
                  <code style={{ color: '#f8fafc', background: '#0f172a', padding: '4px 8px', borderRadius: '4px' }}>{fk.targetTable}({fk.targetColumnNames.join(', ')})</code>
                </div>
                {fk.relationType && (
                   <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                     Relation Type: <strong style={{ color: '#cbd5e1' }}>{fk.relationType}</strong>
                   </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unique Keys */}
      {hasUniqueKeys && (
        <div>
          <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Unique Keys
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {selectedTable.uniqueKeys.map((uk, index) => (
              <div key={index} style={{ backgroundColor: '#1e293b', padding: '1rem', borderRadius: '8px', border: '1px solid #334155' }}>
                <code style={{ color: '#f8fafc', background: '#0f172a', padding: '4px 8px', borderRadius: '4px', fontSize: '0.9rem' }}>
                  {uk.join(', ')}
                </code>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
