// components/Insights/DeviceTabsAndCards.tsx
import React from "react";
import Link from "next/link";
import SportInsightCard from "./SportInsightCard"; // reuse for device charts if needed
import AnalysisRow from "./AnalysisRow";

// You can create smaller sub‐components if desired, but here’s an example:
const devices = ["Oura Ring", "Strava", "Garmin", "Coros"];

const deviceCardsData = [
  {
    title: "Sleep Duration and Quality",
    mainValue: "7.5 Hours, 85%",
    subLabel: "Last 7 Days",
    trendValue: "5%",
    trendPositive: true,
    chartSvg: (
      <svg
        width="100%"
        height="148"
        viewBox="-3 0 478 150"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        {/* … your same path/gradient definitions, with stroke="#9db9b5" … */}
        <path
          d="M0 109C18.1538 109 … V109Z"
          fill="url(#paint0_linear_1131_5935)"
        />
        <path
          d="M0 109C18.1538 109 … 472 25"
          stroke="#9db9b5"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <defs>
          <linearGradient
            id="paint0_linear_1131_5935"
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
      <svg
        width="100%"
        height="148"
        viewBox="-3 0 478 150"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        {/* … same SVG but you could change stroke color to #9db9b5 … */}
        <path
          d="M0 109C18.1538 109 … V109Z"
          fill="url(#paint0_linear_1131_5935)"
        />
        <path
          d="M0 109C18.1538 109 … 472 25"
          stroke="#9db9b5"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <defs>
          <linearGradient
            id="paint0_linear_1131_5935"
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
      <svg
        width="100%"
        height="148"
        viewBox="-3 0 478 150"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        {/* …same pattern… */}
        <path
          d="M0 109C18.1538 109 … V109Z"
          fill="url(#paint0_linear_1131_5935)"
        />
        <path
          d="M0 109C18.1538 109 … 472 25"
          stroke="#9db9b5"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <defs>
          <linearGradient
            id="paint0_linear_1131_5935"
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
    ),
    xLabels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  },
  // …and so on for the other device cards (Training Load, VO2 Max, etc.)…
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
                  : "border-b-[3px] border-b-transparent text-[#9db9b5]")
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
              <path d="M232,208a8,8,0,0,1-8,8H32 … 48Z" />
            </svg>
          }
          heading={item.heading}
          lines={item.lines}
        />
      ))}
    </>
  );
}
