// components/Recovery/MetricCard.tsx
import React from "react";

interface MetricCardProps {
  title: string;
  mainValue: string;
  subLabel: string;
  trendValue: string;
  trendPositive?: boolean;
  chartSvg: React.ReactNode;
  xLabels: string[]; // e.g. ["Mon","Tue",...]
}

export default function MetricCard({
  title,
  mainValue,
  subLabel,
  trendValue,
  trendPositive = true,
  chartSvg,
  xLabels,
}: MetricCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[#3b5450] p-6 min-w-72 flex-1">
      <p className="text-white text-base font-medium leading-normal">{title}</p>
      <p className="truncate text-[32px] font-bold leading-tight tracking-light text-white">
        {mainValue}
      </p>
      <div className="flex gap-1">
        <p className="text-[#9cbab5] text-base font-normal leading-normal">
          {subLabel}
        </p>
        <p
          className={`text-base font-medium leading-normal ${
            trendPositive ? "text-[#0bda4d]" : "text-[#fa5838]"
          }`}
        >
          {trendPositive ? "+" : "-"}
          {trendValue}
        </p>
      </div>

      <div className="flex min-h-[180px] flex-1 flex-col gap-8 py-4">
        {chartSvg}
      </div>

      <div className="flex justify-around">
        {xLabels.map((label) => (
          <p
            key={label}
            className="text-[13px] font-bold leading-normal tracking-[0.015em] text-[#9cbab5]"
          >
            {label}
          </p>
        ))}
      </div>
    </div>
  );
}
