import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * The Orion CRM mark — "Monogram O" (concept C on the brand board): the O
 * of Orion as a planet, with a gold Saturn-style ring passing behind the
 * letter and back in front of it, plus one guiding star.
 *
 * `variant="tile"` is the app icon (ivory tile), used on dark chrome.
 * `variant="bare"` drops the tile for large hero use on dark backgrounds;
 * `gapColor` should match whatever sits behind it so the ring's front arc
 * reads as passing in front of the letter.
 */
export function OrionMark({
  variant = "tile",
  gapColor = "#0a0c0a",
  glint = false,
  className,
  title,
}: {
  variant?: "tile" | "bare";
  gapColor?: string;
  glint?: boolean;
  className?: string;
  title?: string;
}) {
  const clipId = useId();
  const tile = variant === "tile";
  const letter = tile ? "#155535" : "#3f9d68";
  const gap = tile ? "#f6f4ee" : gapColor;

  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("shrink-0", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx="32" cy="32" r="17.5" />
        </clipPath>
      </defs>
      {tile && (
        <>
          <rect width="64" height="64" rx="15" fill="#f6f4ee" />
          <rect x=".75" y=".75" width="62.5" height="62.5" rx="14.25" fill="none" stroke="rgba(13,15,13,.10)" strokeWidth="1.5" />
        </>
      )}
      <g transform="rotate(-24 32 32)">
        <path d="M5 32A27 7 0 0 1 59 32" fill="none" stroke="#c4912e" strokeWidth="2.4" strokeLinecap="round" />
      </g>
      <circle cx="32" cy="32" r="14" fill="none" stroke={letter} strokeWidth="6.5" />
      <g transform="rotate(-24 32 32)">
        <path d="M59 32A27 7 0 0 1 5 32" fill="none" stroke={gap} strokeWidth="6" clipPath={`url(#${clipId})`} />
        <path d="M59 32A27 7 0 0 1 5 32" fill="none" stroke="#c4912e" strokeWidth="2.4" strokeLinecap="round" />
        {glint && (
          <path
            d="M59 32A27 7 0 0 1 5 32"
            fill="none"
            stroke="#fff6da"
            strokeWidth="2.4"
            strokeLinecap="round"
            pathLength={100}
            className="orion-glint"
          />
        )}
      </g>
      <path
        d="M49.5 8.5Q50.2 12.8 54.5 13.5Q50.2 14.2 49.5 18.5Q48.8 14.2 44.5 13.5Q48.8 12.8 49.5 8.5Z"
        fill="#c4912e"
      />
    </svg>
  );
}
