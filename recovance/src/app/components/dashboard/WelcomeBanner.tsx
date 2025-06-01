// components/Dashboard/WelcomeBanner.tsx
export default function WelcomeBanner() {
  return (
    <div className="flex flex-wrap justify-between gap-3 p-4">
      <div className="flex min-w-72 flex-col gap-3">
        <p className="text-white tracking-light text-[32px] font-bold leading-tight">
          Welcome back, Ashan!
        </p>
        <p className="text-[#a2b3b1] text-sm font-normal leading-normal">
          Today is October 26, 2024. You’re 87% recovered. Your nervous system
          is ready for high-volume strength training.
        </p>
      </div>
    </div>
  );
}
