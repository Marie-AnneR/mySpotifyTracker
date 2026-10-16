interface CoverImageProps {
  src: string | null;
  // Sert d'initiale quand il n'y a pas d'image
  label: string;
  size?: number;
  rounded?: 'full' | 'md';
}

// Pochette ou photo d'artiste, avec une initiale en repli si Spotify ne fournit pas d'image
export default function CoverImage({ src, label, size = 48, rounded = 'md' }: CoverImageProps) {
  const shape = rounded === 'full' ? 'rounded-full' : 'rounded-md';
  const style = { width: size, height: size };

  if (!src) {
    return (
      <div
        style={style}
        aria-hidden="true"
        className={`${shape} flex shrink-0 items-center justify-center bg-zinc-200 font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400`}
      >
        {label.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- images Spotify (CDN externe), pas besoin de l'optimisation next/image en V1
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      style={style}
      className={`${shape} shrink-0 object-cover`}
    />
  );
}
