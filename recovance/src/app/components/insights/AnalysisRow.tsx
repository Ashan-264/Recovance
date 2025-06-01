// components/Insights/AnalysisRow.tsx
import React from "react";

interface AnalysisRowProps {
  iconSvg: React.ReactNode;
  heading: string;
  lines: string[]; // each line of descriptive text
}

export default function AnalysisRow({
  iconSvg,
  heading,
  lines,
}: AnalysisRowProps) {
  return (
    <div className="flex gap-4 bg-[#111817] px-4 py-3">
      <div
        className="text-white flex items-center justify-center rounded-lg bg-[#283936] shrink-0 size-12"
        // you may put data-icon attributes if you’re copying the Figma icons
      >
        {iconSvg}
      </div>
      <div className="flex flex-1 flex-col justify-center">
        <p className="text-white text-base font-medium leading-normal">
          {heading}
        </p>
        {lines.map((line, i) => (
          <p
            key={i}
            className="text-[#9db9b5] text-sm font-normal leading-normal"
          >
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}
