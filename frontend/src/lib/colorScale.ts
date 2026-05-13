// Red->blue color scale based on average temperature.
// Warm rooms = red, cool rooms = blue.
//
// Maps a temperature in °C to an HSL color. Domain is configurable; default
// covers a comfortable 22-30 °C indoor range.

export interface ColorScaleOptions {
  minC?: number;
  maxC?: number;
}

export function tempToColor(tempC: number, opts: ColorScaleOptions = {}): string {
  const min = opts.minC ?? 22;
  const max = opts.maxC ?? 30;
  const t = Math.min(1, Math.max(0, (tempC - min) / (max - min)));
  // hue: 220 (blue) -> 0 (red)
  const hue = 220 * (1 - t);
  return `hsl(${hue}, 78%, 52%)`;
}
