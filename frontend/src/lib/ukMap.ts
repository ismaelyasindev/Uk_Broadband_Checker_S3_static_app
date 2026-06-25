/** Bounds and defaults that keep the map locked to the UK region. */

export const UK_CENTER: [number, number] = [-2.5, 54.2];
export const UK_DEFAULT_ZOOM = 5.2;
export const UK_POSTCODE_ZOOM = 13;

// [SW corner, NE corner] — covers mainland GB, NI, Hebrides, Shetland, IoM, CI.
export const UK_MAX_BOUNDS: [[number, number], [number, number]] = [
  [-10.5, 49.5],
  [2.5, 61.0],
];

export const UK_MIN_ZOOM = 4.5;
export const UK_MAX_ZOOM = 17;
