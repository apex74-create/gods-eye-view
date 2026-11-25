/**
 * The Apex comms porch contract, shared by the Encrypted CB and Ham Radio
 * pipes. A comms layer's panel state is one porch reading:
 *
 * - `connection`: 'no-pipe' while no wire reaches the pipe, 'live' once a
 *   real porch feed is delivering readings.
 * - `channel`: the channel the pipe sits on (e.g. a CB channel or a ham
 *   frequency/mode label), or null while there is no pipe to sit anywhere.
 * - `scanning`: whether the pipe is scanning rather than holding a channel.
 * - `burst`: the last burst that raised on the porch —
 *   `{ kind: 'audio' | 'video' | 'data', at, summary }` — or null.
 *
 * Scaffold state: neither pipe has a wire into this app yet, so the only
 * reading either layer can honestly publish is APEX_PORCH_NO_PIPE. The
 * contract is the shape the real porch wire will fill when it exists.
 */

export const APEX_CB_LAYER_ID = 'apex-cb';
export const APEX_HAM_LAYER_ID = 'apex-ham';

const BURST_KINDS = Object.freeze(['audio', 'video', 'data']);

/** The porch reading when no wire reaches the pipe. */
export const APEX_PORCH_NO_PIPE = Object.freeze({
  connection: 'no-pipe',
  channel: null,
  scanning: false,
  burst: null,
});

/** One burst as the contract carries it, or null for anything else. */
function normalizeBurst(burst) {
  if (!burst || typeof burst !== 'object') return null;
  if (!BURST_KINDS.includes(burst.kind)) return null;
  return Object.freeze({
    kind: burst.kind,
    at: typeof burst.at === 'string' ? burst.at : null,
    summary: typeof burst.summary === 'string' ? burst.summary : '',
  });
}

/**
 * Validate a porch reading from any source. Anything malformed degrades
 * to the NO PIPE reading rather than dressing up as a connection.
 * @param {unknown} raw
 * @returns {object} A frozen porch reading.
 */
export function normalizePorchState(raw) {
  if (!raw || typeof raw !== 'object' || raw.connection !== 'live')
    return APEX_PORCH_NO_PIPE;
  return Object.freeze({
    connection: 'live',
    channel:
      typeof raw.channel === 'string' && raw.channel ? raw.channel : null,
    scanning: raw.scanning === true,
    burst: normalizeBurst(raw.burst),
  });
}
