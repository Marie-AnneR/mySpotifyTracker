import { NextRequest } from 'next/server';
import { authenticate, errorResponse } from '@/services/apiAuth';
import { captureSnapshot } from '@/services/snapshotCapture';
import { listSnapshotRuns } from '@/services/snapshotStore';

// Une grosse bibliothèque de likes peut demander une centaine d'appels Spotify
export const maxDuration = 60;

const ROUTE = 'api/snapshots';

// Enregistre un snapshot manuel de l'utilisateur connecté
export async function POST(request: NextRequest) {
  try {
    const { accessToken, user } = await authenticate(request);
    const run = await captureSnapshot({ accessToken, user, source: 'manual' });
    return Response.json(run, { status: 201 });
  } catch (err) {
    return errorResponse(err, ROUTE, "Erreur serveur lors de l'enregistrement");
  }
}

// Liste les derniers snapshots de l'utilisateur connecté
export async function GET(request: NextRequest) {
  try {
    const { user } = await authenticate(request);
    return Response.json(await listSnapshotRuns(user.id));
  } catch (err) {
    return errorResponse(err, ROUTE, 'Erreur serveur lors de la lecture des snapshots');
  }
}
