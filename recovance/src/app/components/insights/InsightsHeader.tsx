// components/Insights/InsightsHeader.tsx
import Link from "next/link";

export default function InsightsHeader() {
  return (
    <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#283936] px-10 py-3">
      {/* Left: Logo + Title */}
      <div className="flex items-center gap-4 text-white">
        <div className="size-4">
          <svg
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* … the same two <path> elements from your HTML … */}
            <path
              d="M39.5563 34.1455V13.8546C39.5563 … 34.1455Z"
              fill="currentColor"
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M10.4485 13.8519C10.4749 … 13.8519Z"
              fill="currentColor"
            />
          </svg>
        </div>
        <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em]">
          Recovance
        </h2>
      </div>

      {/* Right: Navigation Links + Bell + Avatar */}
      <div className="flex flex-1 justify-end gap-8">
        <nav className="flex items-center gap-9">
          <Link
            href="/dashboard"
            className="text-white text-sm font-medium leading-normal"
          >
            Dashboard
          </Link>
          <Link
            href="/training"
            className="text-white text-sm font-medium leading-normal"
          >
            Training
          </Link>
          <Link
            href="/recovery"
            className="text-white text-sm font-medium leading-normal"
          >
            Recovery
          </Link>
          <Link
            href="/insights"
            className="text-white text-sm font-medium leading-normal"
          >
            Insights
          </Link>
          <Link
            href="/community"
            className="text-white text-sm font-medium leading-normal"
          >
            Community
          </Link>
        </nav>

        {/* Notification Bell */}
        <button className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 bg-[#283936] text-white gap-2 text-sm font-bold leading-normal tracking-[0.015em] min-w-0 px-2.5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20px"
            height="20px"
            fill="currentColor"
            viewBox="0 0 256 256"
          >
            <path d="M221.8,175.94C216.25 … 48Z" />
          </svg>
        </button>

        {/* Avatar */}
        <div
          className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10"
          style={{
            backgroundImage: `url("https://lh3.googleusercontent.com/aida-public/…")`,
          }}
        />
      </div>
    </header>
  );
}
