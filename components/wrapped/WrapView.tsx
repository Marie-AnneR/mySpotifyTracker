import GenreBars from '@/components/wrapped/GenreBars';
import KpiCard from '@/components/wrapped/KpiCard';
import RankedList from '@/components/wrapped/RankedList';
import { WrapViewData } from '@/types/kpis';

const EMPTY_MESSAGE = "Pas encore assez d'écoutes sur cette période.";

// Les 3 cartes d'un wrap (top titres, artistes, genres). Commun au Wrapped Spotify (#14)
// et au wrap mensuel calculé depuis les snapshots (#17)
export default function WrapView({ data }: { data: WrapViewData }) {
  return (
    <>
      <KpiCard title="Top titres" subtitle={data.label}>
        <RankedList
          emptyMessage={EMPTY_MESSAGE}
          items={data.topTracks.map(({ rank, item }) => ({
            id: item.id,
            rank,
            title: item.name,
            subtitle: item.artists.map((artist) => artist.name).join(', '),
            imageUrl: item.album.imageUrl,
          }))}
        />
      </KpiCard>

      <KpiCard title="Top artistes" subtitle={data.label}>
        <RankedList
          roundImages
          emptyMessage={EMPTY_MESSAGE}
          items={data.topArtists.map(({ rank, item }) => ({
            id: item.id,
            rank,
            title: item.name,
            // Les genres viennent de l'enrichissement (#31) : affichés seulement s'ils existent
            subtitle: item.genres.slice(0, 2).join(', ') || undefined,
            imageUrl: item.imageUrl,
          }))}
        />
      </KpiCard>

      <KpiCard title="Top genres" subtitle={data.label}>
        <GenreBars
          genres={data.topGenres}
          emptyMessage={
            data.topArtists.length === 0
              ? EMPTY_MESSAGE
              : 'Genres indisponibles pour tes artistes du moment.'
          }
        />
      </KpiCard>
    </>
  );
}
