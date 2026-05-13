import { Link } from "react-router-dom";
import type { FloorNumber } from "../config/floors";
import { floorAverages } from "../data/mockData";

interface Props {
  floor: FloorNumber;
}

function formatTimestamp(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function SidePanel({ floor }: Props) {
  const avg = floorAverages(floor);

  return (
    <aside className="flex h-full w-72 flex-col gap-6 bg-neutral-950 px-6 py-5 text-neutral-100">
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-white"
        >
          ← All floors
        </Link>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight">
          Floor {floor}
        </h2>
        <p className="text-xs text-neutral-400">West Tower · McCormick Hall</p>
      </div>

      <div className="space-y-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
          Floor averages
        </h3>

        <Stat
          label="Avg temperature"
          value={avg.avgTempC !== null ? `${avg.avgTempC.toFixed(1)} °C` : "—"}
          accent="rgb(239 68 68)"
        />
        <Stat
          label="Avg humidity"
          value={avg.avgHumidity !== null ? `${avg.avgHumidity.toFixed(0)} %` : "—"}
          accent="rgb(59 130 246)"
        />
        <Stat label="Last collected" value={formatTimestamp(avg.lastUpdated)} />
      </div>

      <div className="mt-auto rounded-lg border border-neutral-800 bg-neutral-900/60 p-3 text-xs leading-relaxed text-neutral-400">
        <div className="mb-1 font-semibold text-neutral-300">Tip</div>
        Nodes are colored on a red-to-blue scale by average room temperature.
        Click a node to see room-level details.
      </div>
    </aside>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-neutral-500">
        {label}
      </div>
      <div
        className="mt-0.5 text-2xl font-semibold tabular-nums"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </div>
    </div>
  );
}
