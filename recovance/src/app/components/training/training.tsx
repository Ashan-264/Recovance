// pages/training.tsx
import Head from "next/head";
import Header from "@/app/components/Header";
import TabNavigation from "@/app/components/training/TabNavigation";
import Calendar from "@/app/components/training/Calendar";
import UpcomingWorkouts from "@/app/components/training/UpcomingWorkouts";
import TrainingPlanLibrary from "@/app/components/training/TrainingPlanLibrary";
import AIRecommendations from "@/app/components/AISuggestions";
import ActionButtons from "@/app/components/ActionButtons";

export default function TrainingPage() {
  return (
    <>
      <Head>
        <title>Stitch Design · Training Plans</title>
      </Head>

      <div
        className="relative flex w-full min-h-screen flex-col bg-[#111817] overflow-x-hidden"
        style={{ fontFamily: "Inter, 'Noto Sans', sans-serif" }}
      >
        {/* Header at the top */}
        <Header />

        <div className="flex h-full grow flex-col">
          <div className="flex h-full flex-1 justify-center px-6 py-5">
            {/* Main content */}
            <div className="flex flex-1 flex-col max-w-[960px]">
              {/* 1. Header section (Title + Description) */}
              <div className="flex flex-wrap justify-between gap-3 p-4">
                <div className="flex min-w-72 flex-col gap-3">
                  <p className="text-[32px] font-bold leading-tight tracking-light text-white">
                    Training Plans
                  </p>
                  <p className="text-sm font-normal leading-normal text-[#9cbab5]">
                    Manage your workouts and training schedules
                  </p>
                </div>
              </div>

              {/* 2. Tabs */}
              <div className="pb-3">
                <TabNavigation />
              </div>

              {/* 3. Calendar */}
              <div className="flex flex-wrap items-center justify-center gap-6 p-4">
                <Calendar />
              </div>

              {/* 4. Upcoming Workouts */}
              <h2 className="px-4 pb-3 pt-5 text-[22px] font-bold leading-tight tracking-[-0.015em] text-white">
                Upcoming Workouts
              </h2>
              <div className="p-4">
                <UpcomingWorkouts />
              </div>

              {/* 5. Training Plan Library */}
              <h2 className="px-4 pb-3 pt-5 text-[22px] font-bold leading-tight tracking-[-0.015em] text-white">
                Training Plan Library
              </h2>
              <div className="flex overflow-y-auto p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <TrainingPlanLibrary />
              </div>

              {/* 6. AI Recommendations */}
              <h2 className="px-4 pb-3 pt-5 text-[22px] font-bold leading-tight tracking-[-0.015em] text-white">
                AI Recommendations
              </h2>
              <div className="p-4">
                <AIRecommendations />
              </div>

              {/* 7. Bottom Action Buttons */}
              <div className="flex justify-stretch">
                <div className="flex flex-1 flex-wrap justify-end gap-3 px-4 py-3">
                  <ActionButtons />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
