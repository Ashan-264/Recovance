// components/TrainingPlanCard.tsx
import React from "react";

interface TrainingPlanCardProps {
  title: string;
  subtitle: string;
  imageUrl: string;
}

export default function TrainingPlanCard({
  title,
  subtitle,
  imageUrl,
}: TrainingPlanCardProps) {
  return (
    <div className="flex h-full min-w-40 flex-1 flex-col gap-4 rounded-lg bg-[#1f2a29] p-0">
      <div
        className="aspect-square rounded-xl bg-center bg-cover bg-no-repeat"
        style={{ backgroundImage: `url("${imageUrl}")` }}
      />
      <div className="px-2">
        <p className="text-base font-medium leading-normal text-white">
          {title}
        </p>
        <p className="text-sm font-normal leading-normal text-[#9cbab5]">
          {subtitle}
        </p>
      </div>
    </div>
  );
}
