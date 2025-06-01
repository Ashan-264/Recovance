// components/TrendVisualizer.tsx
import Image from "next/image";

export default function TrendVisualizer() {
  return (
    <section className="w-full px-6 py-8">
      <h2 className="text-2xl font-semibold text-white mb-4">
        Trend Visualizer
      </h2>
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-white text-sm">
              Training Load vs. Recovery Score
            </p>
            <h3 className="text-xl font-bold text-white">7–30 Days</h3>
            <p className="text-green-400 text-sm">7–30 Days +10%</p>
          </div>
          {/* If you have a numeric indicator or legend, place it here. */}
        </div>
        {/* Placeholder for the line chart */}
        <div className="relative h-48 w-full">
          <Image
            src="/images/trend-chart-placeholder.png"
            alt="Trend chart placeholder"
            layout="fill"
            objectFit="contain"
          />
        </div>
        <div className="hidden md:flex justify-between text-gray-400 text-xs mt-2 px-2">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
