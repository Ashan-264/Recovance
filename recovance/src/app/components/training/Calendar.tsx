// components/Calendar.tsx
import React from "react";

const daysOfWeek = ["S", "M", "T", "W", "T", "F", "S"];

const julyDays = Array.from({ length: 31 }, (_, i) => i + 1);
const augustDays = Array.from({ length: 31 }, (_, i) => i + 1);

function CalendarMonth({
  monthName,
  days,
  highlightDay,
  prevButton,
  nextButton,
}: {
  monthName: string;
  days: number[];
  highlightDay?: number;
  prevButton?: React.ReactNode;
  nextButton?: React.ReactNode;
}) {
  // We assume July 2024 starts on Monday (i.e., index = 1) – adjust if needed
  const startIndex = monthName === "July 2024" ? 1 : 4; // July 1 = Monday, August 1 = Thursday

  return (
    <div className="min-w-72 max-w-[336px] flex-1 flex-col gap-0.5">
      <div className="flex items-center justify-between p-1">
        {prevButton}
        <p className="flex-1 text-center pr-10 text-base font-bold leading-tight text-white">
          {monthName}
        </p>
        {nextButton}
      </div>
      <div className="grid grid-cols-7">
        {daysOfWeek.map((d, index) => (
          <p
            key={`day-${index}`}
            className="flex h-12 w-full items-center justify-center pb-0.5 text-[13px] font-bold leading-normal tracking-[0.015em] text-white"
          >
            {d}
          </p>
        ))}
        {/* Fill empty slots before month starts */}
        {Array.from({ length: startIndex }).map((_, i) => (
          <div key={`empty-${monthName}-${i}`} className="h-12 w-full"></div>
        ))}
        {days.map((day) => {
          const isHighlighted = highlightDay === day;
          return (
            <button
              key={`${monthName}-${day}`}
              className={`h-12 w-full text-sm font-medium leading-normal ${
                isHighlighted ? "text-[#111817]" : "text-white"
              }`}
            >
              <div
                className={`flex h-full w-full items-center justify-center rounded-full ${
                  isHighlighted ? "bg-[#0cf2d0]" : ""
                }`}
              >
                {day}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function Calendar() {
  return (
    <>
      <CalendarMonth
        monthName="July 2024"
        days={julyDays}
        highlightDay={5}
        prevButton={
          <button>
            <div
              className="flex h-10 w-10 items-center justify-center text-white"
              title="Previous month"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                fill="currentColor"
                viewBox="0 0 256 256"
              >
                <path d="M165.66,202.34a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L91.31,128Z"></path>
              </svg>
            </div>
          </button>
        }
        nextButton={null}
      />

      <CalendarMonth
        monthName="August 2024"
        days={augustDays}
        highlightDay={1}
        prevButton={null}
        nextButton={
          <button>
            <div
              className="flex h-10 w-10 items-center justify-center text-white"
              title="Next month"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                fill="currentColor"
                viewBox="0 0 256 256"
              >
                <path d="M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z"></path>
              </svg>
            </div>
          </button>
        }
      />
    </>
  );
}
