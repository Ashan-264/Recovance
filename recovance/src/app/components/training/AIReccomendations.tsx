// components/AIRecommendations.tsx
import React from "react";
import AIRecommendationCard from "@/app/components/training/AIRecomendationCard";

const recommendations = [
  {
    title: "Adjust Intensity",
    description:
      "Based on your recovery data, we recommend reducing the intensity of your next workout.",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCdfh4DKUKoXwC8oqCTJnDA35zW7LYH3qSCww3uJoL1cC7mRlxFDHrOihfAxqVGC_fxE9cSY0R4ferKoJn_CfqbGrablpfHr0GADX97Krau0pq8mw_pUCROlFf72Bkir5ndwh7huJhb1lKx8E42v1ugE-cISY-zKwqvcXrYihVek54RgwLMAYSyrjfoY_zO1borbo4bKx9y9UHP_11Y_1noUJxB4fFFBGCz6ZVNLNul86HCOwmqxafmcd5kT8T5VrzPDdjOEHU-ZynG",
  },
];

export default function AIRecommendations() {
  return (
    <div className="flex flex-col gap-4">
      {recommendations.map((rec) => (
        <AIRecommendationCard
          key={rec.title}
          title={rec.title}
          description={rec.description}
          imageUrl={rec.imageUrl}
        />
      ))}
    </div>
  );
}
