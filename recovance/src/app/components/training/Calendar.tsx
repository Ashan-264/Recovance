"use client";

import React, { useState, useEffect } from "react";

interface StravaActivity {
  id: number;
  type: string;
  name: string;
  start_date: string;
  start_date_local: string;
  moving_time: number;
  distance: number;
  total_elevation_gain: number;
  average_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
}

interface CalendarProps {
  activities?: StravaActivity[];
}

const daysOfWeek = ["S", "M", "T", "W", "T", "F", "S"];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function getActivityCountForDate(
  activities: StravaActivity[],
  year: number,
  month: number,
  day: number
): number {
  const targetDate = new Date(year, month, day).toISOString().split("T")[0];
  return activities.filter((activity) => {
    const activityDate = new Date(activity.start_date)
      .toISOString()
      .split("T")[0];
    return activityDate === targetDate;
  }).length;
}

function getActivitiesForDate(
  activities: StravaActivity[],
  year: number,
  month: number,
  day: number
): StravaActivity[] {
  const targetDate = new Date(year, month, day).toISOString().split("T")[0];
  return activities.filter((activity) => {
    const activityDate = new Date(activity.start_date)
      .toISOString()
      .split("T")[0];
    return activityDate === targetDate;
  });
}

function CalendarMonth({
  year,
  month,
  activities = [],
  onMonthChange,
  onDayClick,
}: {
  year: number;
  month: number;
  activities?: StravaActivity[];
  onMonthChange: (newYear: number, newMonth: number) => void;
  onDayClick: (activities: StravaActivity[], date: string) => void;
}) {
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfMonth = getFirstDayOfMonth(year, month);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const goToPreviousMonth = () => {
    if (month === 0) {
      onMonthChange(year - 1, 11);
    } else {
      onMonthChange(year, month - 1);
    }
  };

  const goToNextMonth = () => {
    if (month === 11) {
      onMonthChange(year + 1, 0);
    } else {
      onMonthChange(year, month + 1);
    }
  };

  return (
    <div className="min-w-72 max-w-[336px] flex-1 flex-col gap-0.5">
      <div className="flex items-center justify-between p-1">
        <button onClick={goToPreviousMonth}>
          <div
            className="flex h-10 w-10 items-center justify-center text-white hover:text-[#0cf2d0] transition"
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
        <p className="flex-1 text-center pr-10 text-base font-bold leading-tight text-white">
          {monthNames[month]} {year}
        </p>
        <button onClick={goToNextMonth}>
          <div
            className="flex h-10 w-10 items-center justify-center text-white hover:text-[#0cf2d0] transition"
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
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <div
            key={`empty-${year}-${month}-${i}`}
            className="h-12 w-full"
          ></div>
        ))}
        {days.map((day) => {
          const activityCount = getActivityCountForDate(
            activities,
            year,
            month,
            day
          );
          const hasActivities = activityCount > 0;

          const dayActivities = getActivitiesForDate(
            activities,
            year,
            month,
            day
          );

          return (
            <button
              key={`${year}-${month}-${day}`}
              className="h-12 w-full text-sm font-medium leading-normal text-white relative group"
              title={
                hasActivities
                  ? `${activityCount} activity${
                      activityCount > 1 ? "ies" : "y"
                    } on ${monthNames[month]} ${day}, ${year}`
                  : `No activities on ${monthNames[month]} ${day}, ${year}`
              }
              onClick={() => {
                if (hasActivities) {
                  const dateString = `${monthNames[month]} ${day}, ${year}`;
                  onDayClick(dayActivities, dateString);
                }
              }}
            >
              <div className="flex h-full w-full items-center justify-center relative">
                <span className="z-10">{day}</span>
                {hasActivities && (
                  <div className="absolute top-1 right-1">
                    <div className="bg-[#0cf2d0] text-[#111817] text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {activityCount > 9 ? "9+" : activityCount}
                    </div>
                  </div>
                )}
                {hasActivities && (
                  <div className="absolute inset-0 bg-[#0cf2d0] bg-opacity-20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Activity Details Modal Component
function ActivityDetailsModal({
  isOpen,
  onClose,
  activities,
  date,
}: {
  isOpen: boolean;
  onClose: () => void;
  activities: StravaActivity[];
  date: string;
}) {
  if (!isOpen) return null;

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const formatDistance = (meters: number) => {
    const km = (meters / 1000).toFixed(1);
    return `${km} km`;
  };

  const formatSpeed = (metersPerSecond: number) => {
    const kmh = (metersPerSecond * 3.6).toFixed(1);
    return `${kmh} km/h`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#1e2a28] rounded-lg border border-[#3b5450] p-6 max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">Activities on {date}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="bg-[#283937] rounded-lg p-4 border border-[#3b5450]"
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-lg font-semibold text-white">
                  {activity.name}
                </h4>
                <span className="bg-[#0cf2d0] text-[#111817] px-2 py-1 rounded text-sm font-bold">
                  {activity.type}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm text-gray-300">
                <div>
                  <span className="text-gray-400">Duration:</span>{" "}
                  {formatTime(activity.moving_time)}
                </div>
                <div>
                  <span className="text-gray-400">Distance:</span>{" "}
                  {formatDistance(activity.distance)}
                </div>
                <div>
                  <span className="text-gray-400">Avg Speed:</span>{" "}
                  {formatSpeed(activity.average_speed)}
                </div>
                <div>
                  <span className="text-gray-400">Elevation:</span>{" "}
                  {Math.round(activity.total_elevation_gain)}m
                </div>
                {activity.average_heartrate && (
                  <div>
                    <span className="text-gray-400">Avg HR:</span>{" "}
                    {Math.round(activity.average_heartrate)} bpm
                  </div>
                )}
                {activity.max_heartrate && (
                  <div>
                    <span className="text-gray-400">Max HR:</span>{" "}
                    {Math.round(activity.max_heartrate)} bpm
                  </div>
                )}
              </div>

              <div className="mt-2 text-xs text-gray-400">
                Started:{" "}
                {new Date(activity.start_date_local).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Calendar({ activities = [] }: CalendarProps) {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [selectedActivities, setSelectedActivities] = useState<
    StravaActivity[]
  >([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleMonthChange = (newYear: number, newMonth: number) => {
    setCurrentYear(newYear);
    setCurrentMonth(newMonth);
  };

  const handleDayClick = (dayActivities: StravaActivity[], date: string) => {
    setSelectedActivities(dayActivities);
    setSelectedDate(date);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedActivities([]);
    setSelectedDate("");
  };

  return (
    <>
      <CalendarMonth
        year={currentYear}
        month={currentMonth}
        activities={activities}
        onMonthChange={handleMonthChange}
        onDayClick={handleDayClick}
      />

      <ActivityDetailsModal
        isOpen={isModalOpen}
        onClose={closeModal}
        activities={selectedActivities}
        date={selectedDate}
      />
    </>
  );
}
