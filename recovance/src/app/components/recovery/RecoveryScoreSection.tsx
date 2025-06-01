// components/Recovery/RecoveryScoreSection.tsx
import React from "react";

export default function RecoveryScoreSection() {
  return (
    <>
      <h2 className="px-4 pb-3 pt-5 text-[22px] font-bold leading-tight tracking-[-0.015em] text-white">
        Recovery Score and Status
      </h2>
      <div className="flex flex-col gap-3 p-4">
        <div className="flex justify-between">
          <p className="text-white text-base font-medium leading-normal">
            Recovery Score
          </p>
          <p className="text-white text-sm font-normal leading-normal">75%</p>
        </div>
        <div className="w-full rounded bg-[#3b5450]">
          <div className="h-2 rounded bg-white" style={{ width: "75%" }} />
        </div>
        <p className="text-[#9cbab5] text-sm font-normal leading-normal">
          Slightly Elevated Fatigue
        </p>
      </div>
    </>
  );
}
