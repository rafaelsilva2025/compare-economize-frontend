import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { initDb, getDb } from "./db.js";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8000;
const JWT_SECRET = process.env.JWT_SECRET || "change-me";

const nowIso = () => new Date().toISOString();
const id = () => crypto.randomUUID();

function auth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Missing token" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

await initDb();

/** HEALTH */
app.get("/api/health", (_, res) => res.json({ ok: true }));

/** AUTH */
app.post("/api/auth/register", async (req, res) => {
  const schema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
  });
  const data = schema.safeParse(req.body);
  if (!data.success) return res.status(400).json({ error: data.error.flatten() });

  const db = await getDb();
  const exists = await db.get("SELECT id FROM users WHERE email = ?", data.data.email);
  if (exists) return res.status(409).json({ error: "Email already exists" });

  const userId = id();
  const hash = await bcrypt.hash(data.data.password, 10);

  await db.run(
    "INSERT INTO users (id, name, email, password_hash, created_at) VALUES (?,?,?,?,?)",
    userId,
    data.data.name,
    data.data.email,
    hash,
    nowIso()
  );

  // Plano usuário FREE automático
  await db.run(
    "INSERT INTO subscriptions (id, type, tier, user_id, status, started_at, created_at) VALUES (?,?,?,?,?,?,?)",
    id(),
    "user",
    "free",
    userId,
    "active",
    nowIso(),
    nowIso()
  );

  await db.close();
  res.json({ ok: true });
});

app.post("/api/auth/login", async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  });
  const data = schema.safeParse(req.body);
  if (!data.success) return res.status(400).json({ error: data.error.flatten() });

  const db = await getDb();
  const user = await db.get("SELECT * FROM users WHERE email = ?", data.data.email);
  await db.close();

  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  const ok = await bcrypt.compare(data.data.password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: "30d" });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

/** CATEGORIES */
app.get("/api/categories", async (_, res) => {
  const db = await getDb();
  const rows = await db.all("SELECT * FROM categories ORDER BY name ASC");
  await db.close();
  res.json(rows);
});

/** PLACES (estabelecimentos) */
app.get("/api/places", async (req, res) => {
  const { categoryId } = req.query;
  const db = await getDb();

  let rows;
  if (categoryId) {
    rows = await db.all(
      `SELECT p.*, c.name as category_name, c.icon as category_icon
       FROM places p
       JOIN categories c ON c.id = p.category_id
       WHERE p.category_id = ?
       ORDER BY p.name ASC`,
      categoryId
    );
  } else {
    rows = await db.all(
      `SELECT p.*, c.name as category_name, c.icon as category_icon
       FROM places p
       JOIN categories c ON c.id = p.category_id
       ORDER BY p.name ASC`
    );
  }

  await db.close();
  res.json(rows);
});

/** PRODUCTS + PRICES */
app.get("/api/place/:placeId/products", async (req, res) => {
  const { placeId } = req.params;
  const db = await getDb();

  const rows = await db.all(
    `SELECT pr.id as price_id, pr.price_cents, pr.updated_at,
            pd.id as product_id, pd.name as product_name, pd.unit
     FROM prices pr
     JOIN products pd ON pd.id = pr.product_id
     WHERE pr.place_id = ?
     ORDER BY pd.name ASC`,
    placeId
  );

  await db.close();
  res.json(rows);
});

/** SUBSCRIPTIONS (usuário e empresa) */
app.get("/api/me/subscription", auth, async (req, res) => {
  const db = await getDb();
  const sub = await db.get(
    `SELECT * FROM subscriptions
     WHERE type='user' AND user_id=?
     ORDER BY created_at DESC LIMIT 1`,
    req.user.userId
  );
  await db.close();
  res.json(sub || null);
});

/**
 * Criar “pedido de pagamento” (fase 2 do pagamento)
 * Aqui ainda NÃO confirma pagamento automático.
 * Ele gera um payment_ref e deixa status=pending (depois seu gateway confirma e ativa).
 */
app.post("/api/subscription/create", auth, async (req, res) => {
  const schema = z.object({
    type: z.enum(["user", "company"]),
    tier: z.enum(["free", "pro", "premium"]),
    companyName: z.string().optional()
  });
  const data = schema.safeParse(req.body);
  if (!data.success) return res.status(400).json({ error: data.error.flatten() });

  const db = await getDb();

  // criar company se for company e não existir
  let companyId = null;
  if (data.data.type === "company") {
    const name = (data.data.companyName || "").trim();
    if (!name) return res.status(400).json({ error: "companyName required" });

    const existing = await db.get(
      "SELECT id FROM companies WHERE name=? AND owner_user_id=?",
      name,
      req.user.userId
    );
    if (existing) companyId = existing.id;
    else {
      companyId = id();
      await db.run(
        "INSERT INTO companies (id, name, owner_user_id, created_at) VALUES (?,?,?,?)",
        companyId,
        name,
        req.user.userId,
        nowIso()
      );

      // Company FREE inicial
      await db.run(
        "INSERT INTO subscriptions (id, type, tier, company_id, status, started_at, created_at) VALUES (?,?,?,?,?,?,?)",
        id(),
        "company",
        "free",
        companyId,
        "active",
        nowIso(),
        nowIso()
      );
    }
  }

  // definir preço
  const priceMap = {
    user: { free: 0, pro: 990 },
    company: { free: 0, pro: 2990, premium: 5990 }
  };

  const amount = priceMap[data.data.type]?.[data.data.tier];
  if (amount === undefined) return res.status(400).json({ error: "Invalid plan" });

  // se free, ativa direto
  if (amount === 0) {
    // grava subscription ativa
    await db.run(
      "INSERT INTO subscriptions (id, type, tier, user_id, company_id, status, started_at, created_at) VALUES (?,?,?,?,?,?,?,?)",
      id(),
      data.data.type,
      data.data.tier,
      data.data.type === "user" ? req.user.userId : null,
      companyId,
      "active",
      nowIso(),
      nowIso()
    );
    await db.close();
    return res.json({ ok: true, status: "active", amount_cents: 0 });
  }

  // pago -> pending + payment_ref
  const paymentRef = `${data.data.type}-${data.data.tier}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  await db.run(
    "INSERT INTO subscriptions (id, type, tier, user_id, company_id, status, payment_ref, created_at) VALUES (?,?,?,?,?,?,?,?)",
    id(),
    data.data.type,
    data.data.tier,
    data.data.type === "user" ? req.user.userId : null,
    companyId,
    "pending",
    paymentRef,
    nowIso()
  );

  await db.close();

  // aqui você vai renderizar QR/PIX na sua tela usando paymentRef
  res.json({
    ok: true,
    status: "pending",
    payment_ref: paymentRef,
    amount_cents: amount
  });
});

app.listen(PORT, () => {
  console.log(`API on http://localhost:${PORT}`);
});
