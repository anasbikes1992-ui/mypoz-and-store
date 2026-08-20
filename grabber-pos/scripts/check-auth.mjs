/**
 * Production Supabase auth + schema audit (read-only).
 * Usage: SUPABASE_PROJECT_REF=veavfkjgtkbnggukzjds node --env-file=.env.local scripts/check-auth.mjs
 */
import postgres from "postgres";

const ref = process.env.SUPABASE_PROJECT_REF || "veavfkjgtkbnggukzjds";
const password = process.env.SUPABASE_DB_PASSWORD;
if (!password) {
  console.error("Missing SUPABASE_DB_PASSWORD");
  process.exit(1);
}

const sql = postgres({
  host: `db.${ref}.supabase.co`,
  port: 5432,
  database: "postgres",
  username: "postgres",
  password,
  ssl: "require",
  max: 1,
  connect_timeout: 20,
});

try {
  const tables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `;

  const [{ users }] = await sql`SELECT count(*)::int AS users FROM auth.users`;
  const [{ profiles }] = await sql`SELECT count(*)::int AS profiles FROM profiles`;
  const owners = await sql`
    SELECT role, count(*)::int AS n
    FROM profiles
    GROUP BY role
    ORDER BY role
  `;

  const rls = await sql`
    SELECT tablename, rowsecurity
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN ('profiles', 'app_documents', 'app_collections')
    ORDER BY tablename
  `;

  const policies = await sql`
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('profiles', 'app_documents', 'app_collections')
    ORDER BY tablename, policyname
  `;

  const migrationTable = await sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'supabase_migrations'
        AND table_name = 'schema_migrations'
    ) AS exists
  `;

  let migrationRows = [];
  if (migrationTable[0]?.exists) {
    migrationRows = await sql`
      SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version
    `;
  }

  console.log(
    JSON.stringify(
      {
        project: ref,
        publicTables: tables.map((t) => t.table_name),
        authUsers: users,
        profiles,
        profilesByRole: owners,
        rlsEnabled: rls,
        policies,
        trackedMigrations: migrationRows,
      },
      null,
      2,
    ),
  );
} finally {
  await sql.end({ timeout: 3 });
}
