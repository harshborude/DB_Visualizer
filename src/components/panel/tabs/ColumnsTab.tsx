import type { AnalyzedTableData } from '../../../utils/graphAnalytics';

interface ColumnsTabProps {
  selectedTable: AnalyzedTableData;
}

export function ColumnsTab({ selectedTable }: ColumnsTabProps) {
  const isPrimaryKey = (colName: string) => selectedTable.primaryKeys.includes(colName);
  const isForeignKey = (colName: string) => selectedTable.foreignKeys.some(fk => fk.columnNames.includes(colName));
  const isUniqueKey = (colName: string) => selectedTable.uniqueKeys.some(uk => uk.includes(colName));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {selectedTable.columns.map((col, index) => (
        <div key={index} style={{
          backgroundColor: '#1e293b',
          padding: '1rem',
          borderRadius: '8px',
          border: '1px solid #334155',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ color: '#f8fafc', fontWeight: 500, fontSize: '0.95rem' }}>{col.name}</span>
            <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontFamily: 'monospace', backgroundColor: '#0f172a', padding: '4px 8px', borderRadius: '4px' }}>
              {col.type}
            </span>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {isPrimaryKey(col.name) && (
              <span className="primary-badge" style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }} title="Primary Key">
                PK
              </span>
            )}
            {isForeignKey(col.name) && (
              <span style={{ backgroundColor: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, border: '1px solid rgba(56, 189, 248, 0.3)' }} title="Foreign Key">
                FK
              </span>
            )}
            {isUniqueKey(col.name) && (
              <span style={{ backgroundColor: 'rgba(167, 139, 250, 0.2)', color: '#a78bfa', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, border: '1px solid rgba(167, 139, 250, 0.3)' }} title="Unique Key">
                UK
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
