import SpotifyLoginButton from '@/components/SpotifyLoginButton';

const FEATURES = [
  {
    emoji: '🎵',
    text: 'Tes top titres, artistes et genres sur 4 semaines, 6 mois et 1 an',
  },
  {
    emoji: '🕒',
    text: "Ton historique d'écoute, enregistré au fil du temps",
  },
  {
    // Depuis #16, les snapshots sont stockés en base : on ne promet plus "tout dans le navigateur".
    // Une suppression des données à la demande reste à prévoir (cf. docs/database.md)
    emoji: '🔒',
    text: "Tes données ne servent qu'à toi, et ne sont enregistrées que si tu le demandes",
  },
];

export default function LoggedOutHome() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-extrabold">My Spotify Tracker</h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">Tes stats Spotify, quand tu veux.</p>
      </header>

      <ul className="space-y-4">
        {FEATURES.map(({ emoji, text }) => (
          <li key={text} className="flex gap-3">
            <span aria-hidden="true" className="text-2xl leading-none">
              {emoji}
            </span>
            <span>{text}</span>
          </li>
        ))}
      </ul>

      <div className="space-y-2 text-center">
        <SpotifyLoginButton />
        {/* Development mode Spotify : seuls les comptes ajoutés dans le dashboard peuvent se connecter */}
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Accès sur invitation (bêta)</p>
      </div>
    </div>
  );
}
