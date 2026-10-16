import HomeContent from '@/components/home/HomeContent';
import PlayHistorySync from '@/components/PlayHistorySync';

// Mobile d'abord : même colonne centrée que l'écran Wrapped
export default function Home() {
  return (
    <div className="flex-1 bg-zinc-100 dark:bg-black">
      <main className="mx-auto max-w-md px-4 py-10">
        <HomeContent />
        <PlayHistorySync />
      </main>
    </div>
  );
}
