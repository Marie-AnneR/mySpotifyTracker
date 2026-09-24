import { SpotifyImageObject } from '@/types/spotifyApi';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

// Spotify trie les images de la plus grande à la plus petite : on garde la plus grande,
// le navigateur la redimensionne. Une seule URL suffit pour la V1.
export function pickImageUrl(images: SpotifyImageObject[] | undefined): string | null {
  return Array.isArray(images) && images.length > 0 ? images[0].url : null;
}

export function toSpotifyUrl(externalUrls: { spotify?: string } | undefined): string | null {
  return externalUrls?.spotify ?? null;
}

// Filtre les items mal formés (avec un warning plutôt qu'une erreur) puis les convertit
export function mapValidItems<Raw, Model>(
  items: unknown[],
  isValid: (item: unknown) => item is Raw,
  toModel: (raw: Raw) => Model,
  label: string
): Model[] {
  const validItems = items.filter(isValid);
  if (validItems.length < items.length) {
    console.warn(`[${label}] ${items.length - validItems.length} item(s) mal formé(s) ignoré(s)`);
  }
  return validItems.map(toModel);
}
