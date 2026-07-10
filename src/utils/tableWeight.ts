import type { ColumnData } from '../types/schema';

/**
 * Common data type storage sizes in bytes.
 * These are approximations and averages (especially for var-length fields).
 */
const DATA_TYPE_WEIGHTS: Record<string, number> = {
  // Integers
  'tinyint': 1,
  'smallint': 2,
  'mediumint': 3,
  'int': 4,
  'integer': 4,
  'bigint': 8,
  // Postgres aliases
  'int2': 2,
  'int4': 4,
  'int8': 8,

  // Floating point
  'float': 4,
  'real': 4,
  'double': 8,
  'float4': 4,
  'float8': 8,
  'double precision': 8,
  'decimal': 8, // Varies heavily, assuming 8 bytes avg
  'numeric': 8,

  // Strings (approximating realistic average bytes, rather than theoretical max capacities)
  'char': 255,
  'varchar': 255,
  'text': 256,       // ~256 bytes avg
  'mediumtext': 1024, // ~1KB avg
  'longtext': 4096,   // ~4KB avg
  
  // Dates and Times
  'date': 3,
  'time': 3,
  'datetime': 8,
  'timestamp': 8,
  'year': 1,

  // Others
  'boolean': 1,
  'bool': 1,
  'uuid': 16,
  'json': 1024, // Assuming 1KB avg for JSON
  'jsonb': 1024,
  'blob': 4096, // ~4KB avg
};

/**
 * Extracts a base data type and length if specified (e.g. "varchar(255)" -> base: "varchar", length: 255)
 */
function parseType(typeString: string): { baseType: string; length?: number } {
  let normalized = typeString.toLowerCase().trim();
  
  // Strip off schema prefixes (e.g. "pg_catalog.varchar" -> "varchar")
  if (normalized.includes('.')) {
    normalized = normalized.split('.').pop() || normalized;
  }

  // Match the base type (allowing numbers/underscores like int4) and optional length
  const match = normalized.match(/^([a-z0-9_]+)\s*(?:\((\d+)\))?/);
  
  if (!match) return { baseType: normalized };

  const [, baseType, lengthStr] = match;
  return { 
    baseType, 
    length: lengthStr ? parseInt(lengthStr, 10) : undefined 
  };
}

/**
 * Calculates the estimated row size in bytes for a given array of columns.
 */
export function calculateRowSize(columns: ColumnData[]): number {
  let totalBytes = 0;

  columns.forEach(col => {
    const { baseType, length } = parseType(col.type);

    if (baseType === 'varchar' || baseType === 'char') {
      // For estimation, char is fixed length. varchar is variable, so we estimate average use is 50% of max length.
      const maxLen = length || DATA_TYPE_WEIGHTS[baseType] || 255;
      totalBytes += baseType === 'varchar' ? Math.ceil(maxLen / 2) : maxLen;
    } else {
      totalBytes += DATA_TYPE_WEIGHTS[baseType] || 8; // Default fallback weight
    }
  });

  return totalBytes;
}
