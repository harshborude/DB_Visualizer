import type { TableData, ForeignKey } from '../../../types/schema';

// Helper to safely get string values from AST nodes
function extractStringValues(nodes: any[]): string[] {
  if (!nodes || !Array.isArray(nodes)) return [];
  return nodes
    .map(node => node?.String?.sval)
    .filter(val => val !== undefined && val !== null);
}

export function convertPostgresAstToSchema(ast: any): TableData[] {
  const stmts = ast?.stmts || []
  console.log(`[converter] AST contains ${stmts.length} statements.`)

  const tablesMap: Record<string, TableData> = {}
  
  // PASS 1: Extract all tables and inline constraints
  for (const item of stmts) {
    const rawStmt = item.stmt
    if (!rawStmt) continue

    if (rawStmt.CreateStmt) {
      const createStmt = rawStmt.CreateStmt
      const tableName = createStmt.relation?.relname
      if (!tableName) continue
      
      const tableData: TableData = {
        name: tableName,
        columns: [],
        primaryKeys: [],
        uniqueKeys: [],
        foreignKeys: [],
        indexes: []
      }
      
      for (const tableElt of createStmt.tableElts || []) {
        if (tableElt.ColumnDef) {
          const colDef = tableElt.ColumnDef
          const colName = colDef.colname
          
          let colType = "unknown"
          if (colDef.typeName?.names) {
            const nameParts = extractStringValues(colDef.typeName.names)
            if (nameParts.length > 0) colType = nameParts.join(".")
          }
          
          tableData.columns.push({
            name: colName,
            type: colType
          })
          
          // Inline column constraints (e.g., PRIMARY KEY or UNIQUE on column)
          for (const constraintNode of colDef.constraints || []) {
            const constraint = constraintNode.Constraint
            if (constraint?.contype === 'CONSTR_PRIMARY') {
              tableData.primaryKeys.push(colName)
            } else if (constraint?.contype === 'CONSTR_UNIQUE') {
              tableData.uniqueKeys.push([colName])
            } else if (constraint?.contype === 'CONSTR_FOREIGN') {
              tableData.foreignKeys.push({
                columnNames: [colName],
                targetTable: constraint.pktable?.relname || '',
                targetColumnNames: extractStringValues(constraint.pk_attrs)
              })
            }
          }
        } else if (tableElt.Constraint) {
          // Table-level constraints inside CREATE TABLE
          const constraint = tableElt.Constraint
          if (constraint.contype === 'CONSTR_PRIMARY') {
            tableData.primaryKeys.push(...extractStringValues(constraint.keys))
          } else if (constraint.contype === 'CONSTR_UNIQUE') {
            tableData.uniqueKeys.push(extractStringValues(constraint.keys))
          } else if (constraint.contype === 'CONSTR_FOREIGN') {
            tableData.foreignKeys.push({
              columnNames: extractStringValues(constraint.fk_attrs),
              targetTable: constraint.pktable?.relname || '',
              targetColumnNames: extractStringValues(constraint.pk_attrs)
            })
          }
        }
      }
      
      tablesMap[tableName] = tableData
    }
  }

  // PASS 2: Extract ALTER TABLE constraints
  for (const item of stmts) {
    const rawStmt = item.stmt
    if (!rawStmt) continue

    if (rawStmt.AlterTableStmt) {
      const alterStmt = rawStmt.AlterTableStmt
      const tableName = alterStmt.relation?.relname
      if (!tableName || !tablesMap[tableName]) continue
      
      for (const cmdNode of alterStmt.cmds || []) {
        const cmd = cmdNode.AlterTableCmd
        // AT_AddConstraint means adding a constraint
        if (cmd?.subtype === 'AT_AddConstraint' && cmd.def?.Constraint) {
          const constraint = cmd.def.Constraint
          
          if (constraint.contype === 'CONSTR_PRIMARY') {
            tablesMap[tableName].primaryKeys.push(...extractStringValues(constraint.keys))
          } else if (constraint.contype === 'CONSTR_UNIQUE') {
            tablesMap[tableName].uniqueKeys.push(extractStringValues(constraint.keys))
          } else if (constraint.contype === 'CONSTR_FOREIGN') {
            tablesMap[tableName].foreignKeys.push({
              columnNames: extractStringValues(constraint.fk_attrs),
              targetTable: constraint.pktable?.relname || '',
              targetColumnNames: extractStringValues(constraint.pk_attrs)
            })
          }
        }
      }
    }
  }

  // PASS 2.5: Extract Explicit Indexes (CREATE INDEX)
  for (const item of stmts) {
    const rawStmt = item.stmt
    if (!rawStmt) continue

    if (rawStmt.IndexStmt) {
      const idxStmt = rawStmt.IndexStmt
      const tableName = idxStmt.relation?.relname
      if (!tableName || !tablesMap[tableName]) continue

      const indexCols: string[] = []
      for (const param of idxStmt.indexParams || []) {
        if (param.IndexElem?.name) {
          indexCols.push(param.IndexElem.name)
        }
      }

      if (indexCols.length > 0) {
        tablesMap[tableName].indexes.push(indexCols)
      }
    }
  }

  // PASS 3: Post-processing to infer relation types (Cardinality)
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

  return allTables
}
