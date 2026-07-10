import type { TableData, ForeignKey } from '../../../types/schema';

// Normalize astify output to always be an array
function normalizeAst(ast: any): any[] {
  if (!ast) return [];
  return Array.isArray(ast) ? ast : [ast];
}

// Extract column names from definition array
function extractColumns(definition: any[]): string[] {
  if (!definition || !Array.isArray(definition)) return [];
  return definition.map(def => def.column).filter(Boolean);
}

export function convertSqliteAstToSchema(rawAst: any): TableData[] {
  const stmts = normalizeAst(rawAst);
  console.log(`[sqlite-converter] AST contains ${stmts.length} statements.`);

  const tablesMap: Record<string, TableData> = {};

  // PASS 1: Extract all tables, columns, and inline constraints
  for (const stmt of stmts) {
    if (stmt.type === 'create' && stmt.keyword === 'table') {
      const tableName = stmt.table?.[0]?.table;
      if (!tableName) continue;

      if (!tablesMap[tableName]) {
        tablesMap[tableName] = {
          name: tableName,
          columns: [],
          primaryKeys: [],
          uniqueKeys: [],
          foreignKeys: [],
          indexes: []
        };
      }
      const tableData = tablesMap[tableName];

      const definitions = stmt.create_definitions || [];
      for (const def of definitions) {
        if (def.resource === 'column') {
          const colName = def.column?.column;
          let colType = def.definition?.dataType || 'unknown';
          
          if (colName) {
            tableData.columns.push({
              name: colName,
              type: colType
            });
          }

          // Inline constraints
          if (def.primary_key) {
            tableData.primaryKeys.push(colName);
          }
          if (def.unique) {
            tableData.uniqueKeys.push([colName]);
          }
          if (def.reference_definition) {
            const targetTable = def.reference_definition.table?.[0]?.table || '';
            const targetCols = extractColumns(def.reference_definition.definition);
            if (targetTable && targetCols.length > 0) {
              tableData.foreignKeys.push({
                columnNames: [colName],
                targetTable,
                targetColumnNames: targetCols
              });
            }
          }
        } else if (def.resource === 'constraint') {
          // Table-level constraints
          const cType = def.constraint_type?.toUpperCase();
          
          if (cType === 'PRIMARY KEY') {
            tableData.primaryKeys.push(...extractColumns(def.definition));
          } else if (cType === 'UNIQUE' || cType === 'UNIQUE KEY' || cType === 'UNIQUE INDEX') {
            tableData.uniqueKeys.push(extractColumns(def.definition));
          } else if (cType === 'FOREIGN KEY') {
            const sourceCols = extractColumns(def.definition);
            const targetTable = def.reference_definition?.table?.[0]?.table || '';
            const targetCols = extractColumns(def.reference_definition?.definition);
            
            if (sourceCols.length > 0 && targetTable && targetCols.length > 0) {
              tableData.foreignKeys.push({
                columnNames: sourceCols,
                targetTable,
                targetColumnNames: targetCols
              });
            }
          }
        }
      }
    }
  }

  // PASS 2: Extract ALTER TABLE constraints
  for (const stmt of stmts) {
    if (stmt.type === 'alter' && stmt.table?.[0]?.table) {
      const tableName = stmt.table[0].table;
      if (!tablesMap[tableName]) continue;
      const tableData = tablesMap[tableName];

      const exprs = stmt.expr || [];
      for (const expr of exprs) {
        if (expr.action === 'add' && expr.create_definitions?.resource === 'constraint') {
          const def = expr.create_definitions;
          const cType = def.constraint_type?.toUpperCase();
          
          if (cType === 'PRIMARY KEY') {
            tableData.primaryKeys.push(...extractColumns(def.definition));
          } else if (cType === 'UNIQUE' || cType === 'UNIQUE KEY' || cType === 'UNIQUE INDEX') {
            tableData.uniqueKeys.push(extractColumns(def.definition));
          } else if (cType === 'FOREIGN KEY') {
            const sourceCols = extractColumns(def.definition);
            const targetTable = def.reference_definition?.table?.[0]?.table || '';
            const targetCols = extractColumns(def.reference_definition?.definition);
            
            if (sourceCols.length > 0 && targetTable && targetCols.length > 0) {
              tableData.foreignKeys.push({
                columnNames: sourceCols,
                targetTable,
                targetColumnNames: targetCols
              });
            }
          }
        }
      }
    }
  }

  // PASS 3: Post-processing for cardinality
  const allTables = Object.values(tablesMap);
  for (const table of allTables) {
    // Detect Junction Table for m:n
    let isJunction = false;
    if (table.foreignKeys.length === 2 && table.primaryKeys.length > 0) {
      const fkCols = new Set([...table.foreignKeys[0].columnNames, ...table.foreignKeys[1].columnNames]);
      const pkCols = new Set(table.primaryKeys);
      if (fkCols.size === pkCols.size && [...fkCols].every(c => pkCols.has(c))) {
        isJunction = true;
      }
    }

    for (const fk of table.foreignKeys) {
      if (isJunction) {
        fk.relationType = 'm:n';
        continue;
      }

      // Check if 1:1
      let isOneToOne = false;
      const fkColSet = new Set(fk.columnNames);
      
      // Match PK?
      if (table.primaryKeys.length === fk.columnNames.length && table.primaryKeys.every(c => fkColSet.has(c))) {
        isOneToOne = true;
      }
      
      // Match UNIQUE?
      if (!isOneToOne) {
        for (const uk of table.uniqueKeys) {
          if (uk.length === fk.columnNames.length && uk.every(c => fkColSet.has(c))) {
            isOneToOne = true;
            break;
          }
        }
      }

      if (isOneToOne) {
        fk.relationType = '1:1';
      } else {
        fk.relationType = 'n:1';
      }
    }
  }

  return allTables;
}
