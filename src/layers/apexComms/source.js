import { APEX_PORCH_NO_PIPE } from './model.js';

/**
 * The comms source until a real porch wire exists: every reading is the
 * NO PIPE state, by construction. There is no Encrypted CB porch feed and
 * no ham feed into this app yet, so this source does not simulate one —
 * when the wire lands, a real source with the same `getPorchState` shape
 * replaces it and nothing else changes.
 */
export function createApexCommsStubSource() {
  return {
    async getPorchState() {
      return APEX_PORCH_NO_PIPE;
    },
  };
}
