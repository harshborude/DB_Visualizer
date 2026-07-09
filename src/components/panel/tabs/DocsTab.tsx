import { useState } from 'react';
import type { AnalyzedTableData } from '../../../utils/graphAnalytics';

interface DocsTabProps {
  selectedTable: AnalyzedTableData;
}

export function DocsTab({ selectedTable }: DocsTabProps) {
  const [copied, setCopied] = useState(false);

  const generateMarkdown = () => {
    let md = `## Table: \`${selectedTable.name}\`\n\n`;
    
    md += `### Columns\n`;
    md += `| Column Name | Data Type | Keys |\n`;
    md += `| :--- | :--- | :--- |\n`;
    
    selectedTable.columns.forEach(col => {
      let keyStr = '';
      if (selectedTable.primaryKeys?.includes(col.name)) keyStr = 'PK';
      
      const isFk = selectedTable.foreignKeys?.some(fk => fk.columnNames.includes(col.name));
      if (isFk) keyStr = keyStr ? `${keyStr}, FK` : 'FK';

      md += `| \`${col.name}\` | \`${col.type}\` | ${keyStr} |\n`;
    });

    if (selectedTable.foreignKeys && selectedTable.foreignKeys.length > 0) {
      md += `\n### Relationships (Foreign Keys)\n`;
      selectedTable.foreignKeys.forEach(fk => {
        md += `- \`${fk.columnNames.join(', ')}\` references \`${fk.targetTable}\`(\`${fk.targetColumnNames.join(', ')}\`)\n`;
      });
    }

    if (selectedTable.uniqueKeys && selectedTable.uniqueKeys.length > 0) {
      md += `\n### Unique Constraints\n`;
      selectedTable.uniqueKeys.forEach(uk => {
        md += `- \`${uk.join(', ')}\`\n`;
      });
    }

    return md;
  };

  const markdown = generateMarkdown();

  const handleCopy = () => {
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>
          Auto-generated markdown documentation for your wikis or READMEs.
        </p>
        <button 
          onClick={handleCopy}
          style={{
            backgroundColor: '#38bdf8',
            color: '#0f172a',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'background-color 0.2s',
            flexShrink: 0
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0ea5e9'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#38bdf8'}
        >
          {copied ? 'Copied!' : 'Copy Markdown'}
        </button>
      </div>

      <div style={{ backgroundColor: '#1e293b', padding: '1rem', borderRadius: '8px', border: '1px solid #334155' }}>
        <pre style={{
          backgroundColor: '#0f172a',
          padding: '1.25rem',
          borderRadius: '6px',
          border: '1px solid #1e293b',
          color: '#e2e8f0',
          overflowX: 'auto',
          fontSize: '0.85rem',
          fontFamily: 'monospace',
          lineHeight: 1.5,
          margin: 0
        }}>
          <code>{markdown}</code>
        </pre>
      </div>
    </div>
  );
}
