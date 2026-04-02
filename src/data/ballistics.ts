// Ballistics data for .223 Rem 55gr FMJ — Federal Premium, MV 3240 fps
// Table structure: opticHeightInches → zeroDistanceYards → targetDistanceYards → impactOffsetInches
const trajectoryData: Record<number, Record<number, Record<number, number>>> = {
  1.42: {
    10: { 50: 5.3, 100: 11.2, 150: 15.9, 200: 19.5, 250: 21.7, 300: 22.4 },
    15: { 50: 3.0, 100: 6.5,  150: 8.9,  200: 10.2, 250: 10.1, 300: 8.4  },
    20: { 50: 1.9, 100: 4.2,  150: 5.5,  200: 5.6,  250: 4.4,  300: 1.6  },
    25: { 50: 1.2, 100: 2.9,  150: 3.5,  200: 3.0,  250: 1.1,  300: -2.4 },
    30: { 50: 0.8, 100: 2.0,  150: 2.2,  200: 1.2,  250: -1.1, 300: -5.0 },
  },
  1.57: {
    10: { 50: 5.9, 100: 12.5, 150: 18.0, 200: 22.3, 250: 25.3, 300: 26.7 },
    15: { 50: 3.4, 100: 7.4,  150: 10.3, 200: 12.0, 250: 12.5, 300: 11.3 },
    20: { 50: 2.1, 100: 4.8,  150: 6.5,  200: 7.0,  250: 6.1,  300: 3.7  },
    25: { 50: 1.4, 100: 3.3,  150: 4.3,  200: 4.0,  250: 2.4,  300: -0.7 },
    30: { 50: 0.9, 100: 2.4,  150: 2.8,  200: 2.1,  250: 0.0,  300: -3.6 },
  },
  1.93: {
    10: { 50: 7.4, 100: 15.7, 150: 23.1, 200: 29.2, 250: 34.0, 300: 37.2 },
    15: { 50: 4.2, 100: 9.4,  150: 13.5, 200: 16.5, 250: 18.1, 300: 18.1 },
    20: { 50: 2.6, 100: 6.3,  150: 8.8,  200: 10.2, 250: 10.3, 300: 8.7  },
    25: { 50: 1.7, 100: 4.4,  150: 6.1,  200: 6.5,  250: 5.7,  300: 3.2  },
    30: { 50: 1.1, 100: 3.2,  150: 4.3,  200: 4.1,  250: 2.7,  300: -0.4 },
  },
  2.26: {
    10: { 50: 8.7, 100: 18.7, 150: 27.7, 200: 35.5, 250: 41.9, 300: 46.8 },
    15: { 50: 5.0, 100: 11.3, 150: 16.5, 200: 20.6, 250: 23.3, 300: 24.4 },
    20: { 50: 3.1, 100: 7.6,  150: 11.0, 200: 13.2, 250: 14.1, 300: 13.4 },
    25: { 50: 2.0, 100: 5.4,  150: 7.7,  200: 8.8,  250: 8.6,  300: 6.8  },
    30: { 50: 1.3, 100: 4.0,  150: 5.6,  200: 6.0,  250: 5.1,  300: 2.6  },
  },
}

export const DISTANCES = [50, 100, 150, 200, 250, 300]
export const OPTIC_HEIGHTS = [1.42, 1.57, 1.93, 2.26]
export const ZERO_DISTANCES = [10, 15, 20, 25, 30]

function closest(value: number, options: number[]): number {
  return options.reduce((a, b) => (Math.abs(b - value) < Math.abs(a - value) ? b : a))
}

export function getRecommendation(
  distanceYds: number,
  opticHeightIn: number,
  zeroDistYds: number,
): { impactOffsetInches: number; holdOffsetInches: number } {
  const oh = closest(opticHeightIn, OPTIC_HEIGHTS)
  const zd = closest(zeroDistYds, ZERO_DISTANCES)
  const td = closest(distanceYds, DISTANCES)
  const impact = trajectoryData[oh]?.[zd]?.[td] ?? 0
  return { impactOffsetInches: impact, holdOffsetInches: impact }
}
