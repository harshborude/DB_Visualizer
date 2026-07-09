import { parsePostgresSql } from './postgresql/parser';
import { convertPostgresAstToSchema } from './postgresql/converter';
import { parseMySql } from './mysql/parser';
import { convertMySqlAstToSchema } from './mysql/converter';
import type { TableData } from '../../types/schema';

// Helper to guess dialect based on specific keywords
function guessDialect(sql: string): 'mysql' | 'postgres' {
  // Common MySQL specific tokens
  if (/ENGINE=[a-zA-Z0-9_]+/i.test(sql) || 
      /AUTO_INCREMENT/i.test(sql) || 
      /`.*?`/.test(sql) ||
      /\/\*!40101/.test(sql)) {
    return 'mysql';
  }
  
  // Default to postgres if no MySQL-specific syntax is found
  return 'postgres';
}

export async function processSchema(sql: string): Promise<TableData[]> {
  const dialect = guessDialect(sql);
  
  if (dialect === 'mysql') {
    try {
      console.log('[parser] Detected MySQL dialect. Using node-sql-parser.');
      const ast = await parseMySql(sql);
      return convertMySqlAstToSchema(ast);
    } catch (e) {
      console.warn('[parser] MySQL parser failed, falling back to Postgres parser...', e);
      // Fallback
      const pgAst = await parsePostgresSql(sql);
      return convertPostgresAstToSchema(pgAst);
    }
  } else {
    try {
      console.log('[parser] Detected Postgres dialect. Using pg-query-emscripten.');
      const pgAst = await parsePostgresSql(sql);
      return convertPostgresAstToSchema(pgAst);
    } catch (e) {
      console.warn('[parser] Postgres parser failed, falling back to MySQL parser...', e);
      // Fallback
      const ast = await parseMySql(sql);
      return convertMySqlAstToSchema(ast);
    }
  }
}
