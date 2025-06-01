// components/AISuggestions.tsx
import AISuggestionCard, { AISuggestionCardProps } from "./AISuggestionCard";

const AI_SUGGESTIONS: AISuggestionCardProps[] = [
  {
    title: "Recovery Ride Recommended",
    subtitle: "Keep HR below 130 BPM",
    backgroundSrc: "/images/ai-suggestion-1.jpg",
    backgroundAlt: "A forested road, perfect for a recovery ride",
  },
  {
    title: "Delay Grip-Intensive Training",
    subtitle: "Prioritize mobility + core instead",
    backgroundSrc: "/images/ai-suggestion-2.jpg",
    backgroundAlt: "Person stretching on a yoga mat",
  },
];

export default function AISuggestions() {
  return (
    <section className="w-full px-6 py-8 space-y-6">
      <h2 className="text-2xl font-semibold text-white">
        Today&apos;s AI Suggestions
      </h2>
      <div className="md:grid md:grid-cols-2 gap-4">
        {AI_SUGGESTIONS.map((item) => (
          <AISuggestionCard
            key={item.title}
            title={item.title}
            subtitle={item.subtitle}
            backgroundSrc={item.backgroundSrc}
            backgroundAlt={item.backgroundAlt}
          />
        ))}
      </div>
    </section>
  );
}
