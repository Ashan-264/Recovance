// components/WelcomeSection.tsx
interface WelcomeSectionProps {
  name: string;
  date: string;
  recoveryPercentage: number;
}

export default function WelcomeSection({
  name,
  date,
  recoveryPercentage,
}: WelcomeSectionProps) {
  return (
    <section className="w-full px-6 py-8">
      <h1 className="text-3xl font-semibold text-white">
        Welcome back, {name}!
      </h1>
      <p className="mt-2 text-gray-300">
        Today is {date}. You’re {recoveryPercentage}% recovered. Your nervous
        system is ready for high-volume strength training.
      </p>
    </section>
  );
}
