import postgres from "postgres";

const ref = "veavfkjgtkbnggukzjds";
const pw = process.env.SUPABASE_DB_PASSWORD;
const configs = [
  { host: `db.${ref}.supabase.co`, port: 5432, user: "postgres", password: pw },
  {
    host: "aws-1-ap-northeast-1.pooler.supabase.com",
    port: 5432,
    user: `postgres.${ref}`,
    password: pw,
  },
  {
    host: "aws-1-ap-northeast-1.pooler.supabase.com",
    port: 6543,
    user: `postgres.${ref}`,
    password: pw,
  },
];

for (const c of configs) {
  const sql = postgres({
    ...c,
    database: "postgres",
    ssl: "require",
    max: 1,
    connect_timeout: 8,
  });
  try {
    await sql`select 1 as ok`;
    console.log("OK", c.host, c.port, c.user);
    await sql.end();
    process.exit(0);
  } catch (e) {
    console.log("FAIL", c.host, c.port, e.message.slice(0, 100));
    await sql.end().catch(() => undefined);
  }
}
process.exit(1);
