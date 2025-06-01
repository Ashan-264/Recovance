// components/AISuggestionCard.tsx
import Image from "next/image";

export interface AISuggestionCardProps {
  title: string;
  subtitle: string;
  backgroundSrc: string;
  backgroundAlt: string;
}

export default function AISuggestionCard({
  title,
  subtitle,
  backgroundSrc,
  backgroundAlt,
}: AISuggestionCardProps) {
  return (
    <div className="relative w-full h-40 rounded-lg overflow-hidden">
      <Image
        src={backgroundSrc}
        alt={backgroundAlt}
        layout="fill"
        objectFit="cover"
        className="opacity-80"
      />
      <div className="absolute inset-0 bg-black bg-opacity-40 flex flex-col justify-end p-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="text-sm text-gray-200">{subtitle}</p>
      </div>
    </div>
  );
}
