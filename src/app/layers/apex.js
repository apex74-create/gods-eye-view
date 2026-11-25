import { createApexLayer } from '../../layers/apex/index.js';
import { overlayHost } from './overlayHost.js';

/** Construct the Apex Telemetry layer on the application overlay host. */
export function createApplicationApex(options) {
  return createApexLayer({
    overlayHost,
    ...options,
  });
}
