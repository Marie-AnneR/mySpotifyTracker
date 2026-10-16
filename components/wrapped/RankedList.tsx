import CoverImage from '@/components/wrapped/CoverImage';
import { EmptyMessage } from '@/components/wrapped/KpiCard';

export interface RankedListItem {
  id: string;
  rank: number;
  title: string;
  subtitle?: string;
  imageUrl: string | null;
}

interface RankedListProps {
  items: RankedListItem[];
  emptyMessage: string;
  // Photos d'artistes rondes, pochettes carrées
  roundImages?: boolean;
}

// Liste classée générique : sert aux top titres, top artistes, et aux futurs écrans
export default function RankedList({ items, emptyMessage, roundImages = false }: RankedListProps) {
  if (items.length === 0) return <EmptyMessage>{emptyMessage}</EmptyMessage>;

  return (
    <ol className="space-y-3">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-3">
          <span className="w-6 shrink-0 text-right text-sm font-bold text-zinc-400 tabular-nums">
            {item.rank}
          </span>
          <CoverImage
            src={item.imageUrl}
            label={item.title}
            rounded={roundImages ? 'full' : 'md'}
          />
          {/* min-w-0 : sans lui, truncate ne fonctionne pas dans un conteneur flex */}
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{item.title}</p>
            {item.subtitle && (
              <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">{item.subtitle}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
