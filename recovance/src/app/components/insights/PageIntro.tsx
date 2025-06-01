// components/Insights/PageIntro.tsx
export default function PageIntro() {
  return (
    <div className="flex flex-wrap justify-between gap-3 p-4">
      <div className="flex min-w-72 flex-col gap-3">
        <p className="text-white tracking-light text-[32px] font-bold leading-tight">
          Insights
        </p>
        <p className="text-[#9db9b5] text-sm font-normal leading-normal">
          Personalized analysis and actionable insights to optimize your
          performance and recovery.
        </p>
      </div>
    </div>
  );
}
