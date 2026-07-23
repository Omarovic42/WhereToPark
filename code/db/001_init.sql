-- 001_init.sql — Schéma initial WhereToPark (PostgreSQL 16 + PostGIS)
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','moderator','admin')),
  points INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('free','busy','leave','full','control','blue_zone')),
  geom GEOMETRY(Point, 4326) NOT NULL,
  confirmations INT NOT NULL DEFAULT 0,
  denials INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reports_geom ON reports USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_reports_created ON reports (created_at);

CREATE TABLE IF NOT EXISTS parkings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  operator TEXT,
  geom GEOMETRY(Point, 4326) NOT NULL,
  capacity INT NOT NULL,
  free_count INT NOT NULL DEFAULT 0,
  price_cents INT NOT NULL DEFAULT 0,
  tags TEXT[] NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_parkings_geom ON parkings USING GIST (geom);

-- Jeu de données de démonstration (Saint-Étienne)
INSERT INTO parkings (name, geom, capacity, free_count, price_cents, tags) VALUES
  ('Parking Hôtel de Ville', ST_SetSRID(ST_MakePoint(4.3866,45.4402),4326), 420, 37, 180, '{covered,secure,ev}'),
  ('Parking Jean Jaurès',    ST_SetSRID(ST_MakePoint(4.3889,45.4432),4326), 310, 12, 160, '{covered,pmr}'),
  ('Parking Ursules',        ST_SetSRID(ST_MakePoint(4.3901,45.4363),4326), 520,  0, 200, '{covered,secure,pmr,ev}'),
  ('Parking Châteaucreux',   ST_SetSRID(ST_MakePoint(4.3997,45.4433),4326), 640,158, 140, '{covered,ev,moto}')
ON CONFLICT DO NOTHING;
