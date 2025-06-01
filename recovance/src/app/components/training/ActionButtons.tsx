// components/ActionButtons.tsx
import React from "react";

export default function ActionButtons() {
  return (
    <>
      <button className="flex h-10 min-w-[84px] max-w-[480px] items-center justify-center rounded-full bg-[#0cf2d0] px-4 text-sm font-bold leading-normal tracking-[0.015em] text-[#111817]">
        <span className="truncate">Sync Devices</span>
      </button>
      <button className="flex h-10 min-w-[84px] max-w-[480px] items-center justify-center rounded-full bg-[#283937] px-4 text-sm font-bold leading-normal tracking-[0.015em] text-white">
        <span className="truncate">Create Custom Plan</span>
      </button>
    </>
  );
}
