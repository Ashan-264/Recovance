// components/RecoveryCard.tsx
import Image from "next/image";

export interface RecoveryCardProps {
  title: string;
  details: string;
  imageSrc: string;
  imageAlt: string;
  isScoreCard?: boolean;
  scoreValue?: string; // e.g. "85/100"
}

export default function RecoveryCard({
  title,
  details,
  imageSrc,
  imageAlt,
  isScoreCard = false,
  scoreValue,
}: RecoveryCardProps) {
  return (
    <div className="flex bg-gray-800 rounded-lg overflow-hidden">
      <div className="relative w-32 h-24">
        <Image
          src={imageSrc}
          alt={imageAlt}
          layout="fill"
          objectFit="cover"
          className="rounded-l-lg"
        />
      </div>
      <div className="flex-1 p-4">
        <div className="flex items-baseline justify-between">
          <h3 className="text-lg font-medium text-white">{title}</h3>
          {isScoreCard && scoreValue ? (
            <span className="text-sm font-bold text-green-400">
              {scoreValue}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-gray-300 text-sm">{details}</p>
      </div>
    </div>
  );
}
