/**
 * Apex Telemetry layer constants and the overlay entries its points draw.
 *
 * The layer consumes the house telemetry pipe (`apex-telemetry/1`): factory
 * and thread state today, and station/node points whenever the feed starts
 * carrying coordinates. Entries follow the shared world-overlay label
 * shape, as the earthquake labels do.
 */

export const APEX_LAYER_ID = 'apex';
/** The overlay source the layer's point labels are shown in. */
export const APEX_OVERLAY_SOURCE_ID = 'apex';
/** The Apex mark's amber, used for every point label the layer draws. */
export const APEX_ACCENT = '#ffb454';

/** One feed point's label on the globe. */
export function createApexOverlayEntry({ id, position, label }) {
  return {
    id: String(id),
    position,
    variant: 'label',
    title: String(label || 'APEX'),
    accent: APEX_ACCENT,
    priority: 500,
    collisionGroup: 'ambient-label',
    paintLane: 'ambient-label',
    interactive: false,
    edgeFade: 'keyhole',
    horizonCull: true,
    terrainOcclusion: false,
    gapPx: 15,
    verticalOnly: true,
    placement: 'above',
  };
}
