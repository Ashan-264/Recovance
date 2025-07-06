// components/TabNavigation.tsx
import Link from "next/link";
import React from "react";

export default function TabNavigation() {
  return (
    <div className="flex border-b border-[#3b5450] px-4 gap-8">
      <Link
        href="/training"
        className="flex flex-col items-center justify-center border-b-[3px] border-b-white pb-[13px] pt-4 text-white"
      >
        <p className="text-sm font-bold leading-normal tracking-[0.015em]">
          Calendar
        </p>
      </Link>
      <Link
        href="#"
        className="flex flex-col items-center justify-center border-b-[3px] border-b-transparent pb-[13px] pt-4 text-[#9cbab5]"
      >
        <p className="text-sm font-bold leading-normal tracking-[0.015em]">
          List
        </p>
      </Link>
      <Link
        href="#"
        className="flex flex-col items-center justify-center border-b-[3px] border-b-transparent pb-[13px] pt-4 text-[#9cbab5]"
      >
        <p className="text-sm font-bold leading-normal tracking-[0.015em]">
          Plans
        </p>
      </Link>
      <Link
        href="/training/insights"
        className="flex flex-col items-center justify-center border-b-[3px] border-b-transparent pb-[13px] pt-4 text-[#9cbab5]"
      >
        <p className="text-sm font-bold leading-normal tracking-[0.015em]">
          Insights
        </p>
      </Link>
    </div>
  );
}
