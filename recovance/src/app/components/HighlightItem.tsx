// components/HighlightItem.tsx
import Image from "next/image";

export interface HighlightItemProps {
  title: string;
  details: string;
  imageSrc: string;
  imageAlt: string;
}

export default function HighlightItem({
  title,
  details,
  imageSrc,
  imageAlt,
}: HighlightItemProps) {
  return (
    <div className="flex bg-gray-800 rounded-lg overflow-hidden">
      <div className="flex-1 p-4">
        <h3 className="text-xl font-medium text-white">{title}</h3>
        <p className="mt-1 text-gray-300 text-sm">{details}</p>
      </div>
      <div className="relative w-32 h-24">
        <Image
          src={imageSrc}
          alt={imageAlt}
          layout="fill"
          objectFit="cover"
          className="rounded-r-lg"
        />
      </div>
    </div>
  );
}
