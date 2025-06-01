// components/Recovery/InterventionCard.tsx
import React from "react";

interface InterventionCardProps {
  iconSvg: React.ReactNode;
  heading: string;
  description: string;
}

export default function InterventionCard({
  iconSvg,
  heading,
  description,
}: InterventionCardProps) {
  return (
    <div className="flex items-center gap-4 bg-[#111817] px-4 py-2">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#283937] text-white">
        {iconSvg}
      </div>
      <div className="flex flex-col justify-center">
        <p className="text-base font-medium leading-normal text-white line-clamp-1">
          {heading}
        </p>
        <p className="text-sm leading-normal text-[#9cbab5] line-clamp-2">
          {description}
        </p>
      </div>
    </div>
  );
}
