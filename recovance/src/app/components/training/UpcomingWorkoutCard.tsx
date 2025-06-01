// components/UpcomingWorkoutCard.tsx
import React from "react";

interface UpcomingWorkoutCardProps {
  category: string;
  title: string;
  description: string;
  imageUrl: string;
}

export default function UpcomingWorkoutCard({
  category,
  title,
  description,
  imageUrl,
}: UpcomingWorkoutCardProps) {
  return (
    <div className="flex items-stretch justify-between gap-4 rounded-xl bg-[#1f2a29] p-4">
      <div className="flex flex-[2_2_0px] flex-col gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-normal leading-normal text-[#9cbab5]">
            {category}
          </p>
          <p className="text-base font-bold leading-tight text-white">
            {title}
          </p>
          <p className="text-sm font-normal leading-normal text-[#9cbab5]">
            {description}
          </p>
        </div>
        <button className="flex w-fit items-center justify-center rounded-full bg-[#283937] px-4 py-1 text-sm font-medium leading-normal text-white">
          <span className="truncate">View Details</span>
        </button>
      </div>

      <div
        className="flex-1 rounded-xl bg-center bg-cover bg-no-repeat aspect-video"
        style={{ backgroundImage: `url("${imageUrl}")` }}
      ></div>
    </div>
  );
}
