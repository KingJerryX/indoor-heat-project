// Room metadata: which rooms have sensors on which floors, where the node
// should be drawn (normalized 0..1 over the floor plan PNG), and which way
// the room faces.
//
// Coordinates are based on W4 floor plan geometry (2448×1584 PNG at 2× scale).
// The West tower right column (rooms 501-508) sits at the east face of the
// tower; xNorm ≈ 0.308 is the horizontal center of those room boxes.
// Vertical positions are per-room so the node lands above the room label text.
// Fine-tune via the planned /admin/calibrate page.

import type { FloorNumber } from "./floors";

export type Orientation =
  | "North-east facing"
  | "North-west facing"
  | "South-east facing"
  | "South-west facing";

export type SensorRole = "room" | "indoor_control" | "outdoor_courtyard";

export interface RoomMeta {
  room: number;
  floor: FloorNumber;
  xNorm: number;
  yNorm: number;
  orientation: Orientation;
  role: SensorRole;
}

// X-center of the right column (rooms 501-508 / 301-308) — east face of
// the West tower.
const WEST_COL_RIGHT_X = 0.308;

// Y-positions (normalized 0..1 over full image height) for the right-column
// rooms. Values are set ~0.025 above the room label center so the dot sits
// above the text, not on top of it.
const ROW_Y: Record<number, number> = {
  1: 0.115, // 501 / 301 — top room
  2: 0.190, // 502 / 302
  3: 0.255, // 503 / 303
  4: 0.325, // 504 / 304
  5: 0.395, // 505 / 305
  6: 0.460, // 506 / 306
  7: 0.530, // 507 / 307
  8: 0.600, // 508 / 308
};

function makeRoom(
  room: number,
  floor: FloorNumber,
  orientation: Orientation,
  role: SensorRole = "room",
): RoomMeta {
  const lastDigit = room % 10;
  return {
    room,
    floor,
    xNorm: WEST_COL_RIGHT_X,
    yNorm: ROW_Y[lastDigit],
    orientation,
    role,
  };
}

export const ROOMS: RoomMeta[] = [
  // Floor 5 seeded rooms
  makeRoom(503, 5, "North-east facing"),
  makeRoom(504, 5, "North-east facing"),
  makeRoom(505, 5, "South-east facing"),
  // Floor 3 seeded rooms
  makeRoom(303, 3, "North-east facing"),
  makeRoom(304, 3, "North-east facing"),
  makeRoom(305, 3, "South-east facing"),
];

// Per-floor indoor control room (not rendered as a clickable node; used as
// the dashed comparison line in the popup chart).
export const CONTROL_ROOMS: Record<FloorNumber, number | null> = {
  1: null,
  2: null,
  3: 301,
  4: null,
  5: 501,
  6: null,
  7: null,
};

export function roomsForFloor(floor: FloorNumber): RoomMeta[] {
  return ROOMS.filter((r) => r.floor === floor);
}
