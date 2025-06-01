// components/UpcomingWorkouts.tsx
import React from "react";
import UpcomingWorkoutCard from "./UpcomingWorkoutCard";

const workouts = [
  {
    category: "Cycling",
    title: "Interval Training",
    description: "High-intensity intervals to improve speed and endurance",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAQt8rMKw-ncoXr1zxec8SrvLXPb2Qz3B_lCfx6dT10QiGfzy1nnz7jHa4y8mLCdHa17kVoIt0pd_BsUQy0uaYRvckt17mfag0oU01fERmTm52f8JhMoJJ0iuAoV7-f86rioo36nmxxDVYarMJOCtXl0l2XmOWoWLWBB5m-pVup1w94exvCV9q2YdZdZOf6wR8OP5su6-2EflvJ_1z_fk-8X2nThmIe7f4CYqrhf3FhQHi7o1amyN1alsellA0AskBPG1BVtC8jimcD0N-FE1JyGxSgC9gIT4X3nt-B8",
  },
  {
    category: "Weightlifting",
    title: "Strength Session",
    description: "Focus on compound movements for overall strength",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuB6VRim2r9OQwZwVGm2Yy5NBQZN_fcsqUGGHsOuSCc5WusrNJUhTHN8vu7emA5ZqRd7vfbz81aYAqSZOYTMuYxiafwVVRYEJux7113cY_TgF2bTOqbhjtNcwON_5zy_k9h0hH6P6NvG8cNla40QwKuvmwNDm5cSDc6cSNo4mj45iGDsI4ECOooEVNSSeJyRUym0FkzDvFzf-5pMTlnDcwpnnDiiYDUqU5HwH8jXsWmL5R_DMJBL6gD0N-FE1JyGxSgC9gIT4X3nt-B8",
  },
  {
    category: "Calisthenics",
    title: "Bodyweight Circuit",
    description: "Full-body workout using only bodyweight exercises",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAoMCDv2TFWOSzn3LcY8Kbv8qmgmdNx5TDbfkG5cnGDfZErzArhAKD8sTzF3VRrKTAfiDdeTGL34P-36oAZ9-90SdlUrJUJRWNn4oDWVbBZhCgdD-nPx6vq-bviIE0aLgF6KSKUoLEdRlwqnYnnoWWYot-Bn8Ct3nudrzXg_-ayIzp6IhwG8rKJOEB2rhgJmc0SdoLHx8-nZUJpCoXuhj41u-jhlWJrdU7I060ebFq0uOkEKDYmiLElV6APEaiYbzxNI0dmGrT48Up",
  },
];

export default function UpcomingWorkouts() {
  return (
    <div className="flex flex-col gap-4">
      {workouts.map((w) => (
        <UpcomingWorkoutCard
          key={w.title}
          category={w.category}
          title={w.title}
          description={w.description}
          imageUrl={w.imageUrl}
        />
      ))}
    </div>
  );
}
