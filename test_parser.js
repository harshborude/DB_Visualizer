import Module from 'pg-query-emscripten';

async function run() {
  const pgQuery = await new Module();
  const sql = "CREATE TABLE users (id int);";
  const result = pgQuery.parse(sql);
  console.log("Type of parse_tree:", typeof result.parse_tree);
  console.log(result.parse_tree);
}

run().catch(console.error);
