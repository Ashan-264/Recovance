// components/HighlightsSection.tsx
import HighlightItem, { HighlightItemProps } from "./HighlightItem";

const HIGHLIGHTS: HighlightItemProps[] = [
  {
    title: "Cycling",
    details: "Distance: 45 km, Elevation Gain: 800 m, Training Load (TSS): 150",
    imageSrc: "/images/cycling.jpg",
    imageAlt: "Cyclist riding fast",
  },
  {
    title: "Weightlifting",
    details: "Volume: 2500 lbs, Max Effort: 90%, Muscle Group: Legs",
    imageSrc: "/images/weightlifting.jpg",
    imageAlt: "Person squatting with a barbell",
  },
  {
    title: "Calisthenics",
    details:
      "Reps: 120, Progression: Advanced Push-Up, Muscle Activation: Chest, Shoulders, Triceps",
    imageSrc: "/images/calisthenics.jpg",
    imageAlt: "Man doing push-ups",
  },
  {
    title: "Climbing",
    details: "Route Grade: 5.11b, Session Time: 2 hours, Grip Load: High",
    imageSrc: "/images/climbing.jpg",
    imageAlt: "Person climbing on indoor wall",
  },
  {
    title: "Paddling",
    details: "Distance: 15 km, Stroke Efficiency: 85%, Heart Rate Zone: 2-3",
    imageSrc: "/images/paddling.jpg",
    imageAlt: "Person kayaking on a lake",
  },
];

export default function HighlightsSection() {
  return (
    <section className="w-full px-6 py-8 space-y-6">
      <h2 className="text-2xl font-semibold text-white">
        Today&apos;s Highlights
      </h2>
      <div className="grid gap-4">
        {HIGHLIGHTS.map((item) => (
          <HighlightItem
            key={item.title}
            title={item.title}
            details={item.details}
            imageSrc={item.imageSrc}
            imageAlt={item.imageAlt}
          />
        ))}
      </div>
    </section>
  );
}
