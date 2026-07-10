import pgquery from "pg-query-emscripten";
import { convertPostgresAstToSchema } from "./src/parser/sql/postgresql/converter.ts";

const sql = `
CREATE TABLE store (
  store_id INT PRIMARY KEY
);

CREATE TABLE customer (
  customer_id INT PRIMARY KEY,
  store_id INT,
  CONSTRAINT fk_store FOREIGN KEY (store_id) REFERENCES store(store_id)
);
`;

const res = pgquery.parse(sql);
const ast = JSON.parse(res.parse_tree);
console.log(JSON.stringify(convertPostgresAstToSchema(ast), null, 2));
