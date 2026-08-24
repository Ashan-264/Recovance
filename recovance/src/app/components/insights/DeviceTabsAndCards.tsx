// components/Insights/DeviceTabsAndCards.tsx
import React from "react";
import Link from "next/link";
import SportInsightCard from "./SportInsightCard"; // reuse for device charts if needed
import AnalysisRow from "./AnalysisRow";

// You can create smaller sub‐components if desired, but here’s an example:
const devices = ["Oura Ring", "Strava", "Garmin", "Coros"];

// Smooth sparkline through the given y-values across the 478-wide viewBox,
// with a gradient fill underneath. Gradient ids must be unique per instance.
function SparklineChart({ id, points }: { id: string; points: number[] }) {
  const step = 472 / (points.length - 1);
  const line = points
    .map((y, i) => {
      const x = i * step;
      if (i === 0) return `M${x} ${y}`;
      const prevX = (i - 1) * step;
      const midX = (prevX + x) / 2;
      return `C${midX} ${points[i - 1]} ${midX} ${y} ${x} ${y}`;
    })
    .join(" ");
  const fill = `${line} V149 H0 Z`;

  return (
    <svg
      width="100%"
      height="148"
      viewBox="-3 0 478 150"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
    >
      <path d={fill} fill={`url(#${id})`} />
      <path
        d={line}
        stroke="#9cbab5"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <defs>
        <linearGradient
          id={id}
          x1="236"
          y1="1"
          x2="236"
          y2="149"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#283936" />
          <stop offset="1" stopColor="#283936" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const deviceCardsData = [
  {
    title: "Sleep Duration and Quality",
    mainValue: "7.5 Hours, 85%",
    subLabel: "Last 7 Days",
    trendValue: "5%",
    trendPositive: true,
    chartSvg: (
      <SparklineChart
        id="device_chart_sleep"
        points={[109, 21, 41, 93, 33, 101, 61, 45, 121, 149, 1, 81, 129, 25]}
      />
    ),
    xLabels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  },
  {
    title: "Heart Rate Variability (HRV)",
    mainValue: "60ms",
    subLabel: "Last 7 Days",
    trendValue: "10%",
    trendPositive: true,
    chartSvg: (
      <SparklineChart
        id="device_chart_hrv"
        points={[89, 61, 101, 45, 121, 33, 93, 21, 109, 41, 129, 25, 81, 49]}
      />
    ),
    xLabels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  },
  {
    title: "Body Temperature",
    mainValue: "36.5°C",
    subLabel: "Last 7 Days",
    trendValue: "N/A",
    trendPositive: true,
    chartSvg: (
      <SparklineChart
        id="device_chart_temp"
        points={[75, 81, 69, 85, 73, 77, 65, 79, 71, 83, 67, 75, 69, 73]}
      />
    ),
    xLabels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  },
];

export default function DeviceTabsAndCards() {
  return (
    <>
      {/* Device Tabs */}
      <div className="pb-3">
        <div className="flex border-b border-[#3b5450] px-4 gap-8">
          {devices.map((dev, idx) => (
            <Link
              href="#"
              key={dev}
              className={
                `flex flex-col items-center justify-center pb-[13px] pt-4 text-sm font-bold leading-normal tracking-[0.015em] ` +
                (idx === 0
                  ? "border-b-[3px] border-b-white text-white"
                  : "border-b-[3px] border-b-transparent text-[#9cbab5]")
              }
            >
              {dev}
            </Link>
          ))}
        </div>
      </div>

      {/* Device Cards */}
      <div className="flex flex-wrap gap-4 px-4 py-6">
        {deviceCardsData.map((card, i) => (
          <SportInsightCard
            key={i}
            title={card.title}
            mainValue={card.mainValue}
            subLabel={card.subLabel}
            trendValue={card.trendValue}
            trendPositive={card.trendPositive}
            chartSvg={card.chartSvg}
            xLabels={card.xLabels}
          />
        ))}
      </div>

      {/* Device Analysis Rows: Oura Ring Analysis, Strava Analysis, Garmin Analysis, Coros Analysis */}
      {[
        {
          heading: "Oura Ring Data Analysis",
          lines: [
            "Monitor your HRV to ensure you’re not overtraining.",
            "Your sleep duration and quality have improved. Continue maintaining a consistent sleep schedule.",
          ],
        },
        {
          heading: "Strava Data Analysis",
          lines: [
            "Consider joining challenges to stay motivated.",
            "You’ve been consistently logging your workouts. Focus on improving your segment times.",
          ],
        },
        {
          heading: "Garmin Data Analysis",
          lines: [
            "Consider incorporating recovery workouts to support adaptation.",
            "Your training load has increased. Monitor your heart rate data to ensure you’re not overtraining.",
          ],
        },
        {
          heading: "Coros Data Analysis",
          lines: [
            "Consider incorporating strength training to complement your endurance activities.",
            "Your recovery metrics are improving. Continue monitoring your training load to optimize performance.",
          ],
        },
      ].map((item, idx) => (
        <AnalysisRow
          key={idx}
          iconSvg={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24px"
              height="24px"
              fill="currentColor"
              viewBox="0 0 256 256"
            >
              <path d="M232,208a8,8,0,0,1-8,8H32a8,8,0,0,1-8-8V48a8,8,0,0,1,16,0V156.69l50.34-50.35a8,8,0,0,1,11.32,0L128,132.69,180.69,80H160a8,8,0,0,1,0-16h40a8,8,0,0,1,8,8v40a8,8,0,0,1-16,0V91.31l-58.34,58.35a8,8,0,0,1-11.32,0L96,123.31,40,179.31V200H224A8,8,0,0,1,232,208Z" />
            </svg>
          }
          heading={item.heading}
          lines={item.lines}
        />
      ))}
    </>
  );
}
