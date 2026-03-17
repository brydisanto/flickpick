import type { Genre } from "@/types";

interface GenreChipProps {
  genre: Genre;
  onClick?: (genre: Genre) => void;
  className?: string;
}

export default function GenreChip({ genre, onClick, className = "" }: GenreChipProps) {
  const Tag = onClick ? "button" : "span";

  return (
    <Tag
      {...(onClick && { onClick: () => onClick(genre), type: "button" as const })}
      className={`
        inline-flex items-center
        text-[11px] uppercase tracking-[0.05em] font-semibold
        rounded-[6px] px-3 py-1
        bg-gold-subtle text-gold border border-border-accent
        ${onClick ? "cursor-pointer hover:bg-gold hover:text-bg-primary transition-colors" : ""}
        ${className}
      `}
    >
      {genre.name}
    </Tag>
  );
}
