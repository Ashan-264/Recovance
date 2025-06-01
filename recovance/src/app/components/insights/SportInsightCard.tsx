// components/Insights/SportInsightCard.tsx
import React from "react";

interface SportInsightCardProps {
  title: string;
  mainValue: string;
  subLabel: string;
  trendValue: string;
  trendPositive: boolean;
  chartSvg: React.ReactNode;
  xLabels?: string[];
}

export default function SportInsightCard({
  title,
  mainValue,
  subLabel,
  trendValue,
  trendPositive,
  chartSvg,
  xLabels = [],
}: SportInsightCardProps) {
  return (
    <div className="flex min-w-72 flex-1 flex-col gap-2 rounded-xl border border-[#3b5450] p-6">
      <p className="text-white text-base font-medium leading-normal">{title}</p>
      <p className="text-white tracking-light text-[32px] font-bold leading-tight truncate">
        {mainValue}
      </p>
      <div className="flex gap-1">
        <p className="text-[#9db9b5] text-base font-normal leading-normal">
          {subLabel}
        </p>
        <p
          className={`${
            trendPositive ? "text-[#0bda4d]" : "text-[#fa5838]"
          } text-base font-medium leading-normal`}
        >
          {trendPositive ? `+${trendValue}` : `-${trendValue}`}
        </p>
      </div>
      <div className="flex min-h-[180px] flex-1 flex-col gap-8 py-4">
        {chartSvg}
        {xLabels.length > 0 && (
          <div className="flex justify-around">
            {xLabels.map((label) => (
              <p
                key={label}
                className="text-[#9db9b5] text-[13px] font-bold leading-normal tracking-[0.015em]"
              >
                {label}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
