// components/Recovery/MetricsTabs.tsx
import Link from "next/link";
import React from "react";

export default function MetricsTabs() {
  return (
    <div className="pb-3">
      <div className="flex border-b border-[#3b5450] px-4 gap-8">
        <Link
          href="#"
          className="flex flex-col items-center justify-center border-b-[3px] border-b-white pb-[13px] pt-4 text-white"
        >
          <p className="text-sm font-bold leading-normal tracking-[0.015em]">
            Sleep
          </p>
        </Link>
        <Link
          href="#"
          className="flex flex-col items-center justify-center border-b-[3px] border-b-transparent pb-[13px] pt-4 text-[#9cbab5]"
        >
          <p className="text-sm font-bold leading-normal tracking-[0.015em]">
            HRV
          </p>
        </Link>
        <Link
          href="#"
          className="flex flex-col items-center justify-center border-b-[3px] border-b-transparent pb-[13px] pt-4 text-[#9cbab5]"
        >
          <p className="text-sm font-bold leading-normal tracking-[0.015em]">
            RHR
          </p>
        </Link>
        <Link
          href="#"
          className="flex flex-col items-center justify-center border-b-[3px] border-b-transparent pb-[13px] pt-4 text-[#9cbab5]"
        >
          <p className="text-sm font-bold leading-normal tracking-[0.015em]">
            Muscle Soreness
          </p>
        </Link>
      </div>
    </div>
  );
}
