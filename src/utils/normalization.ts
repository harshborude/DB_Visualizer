import type { AnalyzedTableData, GraphMetrics } from './graphAnalytics';
import type { TableData, ColumnData, ForeignKey } from '../types/schema';

export type SuggestionType = '1NF' | 'LOOKUP' | 'WIDE_TABLE' | 'REDUNDANT_FK';

export interface NormalizationSuggestion {
  type: SuggestionType;
  title: string;
  description: string;
  columns?: string[];
  penaltyScore: number; // 1 to 10 scale representing how bad this is for health
}

export function generateNormalizationSuggestions(
  table: AnalyzedTableData,
  allTables: AnalyzedTableData[]
): NormalizationSuggestion[] {
  const suggestions: NormalizationSuggestion[] = [];

  // 1. Check for Wide Tables (God Tables)
  if (table.columns.length > 20) {
    suggestions.push({
      type: 'WIDE_TABLE',
      title: 'Extremely Wide Table',
      description: `This table has ${table.columns.length} columns. Consider splitting it into smaller, logically grouped tables (e.g., separating core data from optional settings or profiles) to improve performance and maintainability.`,
      penaltyScore: 6
    });
  }

  // 2. 1NF: Check for repeating groups (e.g., phone1, phone2, phone3)
  const prefixGroups = new Map<string, string[]>();
  const repeatingGroupRegex = /^(.*?)_?([0-9]+)$/i;

  table.columns.forEach(col => {
    const match = col.name.match(repeatingGroupRegex);
    if (match) {
      const prefix = match[1].toLowerCase();
      if (!prefixGroups.has(prefix)) prefixGroups.set(prefix, []);
      prefixGroups.get(prefix)!.push(col.name);
    }
  });

  prefixGroups.forEach((cols, prefix) => {
    if (cols.length > 1) {
      suggestions.push({
        type: '1NF',
        title: 'First Normal Form (1NF) Violation',
        description: `Repeating groups detected (${cols.join(', ')}). Extract these into a separate one-to-many child table (e.g., '${prefix}s') to allow an arbitrary number of entries.`,
        columns: cols,
        penaltyScore: 8
      });
    }
  });



  // 4. Lookup Tables: ENUM / Status extraction
  const lookupKeywords = ['status', 'type', 'category', 'role', 'state', 'priority'];
  const textTypes = ['varchar', 'text', 'string', 'char'];
  
  const lookupColumns = table.columns.filter(col => {
    const colNameLower = col.name.toLowerCase();
    const isText = textTypes.some(t => col.type.toLowerCase().includes(t));
    const hasKeyword = lookupKeywords.some(k => colNameLower === k || colNameLower.endsWith(`_${k}`));
    
    // If it's a foreign key, it's already a lookup table! Ignore.
    const isFk = table.foreignKeys.some(fk => fk.columnNames.includes(col.name));
    
    return isText && hasKeyword && !isFk;
  });

  lookupColumns.forEach(col => {
    suggestions.push({
      type: 'LOOKUP',
      title: 'Extract to Lookup Table',
      description: `Column '${col.name}' appears to store categorical text data. Consider extracting it into a lookup table or using an ENUM to enforce data integrity and save storage.`,
      columns: [col.name],
      penaltyScore: 3
    });
  });

  // 5. Redundant Relationships (Triangle Dependencies)
  // If Table A -> C, and A -> B -> C. Then A -> C might be redundant.
  table.foreignKeys.forEach(directFk => {
    const targetC = directFk.targetTable;
    
    // Look at all other FKs in this table to see if they lead to C indirectly
    table.foreignKeys.forEach(otherFk => {
      const targetB = otherFk.targetTable;
      if (targetB === targetC) return; // Same direct target, ignore

      // Find targetB in all tables
      const tableB = allTables.find(t => t.name === targetB);
      if (tableB) {
        // Does Table B have an FK to Table C?
        const bToC = tableB.foreignKeys.some(fk => fk.targetTable === targetC);
        if (bToC) {
          suggestions.push({
            type: 'REDUNDANT_FK',
            title: 'Potential Redundant Relationship',
            description: `Direct relationship to '${targetC}' via (${directFk.columnNames.join(', ')}) might be redundant, because you can already reach '${targetC}' indirectly through '${targetB}'.`,
            columns: directFk.columnNames,
            penaltyScore: 4
          });
        }
      }
    });
  });

  // Sort by penalty score (highest first)
  return suggestions.sort((a, b) => b.penaltyScore - a.penaltyScore);
}

/**
 * Calculates an overall health score (0-100) based on metrics and normalization penalties.
 */
export function calculateTableHealthScore(
  table: AnalyzedTableData,
  suggestions: NormalizationSuggestion[]
): number {
  let score = 100;

  // Base deductions from graph analytics
  if (!table.primaryKeys || table.primaryKeys.length === 0) score -= 25;
  if (table.metrics.partOfCycle) score -= 15;
  if (table.metrics.isIsolated) score -= 5;

  // Deductions from normalization heuristics
  const totalPenalty = suggestions.reduce((sum, s) => sum + s.penaltyScore, 0);
  
  // Cap deductions so score doesn't go below 0
  score = Math.max(0, score - totalPenalty);

  return score;
}
