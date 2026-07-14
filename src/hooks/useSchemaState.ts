import { useState, useEffect } from 'react';
import { processSchema } from '../parser/sql';
import { analyzeSchema, type AnalyzedTableData } from '../utils/graphAnalytics';
import { calculateRowSize } from '../utils/tableWeight';
import type { PathResult } from '../utils/pathfinder';

interface UseSchemaStateProps {
  onSchemaParsed?: () => void;
}

export function useSchemaState({ onSchemaParsed }: UseSchemaStateProps = {}) {
  const [tables, setTables] = useState<AnalyzedTableData[]>(() => {
    try {
      const saved = sessionStorage.getItem('erd-tables');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((t: any) => ({
          ...t,
          estimatedRowBytes: t.estimatedRowBytes ?? calculateRowSize(t.columns)
        }));
      }
      return [];
    } catch { return []; }
  });

  const [error, setError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [pathResult, setPathResult] = useState<PathResult | null>(null);
  const [selectedTable, setSelectedTable] = useState<AnalyzedTableData | null>(null);

  useEffect(() => {
    if (tables.length > 0) {
      sessionStorage.setItem('erd-tables', JSON.stringify(tables));
    } else {
      sessionStorage.removeItem('erd-tables');
      sessionStorage.removeItem('erd-positions');
    }
  }, [tables]);

  const processFile = async (file: File) => {
    setError(null);
    setIsParsing(true);

    try {
      const text = await file.text();
      const parsedTables = await processSchema(text);
      const analyzedTables = analyzeSchema(parsedTables);
      // Clear positions for new file
      sessionStorage.removeItem('erd-positions');
      sessionStorage.removeItem('erd-tables');
      setTables(analyzedTables);
      setSelectedTable(null);
      setPathResult(null);
      if (onSchemaParsed) onSchemaParsed();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while parsing the schema.");
    } finally {
      setIsParsing(false);
    }
  };

  return {
    tables,
    setTables,
    error,
    setError,
    isParsing,
    processFile,
    pathResult,
    setPathResult,
    selectedTable,
    setSelectedTable
  };
}
