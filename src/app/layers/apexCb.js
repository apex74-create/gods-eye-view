import { createEncryptedCbLayer } from '../../layers/apexComms/index.js';
import { useApexCommsStore } from '../../ui/stores/apexComms.js';
import { applicationPinia } from '../../ui/vueRuntime.js';

/**
 * Construct the Encrypted CB comms layer, publishing its porch readings
 * to the Apex comms panel store as they change.
 */
export function createApplicationApexCb(options) {
  const store = useApexCommsStore(applicationPinia());
  return createEncryptedCbLayer({
    publish: (porch) => store.publish('cb', porch),
    ...options,
  });
}
