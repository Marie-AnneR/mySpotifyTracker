import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

// Chiffrement des secrets stockés en base (refresh tokens) — SERVEUR UNIQUEMENT.
// AES-256-GCM : chiffre ET authentifie (un texte modifié en base est détecté au déchiffrement).
// Clé : TOKEN_ENCRYPTION_KEY, 32 octets en base64 (générée avec `openssl rand -base64 32`).

const ALGORITHM = 'aes-256-gcm';
// Taille de nonce recommandée pour GCM
const IV_BYTES = 12;

function getKey(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error('TOKEN_ENCRYPTION_KEY manquante : vérifie .env.local / Vercel');
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new Error('TOKEN_ENCRYPTION_KEY doit faire 32 octets (base64)');
  return key;
}

// Résultat : "iv.tag.données", chaque partie en base64url
export function encryptSecret(plain: string): string {
  // IV aléatoire à chaque chiffrement : ne JAMAIS réutiliser un IV avec la même clé en GCM
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, data].map((part) => part.toString('base64url')).join('.');
}

export function decryptSecret(payload: string): string {
  const [iv, tag, data] = payload.split('.').map((part) => Buffer.from(part, 'base64url'));
  if (!iv || !tag || !data) throw new Error('Secret chiffré mal formé');
  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}
