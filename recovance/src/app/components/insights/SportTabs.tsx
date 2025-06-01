// components/Insights/SportTabs.tsx
import Link from "next/link";

const sports = [
  { label: "Cycling", href: "#" },
  { label: "Weightlifting", href: "#" },
  { label: "Climbing", href: "#" },
  { label: "Paddling", href: "#" },
  { label: "Calisthenics", href: "#" },
];

export default function SportTabs() {
  return (
    <div className="pb-3">
      <div className="flex border-b border-[#3b5450] px-4 gap-8">
        {sports.map((sport, i) => (
          <Link
            href={sport.href}
            key={sport.label}
            className={
              `flex flex-col items-center justify-center pb-[13px] pt-4 text-sm font-bold leading-normal tracking-[0.015em] ` +
              (i === 0
                ? "border-b-[3px] border-b-white text-white"
                : "border-b-[3px] border-b-transparent text-[#9db9b5]")
            }
          >
            <p>{sport.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
