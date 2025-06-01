// components/ActionButtons.tsx
import { MouseEventHandler } from "react";

interface ActionButtonsProps {
  onGeneratePlan?: MouseEventHandler<HTMLButtonElement>;
  onLogSession?: MouseEventHandler<HTMLButtonElement>;
  onSyncWearables?: MouseEventHandler<HTMLButtonElement>;
  onUpdateNotes?: MouseEventHandler<HTMLButtonElement>;
}

export default function ActionButtons({
  onGeneratePlan,
  onLogSession,
  onSyncWearables,
  onUpdateNotes,
}: ActionButtonsProps) {
  return (
    <section className="w-full px-6 py-8">
      <div className="flex flex-wrap gap-4">
        <button
          onClick={onGeneratePlan}
          className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
        >
          Generate Today&apos;s Training Plan
        </button>
        <button
          onClick={onLogSession}
          className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
        >
          Log New Session
        </button>
        <button
          onClick={onSyncWearables}
          className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
        >
          Sync Wearables
        </button>
        <button
          onClick={onUpdateNotes}
          className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
        >
          Update Recovery Notes
        </button>
      </div>
    </section>
  );
}
