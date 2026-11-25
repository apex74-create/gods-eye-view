import { createHamRadioLayer } from '../../layers/apexComms/index.js';
import { useApexCommsStore } from '../../ui/stores/apexComms.js';
import { applicationPinia } from '../../ui/vueRuntime.js';

/**
 * Construct the Ham Radio comms layer, publishing its porch readings
 * to the Apex comms panel store as they change.
 */
export function createApplicationApexHam(options) {
  const store = useApexCommsStore(applicationPinia());
  return createHamRadioLayer({
    publish: (porch) => store.publish('ham', porch),
    ...options,
  });
}
