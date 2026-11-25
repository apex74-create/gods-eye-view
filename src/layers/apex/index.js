import { fromDegrees } from '../../geo/ellipsoid.js';
import {
  APEX_LAYER_ID,
  APEX_OVERLAY_SOURCE_ID,
  createApexOverlayEntry,
} from './model.js';
export * from './model.js';
export { createApexTelemetrySource } from './source.js';

// A portable package (no i18n): the error stays English data and the layer
// panel shows it translated.
const msg = (text) => text;

/**
 * Own the Apex Telemetry display and its refresh lifecycle.
 *
 * The layer reads the house telemetry pipe through a snapshot source and
 * draws one label per feed point on the globe. The feed's factory and
 * thread state is reported through `getStats()`, not drawn: the pipe
 * carries no coordinates for them, and this layer never invents a
 * position. While the feed carries no points the layer is present and
 * live with an empty globe — `feedState: 'live-no-points'` in its stats.
 * @param {object} options
 * @param {object} options.source Snapshot source (`getSnapshot`).
 * @param {object} options.overlayHost World-overlay host.
 */
export function createApexLayer({ source, overlayHost } = {}) {
  if (typeof source?.getSnapshot !== 'function')
    throw new TypeError('Apex Telemetry requires a snapshot source');
  if (!overlayHost)
    throw new TypeError('Apex Telemetry requires an overlay host');
  let _request = null;
  let _count = 0;
  let _lastUpdate = null;
  let _lastError = null;
  let _enabled = false;
  let _feed = null;

  const layer = {
    id: APEX_LAYER_ID,
    name: 'Apex Telemetry',
    icon: '▲',
    source: 'Apex Telemetry Pipe',
    updateInterval: 60000,

    init() {
      _count = 0;
      _lastUpdate = null;
      _lastError = null;
      _enabled = false;
      _feed = null;
      overlayHost.setVisible(APEX_OVERLAY_SOURCE_ID, false);
      console.log('[Data:Apex] Initialized');
    },

    enable() {
      _enabled = true;
      overlayHost.setVisible(APEX_OVERLAY_SOURCE_ID, true);
    },

    disable() {
      _request?.abort();
      _request = null;
      _enabled = false;
      overlayHost.clearSource(APEX_OVERLAY_SOURCE_ID);
      overlayHost.setVisible(APEX_OVERLAY_SOURCE_ID, false);
    },

    async update() {
      if (!_enabled) return false;
      _request?.abort();
      const request = new AbortController();
      _request = request;
      try {
        const snapshot = await source.getSnapshot({
          signal: request.signal,
        });
        if (request.signal.aborted || _request !== request || !_enabled)
          return false;
        _feed = snapshot;
        const entries = snapshot.points.map((point) =>
          createApexOverlayEntry({
            id: point.id,
            position: fromDegrees(point.lon, point.lat),
            label: point.label,
          }),
        );
        overlayHost.setEntries(APEX_OVERLAY_SOURCE_ID, entries);
        _count = entries.length;
        _lastUpdate = Date.now();
        _lastError = null;
        console.log(
          `[Data:Apex] Updated: ${_count} point(s) from ${snapshot.schema}`,
        );
        return true;
      } catch (e) {
        if (request.signal.aborted || _request !== request || !_enabled)
          return false;
        console.warn('[Data:Apex] Fetch error:', e);
        _lastError = e?.message || msg('Apex telemetry source unavailable');
        return false;
      } finally {
        if (_request === request) _request = null;
      }
    },

    destroy() {
      _request?.abort();
      _request = null;
      _enabled = false;
      _feed = null;
      _count = 0;
      _lastUpdate = null;
      _lastError = null;
      overlayHost.clearSource(APEX_OVERLAY_SOURCE_ID);
      overlayHost.setVisible(APEX_OVERLAY_SOURCE_ID, false);
    },

    getStats() {
      return {
        count: _count,
        lastUpdate: _lastUpdate,
        error: _lastError,
        // 'live-no-points' is the feed's own truth today: the pipe is
        // answering, and it carries no coordinates to draw yet.
        feedState: !_feed ? null : _count > 0 ? 'live' : 'live-no-points',
        feed: _feed
          ? {
              schema: _feed.schema,
              generatedAtISO: _feed.generatedAtISO,
              generatedAtLabel: _feed.generatedAtLabel,
              factory: _feed.factory,
              thread: _feed.thread,
            }
          : null,
      };
    },
  };
  return layer;
}
