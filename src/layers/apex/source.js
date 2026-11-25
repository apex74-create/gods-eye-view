import { normalizeApexTelemetrySnapshot } from './records.js';

/** The house public telemetry pipe the layer reads by default. */
export const APEX_TELEMETRY_FEED_URL =
  'https://raw.githubusercontent.com/apex74-create/apex-telemetry-pipe/main/telemetry.json';

/** Request and validate a complete telemetry snapshot before it can replace displayed points. */
export function createApexTelemetrySource({
  url = APEX_TELEMETRY_FEED_URL,
  fetchImpl = (...args) => globalThis.fetch(...args),
} = {}) {
  return {
    async getSnapshot({ signal } = {}) {
      signal?.throwIfAborted();
      const response = await fetchImpl(url, { signal });
      if (!response.ok)
        throw new Error(`Apex telemetry HTTP ${response.status}`);
      const payload = await response.json();
      signal?.throwIfAborted();
      const snapshot = normalizeApexTelemetrySnapshot(payload);
      if (!snapshot) throw new Error('Malformed Apex telemetry response');
      return snapshot;
    },
  };
}
