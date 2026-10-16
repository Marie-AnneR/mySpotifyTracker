import { EmptyMessage } from '@/components/wrapped/KpiCard';
import { GenreStat } from '@/types/kpis';

interface GenreBarsProps {
  genres: GenreStat[];
  emptyMessage: string;
}

// Top genres en barres horizontales, largeur relative au genre n°1
export default function GenreBars({ genres, emptyMessage }: GenreBarsProps) {
  if (genres.length === 0) return <EmptyMessage>{emptyMessage}</EmptyMessage>;

  const maxShare = Math.max(...genres.map((genre) => genre.share));

  return (
    <ol className="space-y-3">
      {genres.map((genre) => (
        <li key={genre.genre}>
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <span className="truncate font-medium capitalize">{genre.genre}</span>
            <span className="shrink-0 text-sm text-zinc-500 tabular-nums dark:text-zinc-400">
              {Math.round(genre.share * 100)} %
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div
              className="h-full rounded-full bg-green-500"
              style={{ width: `${(genre.share / maxShare) * 100}%` }}
            />
          </div>
          <p className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400">
            {genre.topArtistNames.join(', ')}
          </p>
        </li>
      ))}
    </ol>
  );
}
