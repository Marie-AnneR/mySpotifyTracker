import { ReactNode } from 'react';

interface KpiCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

// Conteneur commun à toutes les cartes du Wrapped
export default function KpiCard({ title, subtitle, children }: KpiCardProps) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900">
      <header className="mb-3">
        <h2 className="text-lg font-bold">{title}</h2>
        {subtitle && <p className="text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}

// Squelette affiché pendant le chargement, aux mêmes dimensions qu'une carte remplie
export function KpiCardSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div
      aria-hidden="true"
      className="animate-pulse rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900"
    >
      <div className="mb-4 h-5 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="space-y-3">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-md bg-zinc-200 dark:bg-zinc-800" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-3 w-1/2 rounded bg-zinc-200 dark:bg-zinc-800" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EmptyMessage({ children }: { children: ReactNode }) {
  return <p className="py-4 text-center text-sm text-zinc-500 dark:text-zinc-400">{children}</p>;
}
