// pages/recovery.tsx
import Head from "next/head";
import Header from "@/app/components/Header";
import {
  RecoveryHeader,
  RecoveryScoreSection,
  MetricsTabs,
  MetricCard,
  InterventionCard,
  HistoricalTrendCard,
  ConnectedDeviceCard,
} from "@/app/components/recovery";
import Link from "next/link";

export default function RecoveryPage() {
  // For simplicity, we hard‐code the same SVG bodies you provided. In a real app, you might:
  // ① Move each SVG into its own file, or
  // ② Use a charting library (Chart.js / Recharts / etc.) instead of inline SVG.
  const sleepDurationSvg = (
    <>
      <svg
        width="100%"
        height="148"
        viewBox="-3 0 478 150"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <path
          d="M0 109C18.1538 109 18.1538 21 36.3077 21C54.4615 21 54.4615 41 72.6154 41C90.7692 41 90.7692 93 108.923 93C127.077 93 127.077 33 145.231 33C163.385 33 163.385 101 181.538 101C199.692 101 199.692 61 217.846 61C236 61 236 45 254.154 45C272.308 45 272.308 121 290.462 121C308.615 121 308.615 149 326.769 149C344.923 149 344.923 1 363.077 1C381.231 1 381.231 81 399.385 81C417.538 81 417.538 129 435.692 129C453.846 129 453.846 25 472 25V149H326.769H0V109Z"
          fill="url(#paint0_linear_1131_5935)"
        />
        <path
          d="M0 109C18.1538 109 18.1538 21 36.3077 21C54.4615 21 54.4615 41 72.6154 41C90.7692 41 90.7692 93 108.923 93C127.077 93 127.077 33 145.231 33C163.385 33 163.385 101 181.538 101C199.692 101 199.692 61 217.846 61C236 61 236 45 254.154 45C272.308 45 272.308 121 290.462 121C308.615 121 308.615 149 326.769 149C344.923 149 344.923 1 363.077 1C381.231 1 381.231 81 399.385 81C417.538 81 417.538 129 435.692 129C453.846 129 453.846 25 472 25"
          stroke="#9cbab5"
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
            <stop stopColor="#283937" />
            <stop offset="1" stopColor="#283937" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </>
  );

  // Re‐use the same SVG for Sleep Stages and Sleep Efficiency; in a real app you could swap data.
  const sleepStagesSvg = sleepDurationSvg;
  const sleepEfficiencySvg = sleepDurationSvg;

  const hrvSvg = sleepDurationSvg; // re‐use for demonstration
  const rhrSvg = sleepDurationSvg;
  const sorenessSvg = sleepDurationSvg;

  // Icons for InterventionCard
  const moonIcon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      fill="currentColor"
      viewBox="0 0 256 256"
    >
      <path d="M233.54,142.23a8,8,0,0,0-8-2,88.08,88.08,0,0,1-109.8-109.8,8,8,0,0,0-10-10,104.84,104.84,0,0,0-52.91,37A104,104,0,0,0,136,224a103.09,103.09,0,0,0,62.52-20.88,104.84,104.84,0,0,0,37-52.91A8,8,0,0,0,233.54,142.23ZM188.9,190.34A88,88,0,0,1,65.66,67.11a89,89,0,0,1,31.4-26A106,106,0,0,0,96,56,104.11,104.11,0,0,0,200,160a106,106,0,0,0,14.92-1.06A89,89,0,0,1,188.9,190.34Z"></path>
    </svg>
  );
  const bicycleIcon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      fill="currentColor"
      viewBox="0 0 256 256"
    >
      <path d="M208,112a47.81,47.81,0,0,0-16.93,3.09L165.93,72H192a8,8,0,0,1,8,8,8,8,0,0,0,16,0,24,24,0,0,0-24-24H152a8,8,0,0,0-6.91,12l11.65,20H99.26L82.91,60A8,8,0,0,0,76,56H48a8,8,0,0,0,0,16H71.41L85.12,95.51,69.41,117.06a48.13,48.13,0,1,0,12.92,9.44l11.59-15.9L125.09,164A8,8,0,1,0,138.91,156l-30.32-52h57.48l11.19,19.17A48,48,0,1,0,208,112ZM80,160a32,32,0,1,1-20.21-29.74l-18.25,25a8,8,0,1,0,12.92,9.42l18.25-25A31.88,31.88,0,0,1,80,160Zm128,32a32,32,0,0,1-22.51-54.72L201.09,164A8,8,0,1,0,214.91,156L199.3,129.21A32,32,0,1,1,208,192Z"></path>
    </svg>
  );
  const barbellIcon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      fill="currentColor"
      viewBox="0 0 256 256"
    >
      <path d="M248,120h-8V88a16,16,0,0,0-16-16H208V64a16,16,0,0,0-16-16H168a16,16,0,0,0-16,16v56H104V64A16,16,0,0,0,88,48H64A16,16,0,0,0,48,64v8H32A16,16,0,0,0,16,88v32H8a8,8,0,0,0,0,16h8v32a16,16,0,0,0,16,16H48v8a16,16,0,0,0,16,16H88a16,16,0,0,0,16-16V136h48v56a16,16,0,0,0,16,16h24a16,16,0,0,0,16-16v-8h16a16,16,0,0,0,16-16V136h8a8,8,0,0,0,0-16ZM32,168V88H48v80Zm56,24H64V64H88V192Zm104,0H168V64h24V175.82c0,.06,0,.12,0,.18s0,.12,0,.18V192Zm32-24H208V88h16Z"></path>
    </svg>
  );

  return (
    <>
      <Head>
        <title>Stitch Design · Recovery</title>
        {/* Google Fonts & Tailwind JS already loaded via _app.tsx or layout */}
      </Head>

      <div className="relative flex w-full min-h-screen flex-col bg-[#111817] overflow-x-hidden">
        {/* Header at the top */}
        <Header />

        <div className="flex h-full flex-1 justify-center">
          {/* Main content */}
          <div className="flex flex-1 flex-col max-w-[960px]">
            {/* 1. Recovery Header */}
            <RecoveryHeader />

            {/* 2. Recovery Score */}
            <RecoveryScoreSection />

            {/* 3. Metrics Tabs */}
            <MetricsTabs />

            {/* 4. Metric Cards: Sleep Duration */}
            <div className="flex flex-wrap gap-4 px-4 py-6">
              <MetricCard
                title="Sleep Duration"
                mainValue="7.5 hrs"
                subLabel="Last 7 Days"
                trendValue="5%"
                trendPositive={true}
                chartSvg={sleepDurationSvg}
                xLabels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
              />
            </div>

            {/* 5. Metric Card: Sleep Stages */}
            <div className="flex flex-wrap gap-4 px-4 py-6">
              <MetricCard
                title="Sleep Stages"
                mainValue="2 hrs Deep"
                subLabel="Last 7 Days"
                trendValue="10%"
                trendPositive={true}
                chartSvg={sleepStagesSvg}
                xLabels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
              />
              {/* Sleep Efficiency card */}
              <MetricCard
                title="Sleep Efficiency"
                mainValue="90%"
                subLabel="Last 7 Days"
                trendValue="2%"
                trendPositive={true}
                chartSvg={sleepEfficiencySvg}
                xLabels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
              />
            </div>

            {/* 6. Metric Tabs "HRV" */}
            <div className="pb-3">
              <div className="flex border-b border-[#3b5450] px-4 gap-8">
                <Link
                  href="#"
                  className="flex flex-col items-center justify-center border-b-[3px] border-b-transparent pb-[13px] pt-4 text-[#9cbab5]"
                >
                  <p className="text-sm font-bold leading-normal tracking-[0.015em]">
                    Sleep
                  </p>
                </Link>
                <Link
                  href="#"
                  className="flex flex-col items-center justify-center border-b-[3px] border-b-white pb-[13px] pt-4 text-white"
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

            {/* 7. Metric Cards for HRV, RHR, Muscle Soreness */}
            <div className="flex flex-wrap gap-4 px-4 py-6">
              <MetricCard
                title="Heart Rate Variability"
                mainValue="65 ms"
                subLabel="Last 7 Days"
                trendValue="2%"
                trendPositive={false}
                chartSvg={hrvSvg}
                xLabels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
              />
              <MetricCard
                title="Resting Heart Rate"
                mainValue="55 bpm"
                subLabel="Last 7 Days"
                trendValue="1%"
                trendPositive={true}
                chartSvg={rhrSvg}
                xLabels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
              />
              <MetricCard
                title="Muscle Soreness"
                mainValue="Low"
                subLabel="Last 7 Days"
                trendValue="0%"
                trendPositive={true}
                chartSvg={sorenessSvg}
                xLabels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
              />
            </div>

            {/* 8. Recovery Interventions & Recommendations */}
            <h2 className="px-4 pb-3 pt-5 text-[22px] font-bold leading-tight tracking-[-0.015em] text-white">
              Recovery Interventions and Recommendations
            </h2>
            <div className="flex flex-col gap-4 bg-[#111817]">
              <InterventionCard
                iconSvg={moonIcon}
                heading="Aim for 8 hours of sleep"
                description="Prioritize sleep tonight"
              />
              <InterventionCard
                iconSvg={bicycleIcon}
                heading="Engage in light cycling or swimming"
                description="Active recovery recommended"
              />
              <InterventionCard
                iconSvg={barbellIcon}
                heading="Reduce lifting volume by 20%"
                description="Consider reducing training volume"
              />
            </div>

            {/* 10. Historical Data & Trends */}
            <h2 className="px-4 pb-3 pt-5 text-[22px] font-bold leading-tight tracking-[-0.015em] text-white">
              Historical Data and Trends
            </h2>
            <div className="flex flex-wrap gap-4 px-4 py-6">
              <HistoricalTrendCard
                title="Recovery Score Trend"
                mainValue="70"
                subLabel="Last 30 Days"
                trendValue="5%"
                trendPositive={true}
                chartSvg={
                  sleepDurationSvg
                } /* Swap in actual "30-day" SVG if available */
                xLabels={["Week 1", "Week 2", "Week 3", "Week 4"]}
              />
            </div>

            {/* 11. Connected Devices and Data Sync */}
            <h2 className="px-4 pb-3 pt-5 text-[22px] font-bold leading-tight tracking-[-0.015em] text-white">
              Connected Devices and Data Sync
            </h2>
            <ConnectedDeviceCard
              iconSvg={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="currentColor"
                  viewBox="0 0 256 256"
                >
                  <path d="M208,128a79.94,79.94,0,0,0-32.7-64.47l-6.24-34.38A16,16,0,0,0,153.32,16H102.68A16,16,0,0,0,86.94,29.15L80.7,63.53a79.9,79.9,0,0,0,0,128.94l6.24,34.38A16,16,0,0,0,102.68,240h50.64a16,16,0,0,0,15.74-13.15l6.24-34.38A79.94,79.94,0,0,0,208,128ZM102.68,32h50.64l3.91,21.55a79.75,79.75,0,0,0-58.46,0ZM64,128a64,64,0,1,1,64,64A64.07,64.07,0,0,1,64,128Zm89.32,96H102.68l-3.91-21.55a79.75,79.75,0,0,0,58.46,0ZM120,128V88a8,8,0,0,1,16,0v32h32a8,8,0,0,1,0,16H128A8,8,0,0,1,120,128Z"></path>
                </svg>
              }
              deviceName="Wearable Device"
              status="Connected"
            />
            <ConnectedDeviceCard
              iconSvg={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="currentColor"
                  viewBox="0 0 256 256"
                >
                  <path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,160H40V56H216V200ZM80,84A12,12,0,1,1,68,72,12,12,0,0,1,80,84Zm40,0a12,12,0,1,1-12-12A12,12,0,0,1,120,84Z"></path>
                </svg>
              }
              deviceName="Fitness App"
              status="Connected"
            />
            <div className="flex justify-end px-4 py-3">
              <button className="h-10 w-fit rounded-xl bg-[#283937] px-4 text-sm font-bold leading-normal text-white tracking-[0.015em]">
                Sync Data
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
