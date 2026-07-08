import { parsePostgresSql } from './parser';
import { convertPostgresAstToSchema } from './converter';
import type { TableData } from '../../../types/schema';

export async function processPostgresSchema(sql: string): Promise<TableData[]> {
  const ast = await parsePostgresSql(sql);
  return convertPostgresAstToSchema(ast);
}
