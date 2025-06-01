// components/Recovery/RecoveryHeader.tsx
import React from "react";

export default function RecoveryHeader() {
  return (
    <div className="flex flex-wrap justify-between gap-3 p-4">
      <div className="flex min-w-72 flex-col gap-3">
        <p className="text-[32px] font-bold leading-tight tracking-light text-white">
          Recovery
        </p>
        <p className="text-sm leading-normal text-[#9cbab5]">
          Monitor and optimize your recovery across all sports
        </p>
      </div>
    </div>
  );
}
