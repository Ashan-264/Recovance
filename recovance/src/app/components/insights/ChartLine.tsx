"use client";

import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
  TooltipItem,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
);

interface Props {
  labels: string[];
  values: number[];
  color?: string;
  label?: string;
}

export default function ChartLine({
  labels,
  values,
  color = "#0cf2d0",
  label = "",
}: Props) {
  const data = {
    labels,
    datasets: [
      {
        label,
        data: values,
        borderColor: color,
        backgroundColor: color,
        tension: 0.25,
        fill: false,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: TooltipItem<"line">) => `${ctx.parsed.y}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#9db9b5" },
      },
      y: {
        grid: { color: "#3b5450" },
        ticks: { color: "#9db9b5" },
      },
    },
  } as const;

  return (
    <div style={{ height: 150 }}>
      <Line data={data} options={options} />
    </div>
  );
}
