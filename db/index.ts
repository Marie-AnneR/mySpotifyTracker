import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '@/db/schema';

// Client de base de données, à n'utiliser QUE côté serveur (routes API).
// DATABASE_URL n'a pas le préfixe NEXT_PUBLIC_ : elle n'est jamais envoyée au navigateur.
function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL manquante : vérifie .env.local (ou les variables Vercel)');
  }
  // Driver HTTP de Neon : une requête HTTP par appel, adapté aux fonctions serverless de Vercel
  return drizzle(neon(url), { schema });
}

// Créé à la première utilisation, pour qu'une variable manquante produise une erreur claire
let db: ReturnType<typeof createDb> | null = null;

export function getDb() {
  db ??= createDb();
  return db;
}
