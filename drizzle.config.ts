import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// drizzle-kit tourne hors de Next.js : il ne lit pas .env.local tout seul
config({ path: '.env.local' });

export default defineConfig({
  schema: './db/schema.ts',
  // Migrations SQL générées : à commiter, elles retracent l'historique du schéma
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    // Connexion directe (sans pooler) recommandée par Neon pour les migrations
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!,
  },
});
