/**
 * Normalize one house telemetry-pipe payload (`apex-telemetry/1`) into the
 * snapshot the layer draws from, or null when the payload is not that feed.
 *
 * The factory and thread objects are carried through as published — the
 * layer reports them, it does not reinterpret them. Points are extracted
 * only from items that carry their own finite, in-range coordinates; the
 * feed decides where things are, never this file. The current feed carries
 * no points, so a live snapshot normally has an empty `points` list, which
 * the layer shows as an honest empty state.
 */

const POINT_LIST_KEYS = Object.freeze(['points', 'stations', 'nodes', 'sites']);

function finiteInRange(value, min, max) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max
    ? number
    : null;
}

/** One feed item as a plottable point, or null when it carries no position. */
function normalizePoint(item, index) {
  if (!item || typeof item !== 'object') return null;
  const lat = finiteInRange(item.lat ?? item.latitude, -90, 90);
  const lon = finiteInRange(item.lon ?? item.longitude, -180, 180);
  if (lat === null || lon === null) return null;
  return Object.freeze({
    id: String(item.id ?? item.label ?? item.name ?? `point-${index}`),
    label: String(item.label ?? item.name ?? item.id ?? 'APEX'),
    lat,
    lon,
  });
}

/**
 * @param {unknown} payload Parsed JSON from the telemetry pipe.
 * @returns {?object} Frozen snapshot, or null for a foreign payload.
 */
export function normalizeApexTelemetrySnapshot(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload))
    return null;
  const schema = String(payload.schema || '');
  if (!schema.startsWith('apex-telemetry/')) return null;
  const points = [];
  for (const key of POINT_LIST_KEYS) {
    const list = payload[key];
    if (!Array.isArray(list)) continue;
    list.forEach((item, index) => {
      const point = normalizePoint(item, index);
      if (point) points.push(point);
    });
  }
  return Object.freeze({
    schema,
    generatedAtISO: payload.generatedAtISO ?? null,
    generatedAtLabel: payload.generatedAtLabel ?? null,
    factory: payload.factory ?? null,
    thread: payload.thread ?? null,
    points: Object.freeze(points),
  });
}
