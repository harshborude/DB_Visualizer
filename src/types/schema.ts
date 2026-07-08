export type ColumnData = {
  name: string
  type: string
}

export type RelationType = '1:1' | '1:n' | 'n:1' | 'm:n';

export interface ForeignKey {
  columnNames: string[];
  targetTable: string;
  targetColumnNames: string[];
  relationType?: RelationType;
}

export type TableData = {
  name: string
  columns: ColumnData[]
  primaryKeys: string[]
  uniqueKeys: string[][]
  foreignKeys: ForeignKey[]
}
