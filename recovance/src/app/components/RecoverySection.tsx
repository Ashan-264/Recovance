// components/RecoverySection.tsx
import RecoveryCard from "./RecoveryCard";

const RECOVERY_CARDS = [
  {
    title: "Recovery Score",
    details: "Ready for Training",
    imageSrc: "/images/recovery-score.png",
    imageAlt: "Circular gauge for recovery score",
    isScoreCard: true,
    scoreValue: "85/100",
  },
  {
    title: "Sleep Tracker",
    details:
      "Hours Slept: 7.5, Sleep Depth: 0.5, Sleep Quality: 80% (Light: 20%, Deep: 40%, REM: 20%)",
    imageSrc: "/images/sleep-tracker.png",
    imageAlt: "Person sleeping illustration",
  },
  {
    title: "Heart Health",
    details: "Resting HR: 55 bpm, HRV: 70 ms, Morning HR Spike: 5 bpm",
    imageSrc: "/images/heart-health.png",
    imageAlt: "ECG waveform graphic",
  },
  {
    title: "Fatigue Markers",
    details: "Muscle Soreness: Low, CNS Stress: Moderate",
    imageSrc: "/images/fatigue-markers.png",
    imageAlt: "Abstract fatigue icon",
  },
  {
    title: "Wellness Journal Highlights",
    details: "Mood: Stable, Energy Levels: High",
    imageSrc: "/images/wellness-journal.png",
    imageAlt: "Person meditating illustration",
  },
];

export default function RecoverySection() {
  return (
    <section className="w-full px-6 py-8 space-y-6">
      <h2 className="text-2xl font-semibold text-white">
        Recovery &amp; Health
      </h2>
      <div className="grid gap-4">
        {RECOVERY_CARDS.map((card) => (
          <RecoveryCard
            key={card.title}
            title={card.title}
            details={card.details}
            imageSrc={card.imageSrc}
            imageAlt={card.imageAlt}
            isScoreCard={card.isScoreCard}
            scoreValue={card.scoreValue}
          />
        ))}
      </div>
    </section>
  );
}
