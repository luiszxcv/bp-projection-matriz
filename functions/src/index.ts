import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';

admin.initializeApp();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Use env vars populated by firebase or Secrets Manager
const rawHost = process.env.PG_HOST || process.env.POSTGRES_HOST || process.env.POSTGRES_URL;
const host = rawHost ? rawHost.replace(/^https?:\/\//, '').replace(/\/$/, '') : undefined;
const pool = new Pool({
  host,
  user: process.env.PG_USER || process.env.POSTGRES_USER,
  password: process.env.PG_PASSWORD || process.env.POSTGRES_PASSWORD,
  database: process.env.PG_DB || process.env.POSTGRES_DB,
  port: Number(process.env.PG_PORT || process.env.POSTGRES_PORT || 5432),
  ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 5,
});

// Simple unauthenticated middleware placeholder; replace with admin.auth verification if needed
async function maybeAuthenticate(req: express.Request, res: express.Response, next: express.NextFunction) {
  const auth = req.headers.authorization;
  if (!auth) return next();
  if (!auth.startsWith('Bearer ')) return res.status(401).send('Unauthorized');
  const idToken = auth.split('Bearer ')[1];
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    (req as any).uid = decoded.uid;
    return next();
  } catch (err) {
    return res.status(401).send('Invalid token');
  }
}

app.use(maybeAuthenticate);

app.get('/simulations', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, name, inputs, monthly_data as "monthlyData", created_at as "createdAt", updated_at as "updatedAt" FROM simulations ORDER BY updated_at DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('error');
  }
});

app.post('/simulations', async (req, res) => {
  try {
    const { id, name, inputs, monthlyData } = req.body;
    const uuid = id || require('crypto').randomUUID();
    await pool.query(
      `INSERT INTO simulations (id, name, inputs, monthly_data, created_at, updated_at) VALUES ($1,$2,$3,$4,now(),now())`,
      [uuid, name, JSON.stringify(inputs), JSON.stringify(monthlyData)]
    );
    res.status(201).json({ id: uuid });
  } catch (err) {
    console.error(err);
    res.status(500).send('error');
  }
});

app.put('/simulations/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { name, inputs, monthlyData } = req.body;
    await pool.query(`UPDATE simulations SET name=$1, inputs=$2, monthly_data=$3, updated_at=now() WHERE id=$4`, [name, JSON.stringify(inputs), JSON.stringify(monthlyData), id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).send('error');
  }
});

app.delete('/simulations/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await pool.query('DELETE FROM simulations WHERE id=$1', [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).send('error');
  }
});

exports.api = functions
  .runWith({
    timeoutSeconds: 60,
    memory: '256MB',
  })
  .https.onRequest(app);
