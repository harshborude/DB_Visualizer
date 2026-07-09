import type { AnalyzedTableData } from '../../../utils/graphAnalytics';
import { generateNormalizationSuggestions } from '../../../utils/normalization';

interface SuggestionsTabProps {
  selectedTable: AnalyzedTableData;
  tables: AnalyzedTableData[];
}

export function SuggestionsTab({ selectedTable, tables }: SuggestionsTabProps) {
  const suggestions = generateNormalizationSuggestions(selectedTable, tables);

  if (suggestions.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', backgroundColor: '#1e293b', borderRadius: '12px', border: '1px dashed #475569' }}>
        <h4 style={{ color: '#38bdf8', margin: '0 0 0.5rem 0' }}>Looking Good!</h4>
        No normalization issues or redundancies detected for this table.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
        AI-powered heuristics detected {suggestions.length} potential schema improvement{suggestions.length > 1 ? 's' : ''}.
      </p>
      
      {suggestions.map((suggestion, i) => (
        <div key={i} style={{ 
          backgroundColor: '#1e293b', 
          padding: '1.25rem', 
          borderRadius: '8px', 
          borderLeft: '4px solid #0ea5e9',
          borderTop: '1px solid #334155',
          borderRight: '1px solid #334155',
          borderBottom: '1px solid #334155',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <span style={{ 
              color: '#0ea5e9', 
              fontSize: '0.75rem', 
              fontWeight: 700, 
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              backgroundColor: 'rgba(14, 165, 233, 0.15)',
              padding: '2px 6px',
              borderRadius: '4px'
            }}>
              {suggestion.type}
            </span>
            <h4 style={{ margin: 0, fontSize: '1rem', color: '#f8fafc', fontWeight: 600 }}>{suggestion.title}</h4>
          </div>
          
          <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.9rem', lineHeight: 1.5 }}>
            {suggestion.description}
          </p>

          {suggestion.columns && suggestion.columns.length > 0 && (
            <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {suggestion.columns.map(col => (
                <code key={col} style={{ background: '#0f172a', color: '#f8fafc', padding: '2px 6px', borderRadius: '4px', fontSize: '0.85rem' }}>
                  {col}
                </code>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
