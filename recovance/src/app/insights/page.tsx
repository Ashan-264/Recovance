// pages/insights.tsx
import Head from "next/head";
import {
  InsightsHeader,
  PageIntro,
  SportTabs,
  SportInsightCard,
  AnalysisRow,
  DeviceTabsAndCards,
} from "@/app/components/insights";

export default function InsightsPage() {
  // Example inline SVG for “Cycling Power Output” card
  const cyclingPowerSvg = (
    <svg
      width="100%"
      height="148"
      viewBox="-3 0 478 150"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
    >
      <path
        d="M0 109C18.1538 109 18.1538 21 … V109Z"
        fill="url(#paint0_linear_1131_5935)"
      />
      <path
        d="M0 109C18.1538 109 18.1538 21 … 472 25"
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
  );

  return (
    <>
      <Head>
        <title>Stitch Design · Insights</title>
        {/* Google Fonts & Tailwind JS should already be loaded in _app.tsx or a root layout */}
      </Head>

      <div
        className="relative flex w-full min-h-screen flex-col bg-[#111817] overflow-x-hidden"
        style={{ fontFamily: `Inter, "Noto Sans", sans-serif` }}
      >
        <div className="layout-container flex h-full grow flex-col">
          {/* 1. Header */}
          <InsightsHeader />

          <div className="px-40 flex flex-1 justify-center py-5">
            <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
              {/* 2. Page Intro (Title + subtitle) */}
              <PageIntro />

              {/* 3. Sport‐Specific Tabs */}
              <h2 className="text-white text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">
                Sport‐Specific Insights
              </h2>
              <SportTabs />

              {/* 4. Sport Cards Row: Cycling + Distance/Elevation + Training Load */}
              <div className="flex flex-wrap gap-4 px-4 py-6">
                <SportInsightCard
                  title="Cycling Power Output"
                  mainValue="250W Average Power"
                  subLabel="Last 7 Days"
                  trendValue="5%"
                  trendPositive={true}
                  chartSvg={cyclingPowerSvg}
                  xLabels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
                />
                <SportInsightCard
                  title="Cycling Distance and Elevation"
                  mainValue="100 km, 1500 m"
                  subLabel="Last 7 Days"
                  trendValue="10%"
                  trendPositive={true}
                  // (Here we used a “bar‐style” grid in your HTML, so you could build that as a custom SVG or simple div‐grid)
                  chartSvg={
                    <div className="grid min-h-[180px] grid-flow-col gap-6 grid-rows-[1fr_auto] items-end justify-items-center px-3">
                      <div
                        className="border-[#9db9b5] bg-[#283936] border-t-2 w-full"
                        style={{ height: "20%" }}
                      />
                      <p className="text-[#9db9b5] text-[13px] font-bold leading-normal tracking-[0.015em]">
                        Distance, Elevation
                      </p>
                    </div>
                  }
                  xLabels={[]} // No day labels at bottom for this particular design
                />
                <SportInsightCard
                  title="Cycling Training Load"
                  mainValue="1500 TSS"
                  subLabel="Last 7 Days"
                  trendValue="10%"
                  trendPositive={true}
                  chartSvg={cyclingPowerSvg /* reuse same SVG for simplicity */}
                  xLabels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
                />
              </div>

              {/* 5. Performance Analysis Rows */}
              <AnalysisRow
                iconSvg={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24px"
                    height="24px"
                    fill="currentColor"
                    viewBox="0 0 256 256"
                  >
                    <path d="M232,208a8,8,0,0,1-8,…48Z" />
                  </svg>
                }
                heading="Cycling Performance Analysis"
                lines={[
                  "Consider incorporating hill repeats to enhance your climbing ability.",
                  "Your average power output has increased by 5% over the last week. Continue focusing on interval training to improve your peak power.",
                ]}
              />

              {/* 6. Weightlifting Cards + Analysis */}
              <div className="flex flex-wrap gap-4 px-4 py-6">
                <SportInsightCard
                  title="Weightlifting Volume"
                  mainValue="5000 kg"
                  subLabel="Last 7 Days"
                  trendValue="10%"
                  trendPositive={true}
                  chartSvg={
                    <div className="grid min-h-[180px] grid-flow-col gap-6 grid-rows-[1fr_auto] items-end justify-items-center px-3">
                      <div
                        className="border-[#9db9b5] bg-[#283936] border-t-2 w-full"
                        style={{ height: "40%" }}
                      />
                      <p className="text-[#9db9b5] text-[13px] font-bold leading-normal tracking-[0.015em]">
                        Muscle Groups
                      </p>
                    </div>
                  }
                  xLabels={[]}
                />
                <SportInsightCard
                  title="Weightlifting Max Effort"
                  mainValue="150 kg"
                  subLabel="Last 7 Days"
                  trendValue="5%"
                  trendPositive={true}
                  chartSvg={
                    <div className="grid min-h-[180px] grid-flow-col gap-6 grid-rows-[1fr_auto] items-end justify-items-center px-3">
                      <div
                        className="border-[#9db9b5] bg-[#283936] border-t-2 w-full"
                        style={{ height: "50%" }}
                      />
                      <p className="text-[#9db9b5] text-[13px] font-bold leading-normal tracking-[0.015em]">
                        Lifts
                      </p>
                    </div>
                  }
                  xLabels={[]}
                />
                <SportInsightCard
                  title="Weightlifting Progression"
                  mainValue="+10%"
                  subLabel="Last 30 Days"
                  trendValue="10%"
                  trendPositive={true}
                  chartSvg={cyclingPowerSvg /* reuse same SVG */}
                  xLabels={["Week 1", "Week 2", "Week 3", "Week 4"]}
                />
              </div>

              <AnalysisRow
                iconSvg={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24px"
                    height="24px"
                    fill="currentColor"
                    viewBox="0 0 256 256"
                  >
                    <path d="M232,208a8,8,0,0,1-8,…48Z" />
                  </svg>
                }
                heading="Weightlifting Performance Analysis"
                lines={[
                  "Consider incorporating more compound exercises to maximize muscle activation.",
                  "Your total lifting volume has increased significantly. Focus on maintaining proper form to prevent injuries.",
                ]}
              />

              {/* 7. Climbing Cards + Analysis */}
              <div className="flex flex-wrap gap-4 px-4 py-6">
                <SportInsightCard
                  title="Climbing Route Grades"
                  mainValue="V5 Average"
                  subLabel="Last 7 Days"
                  trendValue="1 Grade"
                  trendPositive={true}
                  chartSvg={
                    <div className="grid min-h-[180px] grid-flow-col gap-6 grid-rows-[1fr_auto] items-end justify-items-center px-3">
                      <div
                        className="border-[#9db9b5] bg-[#283936] border-t-2 w-full"
                        style={{ height: "80%" }}
                      />
                      <p className="text-[#9db9b5] text-[13px] font-bold leading-normal tracking-[0.015em]">
                        Grades
                      </p>
                    </div>
                  }
                  xLabels={[]}
                />
                <SportInsightCard
                  title="Climbing Session Duration"
                  mainValue="2 Hours"
                  subLabel="Last 7 Days"
                  trendValue="30 Minutes"
                  trendPositive={true}
                  chartSvg={cyclingPowerSvg}
                  xLabels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
                />
                <SportInsightCard
                  title="Climbing Grip Load"
                  mainValue="High"
                  subLabel="Last 7 Days"
                  trendValue="N/A"
                  trendPositive={true}
                  chartSvg={cyclingPowerSvg}
                  xLabels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
                />
              </div>

              <AnalysisRow
                iconSvg={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24px"
                    height="24px"
                    fill="currentColor"
                    viewBox="0 0 256 256"
                  >
                    <path d="M232,208a8,8,0,0,1-8,…48Z" />
                  </svg>
                }
                heading="Climbing Performance Analysis"
                lines={[
                  "Consider incorporating hangboard exercises to improve grip strength.",
                  "You’ve been consistently climbing harder routes. Focus on maintaining your power endurance.",
                ]}
              />

              {/* 8. Paddling Cards + Analysis */}
              <div className="flex flex-wrap gap-4 px-4 py-6">
                <SportInsightCard
                  title="Paddling Stroke Rate"
                  mainValue="60 Strokes/Min"
                  subLabel="Last 7 Days"
                  trendValue="5%"
                  trendPositive={true}
                  chartSvg={cyclingPowerSvg}
                  xLabels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
                />
                <SportInsightCard
                  title="Paddling Distance"
                  mainValue="20 km"
                  subLabel="Last 7 Days"
                  trendValue="10%"
                  trendPositive={true}
                  chartSvg={cyclingPowerSvg}
                  xLabels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
                />
                <SportInsightCard
                  title="Paddling Efficiency"
                  mainValue="High"
                  subLabel="Last 7 Days"
                  trendValue="N/A"
                  trendPositive={true}
                  chartSvg={cyclingPowerSvg}
                  xLabels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
                />
              </div>

              <AnalysisRow
                iconSvg={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24px"
                    height="24px"
                    fill="currentColor"
                    viewBox="0 0 256 256"
                  >
                    <path d="M232,208a8,8,0,0,1-8,…48Z" />
                  </svg>
                }
                heading="Paddling Performance Analysis"
                lines={[
                  "Consider incorporating interval training to improve your paddling speed.",
                  "Your paddling efficiency remains high. Focus on maintaining your stroke rate and distance.",
                ]}
              />

              {/* 9. Calisthenics Cards + Analysis */}
              <div className="flex flex-wrap gap-4 px-4 py-6">
                <SportInsightCard
                  title="Calisthenics Reps and Sets"
                  mainValue="100 Reps, 10 Sets"
                  subLabel="Last 7 Days"
                  trendValue="5%"
                  trendPositive={true}
                  chartSvg={cyclingPowerSvg}
                  xLabels={["Monday Exercises"]} // you can make a custom layout if you prefer
                />
                <SportInsightCard
                  title="Calisthenics Progression"
                  mainValue="+10%"
                  subLabel="Last 30 Days"
                  trendValue="10%"
                  trendPositive={true}
                  chartSvg={
                    <div className="grid min-h-[180px] grid-flow-col gap-6 grid-rows-[1fr_auto] items-end justify-items-center px-3">
                      <div
                        className="border-[#9db9b5] bg-[#283936] border-t-2 w-full"
                        style={{ height: "20%" }}
                      />
                      <p className="text-[#9db9b5] text-[13px] font-bold leading-normal tracking-[0.015em]">
                        Week 1
                      </p>
                      <div
                        className="border-[#9db9b5] bg-[#283936] border-t-2 w-full"
                        style={{ height: "70%" }}
                      />
                      <p className="text-[#9db9b5] text-[13px] font-bold leading-normal tracking-[0.015em]">
                        Week 2
                      </p>
                      <div
                        className="border-[#9db9b5] bg-[#283936] border-t-2 w-full"
                        style={{ height: "40%" }}
                      />
                      <p className="text-[#9db9b5] text-[13px] font-bold leading-normal tracking-[0.015em]">
                        Week 3
                      </p>
                      <div
                        className="border-[#9db9b5] bg-[#283936] border-t-2 w-full"
                        style={{ height: "60%" }}
                      />
                      <p className="text-[#9db9b5] text-[13px] font-bold leading-normal tracking-[0.015em]">
                        Week 4
                      </p>
                    </div>
                  }
                  xLabels={[]}
                />
                <SportInsightCard
                  title="Calisthenics Muscle Activation"
                  mainValue="High"
                  subLabel="Last 7 Days"
                  trendValue="N/A"
                  trendPositive={true}
                  chartSvg={cyclingPowerSvg}
                  xLabels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
                />
              </div>

              <AnalysisRow
                iconSvg={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24px"
                    height="24px"
                    fill="currentColor"
                    viewBox="0 0 256 256"
                  >
                    <path d="M232,208a8,8,0,0,1-8,…48Z" />
                  </svg>
                }
                heading="Calisthenics Performance Analysis"
                lines={[
                  "Consider incorporating plyometrics to improve power output.",
                  "Your calisthenics progression is steady. Focus on increasing the difficulty of your exercises.",
                ]}
              />

              {/* 10. Device‐Specific Insights */}
              <h2 className="text-white text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">
                Device‐Specific Insights
              </h2>
              <DeviceTabsAndCards />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
