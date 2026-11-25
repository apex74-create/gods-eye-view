import {
  APEX_CB_LAYER_ID,
  APEX_HAM_LAYER_ID,
  APEX_PORCH_NO_PIPE,
  normalizePorchState,
} from './model.js';
export * from './model.js';
export { createApexCommsStubSource } from './source.js';

// A portable package (no i18n): the error stays English data and the layer
// panel shows it translated.
const msg = (text) => text;

/**
 * Own one Apex comms pipe's porch state and its refresh lifecycle.
 *
 * A comms pipe draws nothing on the globe: its surface is the comms panel.
 * The layer keeps the current porch reading (see model.js for the
 * contract) and hands each fresh reading to `publish`, which the
 * application wrapper points at the panel store. Until a real porch wire
 * exists the source is the stub and every reading is NO PIPE — the layer
 * reports that plainly rather than simulating a connection.
 * @param {object} options
 * @param {string} options.id Layer id ('apex-cb' or 'apex-ham').
 * @param {string} options.name English layer name.
 * @param {string} options.icon Layer icon.
 * @param {string} options.sourceName Declared source name.
 * @param {object} options.source Porch source (`getPorchState`).
 * @param {(porch: object) => void} [options.publish] Panel publisher.
 */
export function createApexCommsLayer({
  id,
  name,
  icon,
  sourceName,
  source,
  publish = null,
} = {}) {
  if (typeof source?.getPorchState !== 'function')
    throw new TypeError(`${name || id} requires a porch source`);
  let _request = null;
  let _lastUpdate = null;
  let _lastError = null;
  let _enabled = false;
  let _porch = APEX_PORCH_NO_PIPE;

  const emit = () => {
    try {
      publish?.(_porch);
    } catch {
      // A panel that cannot take the reading never breaks the pipe.
    }
  };

  const layer = {
    id,
    name,
    icon,
    source: sourceName,
    updateInterval: 15000,

    init() {
      _lastUpdate = null;
      _lastError = null;
      _enabled = false;
      _porch = APEX_PORCH_NO_PIPE;
      console.log(`[Data:${name}] Initialized`);
    },

    enable() {
      _enabled = true;
      emit();
    },

    disable() {
      _request?.abort();
      _request = null;
      _enabled = false;
      emit();
    },

    async update() {
      if (!_enabled) return false;
      _request?.abort();
      const request = new AbortController();
      _request = request;
      try {
        const reading = await source.getPorchState({
          signal: request.signal,
        });
        if (request.signal.aborted || _request !== request || !_enabled)
          return false;
        _porch = normalizePorchState(reading);
        _lastUpdate = Date.now();
        _lastError = null;
        emit();
        return true;
      } catch (e) {
        if (request.signal.aborted || _request !== request || !_enabled)
          return false;
        console.warn(`[Data:${name}] Porch read error:`, e);
        _lastError = e?.message || msg('Comms porch source unavailable');
        return false;
      } finally {
        if (_request === request) _request = null;
      }
    },

    destroy() {
      _request?.abort();
      _request = null;
      _enabled = false;
      _porch = APEX_PORCH_NO_PIPE;
      _lastUpdate = null;
      _lastError = null;
      emit();
    },

    getStats() {
      return {
        count: 0,
        lastUpdate: _lastUpdate,
        error: _lastError,
        porch: _porch,
      };
    },

    /** The current porch reading, as the panel shows it. */
    getPorchState() {
      return _porch;
    },
  };
  return layer;
}

/** The Encrypted CB pipe: the comms porch for the house CB. */
export function createEncryptedCbLayer(options) {
  return createApexCommsLayer({
    id: APEX_CB_LAYER_ID,
    name: 'Encrypted CB',
    icon: '📻',
    sourceName: 'Apex Encrypted CB',
    ...options,
  });
}

/** The Ham Radio pipe seat: the same porch contract on the ham assembly. */
export function createHamRadioLayer(options) {
  return createApexCommsLayer({
    id: APEX_HAM_LAYER_ID,
    name: 'Ham Radio',
    icon: '📡',
    sourceName: 'Apex Ham Radio',
    ...options,
  });
}
