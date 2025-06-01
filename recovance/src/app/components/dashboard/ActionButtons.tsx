// components/Dashboard/ActionButtons.tsx
import React from "react";

export default function ActionButtons() {
  return (
    <>
      {/* Generate Today's Training Plan */}
      <div className="flex px-4 py-3 justify-start">
        <button className="flex min-w-[84px] max-w-[480px] items-center justify-center overflow-hidden rounded-full h-10 px-4 bg-[#c5ebe6] text-[#121616] text-sm font-bold leading-normal tracking-[0.015em] min-w-0">
          <span className="truncate">Generate Today&apos;s Training Plan</span>
        </button>
      </div>

      {/* Log New Session */}
      <div className="flex justify-end overflow-hidden px-5 pb-5">
        <button className="flex max-w-[480px] items-center justify-center overflow-hidden rounded-full h-14 px-5 bg-[#c5ebe6] text-[#121616] text-base font-bold leading-normal tracking-[0.015em] min-w-0 gap-4 pl-4 pr-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24px"
            height="24px"
            fill="currentColor"
            viewBox="0 0 256 256"
          >
            <path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z" />
          </svg>
          <span className="truncate">Log New Session</span>
        </button>
      </div>

      {/* Sync Wearables */}
      <div className="flex justify-end overflow-hidden px-5 pb-5">
        <button className="flex max-w-[480px] items-center justify-center overflow-hidden rounded-full h-14 px-5 bg-[#c5ebe6] text-[#121616] text-base font-bold leading-normal tracking-[0.015em] min-w-0 gap-4 pl-4 pr-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24px"
            height="24px"
            fill="currentColor"
            viewBox="0 0 256 256"
          >
            <path d="M160,40A88.09,88.09,0,0,0,81.29,88.67,64,64,0,1,0,72,216h88a88,88,0,0,0,0-176Zm0,160H72a48,48,0,0,1,0-96c1.1,0,2.2,0,3.29.11A88,88,0,0,0,72,128a8,8,0,0,0,16,0,72,72,0,1,1,72,72Zm37.66-93.66a8,8,0,0,1,0,11.32l-48,48a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L144,148.69l42.34-42.35A8,8,0,0,1,197.66,106.34Z" />
          </svg>
          <span className="truncate">Sync Wearables</span>
        </button>
      </div>

      {/* Update Recovery Notes */}
      <div className="flex justify-end overflow-hidden px-5 pb-5">
        <button className="flex max-w-[480px] items-center justify-center overflow-hidden rounded-full h-14 px-5 bg-[#c5ebe6] text-[#121616] text-base font-bold leading-normal tracking-[0.015em] min-w-0 gap-4 pl-4 pr-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24px"
            height="24px"
            fill="currentColor"
            viewBox="0 0 256 256"
          >
            <path d="M88,96a8,8,0,0,1,8-8h64a8,8,0,0,1,0,16H96A8,8,0,0,1,88,96Zm8,40h64a8,8,0,0,0,0-16H96a8,8,0,0,0,0,16Zm32,16H96a8,8,0,0,0,0,16h32a8,8,0,0,0,0-16ZM224,48V156.69A15.86,15.86,0,0,1,219.31,168L168,219.31A15.86,15.86,0,0,1,156.69,224H48a16,16,0,0,1-16-16V48A16,16,0,0,1,48,32H208A16,16,0,0,1,224,48ZM48,208H152V160a8,8,0,0,1,8-8h48V48H48Zm120-40v28.7L196.69,168Z" />
          </svg>
          <span className="truncate">Update Recovery Notes</span>
        </button>
      </div>
    </>
  );
}
