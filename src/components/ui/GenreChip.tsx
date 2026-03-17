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
        inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
        bg-primary-light text-primary
        ${onClick ? "cursor-pointer hover:bg-primary hover:text-white transition-colors" : ""}
        ${className}
      `}
    >
      {genre.name}
    </Tag>
  );
}
