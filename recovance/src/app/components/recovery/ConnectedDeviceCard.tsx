// components/Recovery/ConnectedDeviceCard.tsx
import React from "react";

interface ConnectedDeviceCardProps {
  iconSvg: React.ReactNode;
  deviceName: string;
  status: string;
}

export default function ConnectedDeviceCard({
  iconSvg,
  deviceName,
  status,
}: ConnectedDeviceCardProps) {
  return (
    <div className="flex items-center justify-between bg-[#111817] px-4 py-3">
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#283937] text-white">
          {iconSvg}
        </div>
        <p className="flex-1 truncate text-base font-normal leading-normal text-white">
          {deviceName}
        </p>
      </div>
      <p className="text-base font-normal leading-normal text-white">
        {status}
      </p>
    </div>
  );
}
