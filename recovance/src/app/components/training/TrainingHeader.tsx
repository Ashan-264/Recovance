// components/TrainingHeader.tsx
import React from "react";

export default function TrainingHeader() {
  return (
    <div className="flex flex-wrap justify-between gap-3 p-4">
      <div className="flex min-w-72 flex-col gap-3">
        <p className="text-[32px] font-bold leading-tight tracking-light text-white">
          Training Plans
        </p>
        <p className="text-sm font-normal leading-normal text-[#9cbab5]">
          Manage your workouts and training schedules
        </p>
      </div>
    </div>
  );
}
