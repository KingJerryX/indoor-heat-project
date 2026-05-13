// Mock readings for Phase 1. Generates a few days of hourly temp + humidity
// for each seeded room, an indoor control room, and an outdoor courtyard
// sensor. Replace with real API calls once the FastAPI backend lands.

import { ROOMS, CONTROL_ROOMS, type RoomMeta } from "../config/rooms";
import type { FloorNumber } from "../config/floors";

export interface Reading {
  timestamp: string; // ISO
  temperatureC: number;
  humidityPct: number;
}

export interface RoomData {
  meta: RoomMeta;
  readings: Reading[];
  avgDaytimeC: number;
  avgNighttimeC: number;
  avgHumidity: number;
  lastCollected: string;
  interventions: Intervention[];
}

export interface Intervention {
  label: string;
  emoji: string;
  description: string;
}

const HOURS = 24 * 5; // 5 days of hourly data
const NOW = new Date("2026-05-12T18:00:00");

function seedRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function generateReadings(
  baseTemp: number,
  baseHumidity: number,
  seed: number,
): Reading[] {
  const rand = seedRandom(seed);
  const readings: Reading[] = [];
  for (let h = HOURS - 1; h >= 0; h--) {
    const t = new Date(NOW.getTime() - h * 60 * 60 * 1000);
    const hour = t.getHours();
    // diurnal swing: warmer in afternoon, cooler at night
    const diurnal = Math.sin(((hour - 6) / 24) * Math.PI * 2) * 2.2;
    const noise = (rand() - 0.5) * 0.8;
    const temp = baseTemp + diurnal + noise;
    const humidity =
      baseHumidity - diurnal * 1.5 + (rand() - 0.5) * 4;
    readings.push({
      timestamp: t.toISOString(),
      temperatureC: +temp.toFixed(2),
      humidityPct: +Math.max(20, Math.min(80, humidity)).toFixed(1),
    });
  }
  return readings;
}

function dayMask(reading: Reading): boolean {
  const h = new Date(reading.timestamp).getHours();
  return h >= 7 && h < 19;
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

const INTERVENTION_SETS: Record<number, Intervention[]> = {
  503: [
    { label: "Window AC unit", emoji: "❄️", description: "5,000 BTU unit installed 2026-05-01" },
    { label: "Blackout blinds", emoji: "🪟", description: "Closed 10:00-18:00 daily" },
  ],
  504: [
    { label: "Box fan", emoji: "💨", description: "Set to medium, oriented toward window" },
  ],
  505: [
    { label: "Reflective film", emoji: "🪞", description: "Applied to south-facing window" },
    { label: "Blackout blinds", emoji: "🪟", description: "Closed 12:00-18:00 daily" },
  ],
  303: [
    { label: "Window AC unit", emoji: "❄️", description: "5,000 BTU unit installed 2026-05-01" },
  ],
  304: [],
  305: [
    { label: "Reflective film", emoji: "🪞", description: "Applied to south-facing window" },
  ],
};

function buildRoomData(meta: RoomMeta, seed: number, baseTemp: number, baseHumidity: number): RoomData {
  const readings = generateReadings(baseTemp, baseHumidity, seed);
  const day = readings.filter(dayMask);
  const night = readings.filter((r) => !dayMask(r));
  return {
    meta,
    readings,
    avgDaytimeC: +mean(day.map((r) => r.temperatureC)).toFixed(2),
    avgNighttimeC: +mean(night.map((r) => r.temperatureC)).toFixed(2),
    avgHumidity: +mean(readings.map((r) => r.humidityPct)).toFixed(1),
    lastCollected: readings[readings.length - 1].timestamp,
    interventions: INTERVENTION_SETS[meta.room] ?? [],
  };
}

// Higher floors run warmer (heat rises) — gives the color scale something
// to actually differentiate.
const BASE_TEMP_BY_FLOOR: Record<number, number> = {
  3: 24.0,
  5: 26.5,
};

// Per-room offsets so nodes aren't all identical.
const ROOM_OFFSET: Record<number, number> = {
  503: 0.8, // intervened, cooler
  504: 2.2, // un-intervened
  505: 1.3,
  303: 0.4,
  304: 1.8,
  305: 1.0,
};

export const ROOM_DATA: Record<number, RoomData> = Object.fromEntries(
  ROOMS.map((meta, i) => {
    const base = BASE_TEMP_BY_FLOOR[meta.floor] ?? 25;
    const offset = ROOM_OFFSET[meta.room] ?? 1;
    return [meta.room, buildRoomData(meta, 100 + i * 17, base + offset, 52)];
  }),
);

// Control-room readings (one per floor; not clickable nodes).
export const CONTROL_READINGS: Record<FloorNumber, Reading[] | null> = {
  1: null,
  2: null,
  3: generateReadings(24.0, 50, 7001),
  4: null,
  5: generateReadings(26.3, 50, 7005),
  6: null,
  7: null,
};

// Courtyard (outdoor) — single shared series for all floors.
export const COURTYARD_READINGS: Reading[] = generateReadings(22.0, 65, 8888).map((r) => ({
  ...r,
  // Wider diurnal swing for outdoor — exaggerate it.
  temperatureC: +(r.temperatureC + Math.sin(((new Date(r.timestamp).getHours() - 6) / 24) * Math.PI * 2) * 3.5).toFixed(2),
}));

// Aggregates used by the side panel.
export function floorAverages(floor: FloorNumber) {
  const rooms = ROOMS.filter((r) => r.floor === floor);
  if (rooms.length === 0) {
    return { avgTempC: null, avgHumidity: null, lastUpdated: null };
  }
  const datas = rooms.map((r) => ROOM_DATA[r.room]);
  return {
    avgTempC: +mean(datas.map((d) => mean(d.readings.map((x) => x.temperatureC)))).toFixed(2),
    avgHumidity: +mean(datas.map((d) => d.avgHumidity)).toFixed(1),
    lastUpdated: datas
      .map((d) => d.lastCollected)
      .sort()
      .reverse()[0],
  };
}

export { CONTROL_ROOMS };
