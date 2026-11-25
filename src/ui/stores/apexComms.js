import { defineStore } from 'pinia';
import { markRaw, shallowRef } from 'vue';

/**
 * The Apex comms panel as its view renders it. The Encrypted CB and Ham
 * Radio layers publish their porch readings here (connection, channel,
 * scan state, last burst — see src/layers/apexComms/model.js); the panel
 * is a readout only, so the store carries no controls back. A pipe that
 * has never published reads as null and the panel shows its NO PIPE
 * state, which is also the truth until a porch wire exists.
 */
export const useApexCommsStore = defineStore('gev-apex-comms', () => {
  /** The two pipes' latest porch readings: `{ cb, ham }`, either nullable. */
  const pipes = shallowRef({ cb: null, ham: null });

  /**
   * Publish one pipe's fresh porch reading.
   * @param {'cb' | 'ham'} pipe
   * @param {?object} next The porch reading, or null to clear it.
   */
  function publish(pipe, next) {
    if (pipe !== 'cb' && pipe !== 'ham') return;
    pipes.value = { ...pipes.value, [pipe]: next && markRaw(next) };
  }

  return { pipes, publish };
});
