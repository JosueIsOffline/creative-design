import file from '../public/capture/recordings.json';

// Logged times are seconds from each recording's first frame — the same
// clock as the video, since recordings are captured frame by frame on the
// page's virtual clock (see capture.ts).
const data = file.logs;
export type Recording = keyof typeof data;

// Where the pointer was at time `t` (holds the last/first position).
export function pointerAt(name: Recording, t: number): [number, number] | null {
  const path = data[name].path as [number, number, number][];
  if (!path.length) return null;
  if (t <= path[0][0]) return [path[0][1], path[0][2]];
  for (let i = 1; i < path.length; i++) {
    if (t <= path[i][0]) {
      const [t0, x0, y0] = path[i - 1], [t1, x1, y1] = path[i];
      const k = (t - t0) / (t1 - t0 || 1);
      return [x0 + (x1 - x0) * k, y0 + (y1 - y0) * k];
    }
  }
  const last = path[path.length - 1];
  return [last[1], last[2]];
}

export const clicksOf = (name: Recording) => data[name].clicks as [number, number, number][];
export const markOf = (name: Recording, label = 'start') => (data[name].marks as Record<string, number>)[label];
export const pointOf = (name: Recording, label: string) => (data[name].points as Record<string, [number, number]>)[label];
