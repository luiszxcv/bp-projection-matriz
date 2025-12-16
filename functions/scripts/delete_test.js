#!/usr/bin/env node
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

function parseEnv(content) {
  const lines = content.split(/\r?\n/);
  const out = {};
  for (const line of lines) {
    if (!line || line.trim().startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx + 1).trim();
    out[k] = v;
  }
  return out;
}

async function main() {
  const envPath = path.resolve(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) {
    console.error(".env not found at", envPath);
    process.exitCode = 2;
    return;
  }
  const env = parseEnv(fs.readFileSync(envPath, "utf8"));

  const normalizeHost = (h) => {
    if (!h) return h;
    return h.replace(/^https?:\/\//, "").replace(/\/$/, "");
  };

  const host = normalizeHost(env.PG_HOST || env.POSTGRES_HOST || env.PGHOST);
  const user = env.PG_USER || env.POSTGRES_USER || env.PGUSER || "postgres";
  const password =
    env.PG_PASSWORD || env.POSTGRES_PASSWORD || env.PGPASSWORD || "";
  const database = env.PG_DB || env.POSTGRES_DB || env.PGDATABASE || "postgres";
  const port = Number(env.PG_PORT || env.POSTGRES_PORT || env.PGPORT || 5432);
  const useSsl = (env.PG_SSL || "").toLowerCase() === "true";

  console.log(
    "Connecting to Postgres at",
    host,
    "port",
    port,
    "db",
    database,
    "user",
    user
  );

  const createPool = (ssl) =>
    new Pool({
      host,
      user,
      password,
      database,
      port,
      ssl: ssl ? { rejectUnauthorized: false } : false,
    });

  let pool = createPool(useSsl);
  try {
    const client = await pool.connect();
    try {
      console.log("Connected. Deleting migration test rows...");
      const res = await client.query(
        "DELETE FROM simulations WHERE name=$1 RETURNING id;",
        ["migration-test"]
      );
      console.log("Deleted rows:", res.rowCount);
      if (res.rowCount)
        console.log("Deleted ids:", res.rows.map((r) => r.id).join(", "));
    } finally {
      client.release();
    }
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    if (
      msg.includes("does not support SSL") ||
      msg.includes("unsupported SSL") ||
      msg.includes("SSL error") ||
      msg.includes("server requires SSL")
    ) {
      console.log("Server refused SSL, retrying without SSL...");
      try {
        await pool.end();
      } catch (_) {}
      pool = createPool(false);
      try {
        const client = await pool.connect();
        try {
          console.log("Connected without SSL. Deleting migration test rows...");
          const res = await client.query(
            "DELETE FROM simulations WHERE name=$1 RETURNING id;",
            ["migration-test"]
          );
          console.log("Deleted rows:", res.rowCount);
          if (res.rowCount)
            console.log("Deleted ids:", res.rows.map((r) => r.id).join(", "));
        } finally {
          client.release();
        }
      } catch (err2) {
        console.error(
          "Delete failed on retry without SSL:",
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
    console.error("Delete failed:", msg);
    process.exitCode = 2;
  } finally {
    try {
      await pool.end();
    } catch (_) {}
  }
}

main();
