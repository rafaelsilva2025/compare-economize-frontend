PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(owner_user_id) REFERENCES users(id)
);

-- Planos
-- type: "user" ou "company"
-- tier: "free" | "pro" | "premium"
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  tier TEXT NOT NULL,
  user_id TEXT,
  company_id TEXT,
  status TEXT NOT NULL, -- active | pending | canceled
  started_at TEXT,
  ends_at TEXT,
  payment_ref TEXT,     -- referencia do pagamento (pix/qr/etc)
  created_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(company_id) REFERENCES companies(id)
);

-- Categorias (mercado, farmácia, combustível, conveniência, hotel etc)
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  created_at TEXT NOT NULL
);

-- Estabelecimentos (market/hotel/etc)
CREATE TABLE IF NOT EXISTS places (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  lat REAL,
  lng REAL,
  hours_json TEXT,   -- horários como JSON
  created_at TEXT NOT NULL,
  FOREIGN KEY(category_id) REFERENCES categories(id)
);

-- Produtos
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  unit TEXT DEFAULT 'un',
  created_at TEXT NOT NULL
);

-- Preços por estabelecimento
CREATE TABLE IF NOT EXISTS prices (
  id TEXT PRIMARY KEY,
  place_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(place_id) REFERENCES places(id),
  FOREIGN KEY(product_id) REFERENCES products(id)
);

-- Patrocínio (empresa promove um produto/price em um lugar)
CREATE TABLE IF NOT EXISTS sponsored_products (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  place_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  daily_budget_cents INTEGER NOT NULL,
  days INTEGER NOT NULL,
  total_budget_cents INTEGER NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  status TEXT NOT NULL, -- active | paused | finished
  created_at TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES companies(id),
  FOREIGN KEY(place_id) REFERENCES places(id),
  FOREIGN KEY(product_id) REFERENCES products(id)
);
