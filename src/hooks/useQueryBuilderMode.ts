import { useState, useCallback, useEffect } from 'react';
import type { QueryBuilderState, QueryTable } from '../utils/queryBuilder';
import { findOptimalQuerySpanningTree } from '../utils/queryBuilder';
import type { AnalyzedTableData } from '../utils/graphAnalytics';

export function useQueryBuilderMode(tables: AnalyzedTableData[]) {
  const [isQueryBuilderMode, setIsQueryBuilderMode] = useState(false);
  const [queryBuilderState, setQueryBuilderState] = useState<QueryBuilderState>({
    tables: [],
    columns: [],
    filters: [],
    sorts: [],
    manualJoins: []
  });

  const [optimizedTableOrder, setOptimizedTableOrder] = useState<QueryTable[] | null>(null);
  const [alternateTableOrders, setAlternateTableOrders] = useState<QueryTable[][]>([]);

  useEffect(() => {
    if (queryBuilderState.tables.length > 2) {
      const result = findOptimalQuerySpanningTree(queryBuilderState.tables, tables, queryBuilderState.manualJoins);
      setOptimizedTableOrder(result.optimizedOrder);
      setAlternateTableOrders(result.alternateOrders);
    } else {
      setOptimizedTableOrder(null);
      setAlternateTableOrders([]);
    }
  }, [queryBuilderState.tables, queryBuilderState.manualJoins, tables]);

  const applyOptimizedPath = useCallback(() => {
    if (optimizedTableOrder) {
      setQueryBuilderState(prev => ({
        ...prev,
        tables: optimizedTableOrder
      }));
    }
  }, [optimizedTableOrder]);

  const cycleAlternatePath = useCallback(() => {
    if (alternateTableOrders.length > 0) {
      setQueryBuilderState(prev => ({
        ...prev,
        tables: alternateTableOrders[0]
      }));
    }
  }, [alternateTableOrders]);


  const handleToggleColumn = useCallback((tableId: string, columnName: string) => {
    setQueryBuilderState(prev => {
      const isSelected = prev.columns.some(c => c.tableId === tableId && c.columnName === columnName)
      let newColumns = prev.columns
      if (isSelected) {
        newColumns = prev.columns.filter(c => !(c.tableId === tableId && c.columnName === columnName))
      } else {
        newColumns = [...prev.columns, { tableId, columnName }]
      }

      let newTables = prev.tables;
      if (newColumns.length > prev.columns.length) {
         if (!newTables.some(t => t.id === tableId)) {
            newTables = [...newTables, { id: tableId, name: tableId }];
         }
      } else {
         const hasColumns = newColumns.some(c => c.tableId === tableId);
         const hasFilters = prev.filters.some(f => f.tableId === tableId);
         const hasSorts = prev.sorts.some(s => s.tableId === tableId);
         if (!hasColumns && !hasFilters && !hasSorts) {
            const table = newTables.find(t => t.id === tableId);
            // Only automatically remove base tables when fully unselected. Aliases must be explicitly removed.
            if (table && table.id === table.name) {
               newTables = newTables.filter(t => t.id !== tableId);
            }
         }
      }

      return {
        ...prev,
        columns: newColumns,
        tables: newTables
      }
    })
  }, []);

  const handleToggleTable = useCallback((tableId: string, baseTableName: string) => {
    setQueryBuilderState(prev => {
      const isSelected = prev.tables.some(t => t.id === tableId)
      let newTables = prev.tables
      let newColumns = prev.columns

      if (isSelected) {
        // Remove table and all its columns
        newTables = prev.tables.filter(t => t.id !== tableId)
        newColumns = prev.columns.filter(c => c.tableId !== tableId)
      } else {
        // Add table and all its columns
        newTables = [...prev.tables, { id: tableId, name: baseTableName }]
        const tableData = tables.find(t => t.name === baseTableName);
        if (tableData) {
          const existingCols = new Set(newColumns.filter(c => c.tableId === tableId).map(c => c.columnName));
          const colsToAdd = tableData.columns
            .filter(c => !existingCols.has(c.name))
            .map(c => ({ tableId, columnName: c.name }));
          newColumns = [...prev.columns, ...colsToAdd];
        }
      }

      return {
        ...prev,
        tables: newTables,
        columns: newColumns
      }
    })
  }, [tables]);

  return {
    isQueryBuilderMode,
    setIsQueryBuilderMode,
    queryBuilderState,
    setQueryBuilderState,
    handleToggleColumn,
    handleToggleTable,
    optimizedTableOrder,
    alternateTableOrders,
    applyOptimizedPath,
    cycleAlternatePath
  };
}
