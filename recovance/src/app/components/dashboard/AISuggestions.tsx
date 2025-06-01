// components/Dashboard/AISuggestions.tsx
import React from "react";

interface AISuggestionCardProps {
  title: string;
  subtitle: string;
  bgImageUrl: string;
}

function AISuggestionCard({
  title,
  subtitle,
  bgImageUrl,
}: AISuggestionCardProps) {
  return (
    <div className="p-4">
      <div
        className="bg-cover bg-center flex flex-col items-stretch justify-end rounded-xl pt-[132px]"
        style={{
          backgroundImage: `linear-gradient(0deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0) 100%), url("${bgImageUrl}")`,
        }}
      >
        <div className="flex w-full items-end justify-between gap-4 p-4">
          <div className="flex max-w-[440px] flex-1 flex-col gap-1">
            <p className="text-white tracking-light text-2xl font-bold leading-tight max-w-[440px]">
              {title}
            </p>
            <p className="text-white text-base font-medium leading-normal">
              {subtitle}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AISuggestions() {
  return (
    <>
      <h2 className="text-white text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">
        Today&apos;s AI Suggestions
      </h2>

      <AISuggestionCard
        title="Recovery Ride Recommended"
        subtitle="Keep HR below 130 BPM"
        bgImageUrl="https://lh3.googleusercontent.com/aida-public/AB6AXuBvXNNp3j5Kb53V6E4szv64P5XlHtigg93GHlp0QXFd_evcYTcdKeK0aXgFUBdjCDs9WbiR37su3HDIwGzQ401Ua0v1UvmqeGlI_m990l-3ZkOBBLR01rDS_CkGClAAuGYi4t-XC66RvmILObU2yXqhv06lJMUd4wpHAo_NiFBDUyM7SQMO9pw6AcPkw8OzqyWXP3_pAK0OEsMbgrWYB6gYfl_Q-GaV4jfIIDvgd3gKhChYOfgS95u0V3FM-sezD1ZbtmmwE8xS_N5v"
      />

      <AISuggestionCard
        title="Delay Grip-Intensive Training"
        subtitle="Prioritize mobility + core instead"
        bgImageUrl="https://lh3.googleusercontent.com/aida-public/AB6AXuBryVUwEaYf9BDXE-wzDbU6OgjshKYwYfDN2DXoAgQgz4IuodiKYPZwKmXZimwOaVBvGB3MhnMRLaGNhACgCbeU5ckqgakrgv5x6PhSmzBjwL9bEnLXbAYijoXD30U24dxmqe4qUptB4V9aNra2r7oHKpxO5CjHaHCmBV0NSXTFqP-P6LWjEkzympj-qOS_PxGEHhzZmtFfiNEGjJnWuWyI7opoiDEixx4b0BScfZd1YLs5jnl77LRBiMC2DYpAu-WVX9Xbf4kkbnRs"
      />
    </>
  );
}
