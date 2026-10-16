import { TIME_RANGE_LABELS } from '@/lib/kpis/wrapped';
import { TIME_RANGES, TimeRange } from '@/types/spotify';

// Libellés courts pour tenir sur un écran de téléphone
const SHORT_LABELS: Record<TimeRange, string> = {
  short_term: '4 semaines',
  medium_term: '6 mois',
  long_term: '1 an',
};

interface PeriodTabsProps {
  value: TimeRange;
  onChange: (timeRange: TimeRange) => void;
}

export default function PeriodTabs({ value, onChange }: PeriodTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Période"
      className="grid grid-cols-3 gap-1 rounded-full bg-zinc-200 p-1 dark:bg-zinc-800"
    >
      {TIME_RANGES.map((timeRange) => {
        const selected = timeRange === value;
        return (
          <button
            key={timeRange}
            role="tab"
            aria-selected={selected}
            // Le libellé complet reste disponible pour les lecteurs d'écran
            aria-label={TIME_RANGE_LABELS[timeRange]}
            onClick={() => onChange(timeRange)}
            className={`rounded-full px-3 py-2 text-sm font-semibold transition-colors ${
              selected
                ? 'bg-white text-black shadow-sm dark:bg-zinc-950 dark:text-white'
                : 'text-zinc-600 dark:text-zinc-400'
            }`}
          >
            {SHORT_LABELS[timeRange]}
          </button>
        );
      })}
    </div>
  );
}
