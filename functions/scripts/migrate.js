#!/usr/bin/env node
const { Pool } = require("pg");

function normalizeHost(h) {
  if (!h) return h;
  return h.replace(/^https?:\/\//, "");
}

async function main() {
  const host = normalizeHost(
    process.env.PG_HOST || process.env.POSTGRES_HOST || process.env.PGHOST
  );
  const user =
    process.env.PG_USER ||
    process.env.POSTGRES_USER ||
    process.env.PGUSER ||
    "postgres";
  const password =
    process.env.PG_PASSWORD ||
    process.env.POSTGRES_PASSWORD ||
    process.env.PGPASSWORD ||
    "";
  const database =
    process.env.PG_DB ||
    process.env.POSTGRES_DB ||
    process.env.PGDATABASE ||
    "postgres";
  const port = Number(
    process.env.PG_PORT ||
      process.env.POSTGRES_PORT ||
      process.env.PGPORT ||
      5432
  );

  console.log(
    "Connecting to Postgres at",
    host,
    "port",
    port,
    "db",
    database,
    "user",
    user ? user : "(none)"
  );

  // Try with SSL first, if server refuses SSL, retry without SSL
  const createPool = (useSsl) =>
    new Pool({
      host,
      user,
      password,
      database,
      port,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
    });

  let pool = createPool(true);
  try {
    const client = await pool.connect();
    try {
      console.log("Connected with SSL. Running migration...");
      await client.query(`CREATE TABLE IF NOT EXISTS simulations (
        id uuid PRIMARY KEY,
        name text NOT NULL,
        inputs jsonb NOT NULL,
        monthly_data jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );`);

      await client.query(
        "CREATE INDEX IF NOT EXISTS idx_simulations_updated_at ON simulations(updated_at DESC);"
      );

      console.log("Migration applied. Inserting test row...");

      const testId = require("crypto").randomUUID();
      const testInputs = { test: true };
      const testMonthly = { months: [] };

      await client.query(
        `INSERT INTO simulations (id, name, inputs, monthly_data) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING;`,
        [testId, "migration-test", testInputs, testMonthly]
      );

      const { rows } = await client.query(
        "SELECT count(*)::int AS cnt FROM simulations;"
      );
      console.log("Simulations count in DB:", rows[0].cnt);

      console.log("Migration and test insert successful. Test id:", testId);
    } finally {
      client.release();
    }
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    if (
      msg.includes("does not support SSL") ||
      msg.includes("unsupported SSL") ||
      msg.includes("SSL error")
    ) {
      console.log("Server refused SSL, retrying without SSL...");
      try {
        await pool.end();
      } catch (_) {}
      pool = createPool(false);
      try {
        const client = await pool.connect();
        try {
          console.log("Connected without SSL. Running migration...");
          await client.query(`CREATE TABLE IF NOT EXISTS simulations (
            id uuid PRIMARY KEY,
            name text NOT NULL,
            inputs jsonb NOT NULL,
            monthly_data jsonb NOT NULL,
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now()
          );`);

          await client.query(
            "CREATE INDEX IF NOT EXISTS idx_simulations_updated_at ON simulations(updated_at DESC);"
          );

          console.log("Migration applied. Inserting test row...");

          const testId = require("crypto").randomUUID();
          const testInputs = { test: true };
          const testMonthly = { months: [] };

          await client.query(
            `INSERT INTO simulations (id, name, inputs, monthly_data) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING;`,
            [testId, "migration-test", testInputs, testMonthly]
          );

          const { rows } = await client.query(
            "SELECT count(*)::int AS cnt FROM simulations;"
          );
          console.log("Simulations count in DB:", rows[0].cnt);

          console.log("Migration and test insert successful. Test id:", testId);
        } finally {
          client.release();
        }
      } catch (err2) {
        console.error(
          "Migration failed on retry without SSL:",
          err2.message || err2
        );
        process.exitCode = 2;
      } finally {
        try {
          await pool.end();
        } catch (_) {}
      }
      return;
    }

    console.error("Migration failed:", msg);
    process.exitCode = 2;
  } finally {
    try {
      await pool.end();
    } catch (_) {}
  }
}

main();
