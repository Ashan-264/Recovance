"use client";

// components/Header.tsx
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/training", label: "Training" },
  { href: "/recovery", label: "Recovery" },
  { href: "/insights", label: "Insights" },
  { href: "/connect", label: "Connect" },
  { href: "/coming-soon", label: "Coming up" },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#283936] px-6 py-3 md:px-10">
      {/* Left: Logo + Title */}
      <Link href="/" className="flex items-center gap-3 text-white">
        <div className="size-4">
          <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M2 24H12L18 8L28 40L34 22L38 30H46"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em]">
          Recovance
        </h2>
      </Link>

      {/* Right: navigation with the current tab highlighted */}
      <nav className="flex items-center gap-1 overflow-x-auto">
        {LINKS.map((link) => {
          const active =
            pathname === link.href || pathname?.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`rounded-full px-3 py-1.5 text-sm font-medium leading-normal transition ${
                active
                  ? "bg-[#0cf2d0]/15 font-bold text-[#0cf2d0]"
                  : "text-[#9cbab5] hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
