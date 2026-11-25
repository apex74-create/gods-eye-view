# Apex Overlay — Survey and Scaffold Notes

Branch: `mav/apex-overlay` on the house fork `apex74-create/gods-eye-view`
(upstream: `bilawalsidhu/gods-eye-view`, MIT — license and attribution kept).

Purpose, in the owner's words: fork God's Eye View, "pipe us in" as an
overlay "like everybody else does," put Encrypted CB in it, and include the
house ham-radio assembly as another comms pipe — so the God's Eye crowd gets
comms on the globe.

## How the app is put together (survey)

### Layers

- A layer is a plain object with the contract
  `{ id, name, icon, source, updateInterval, init(viewer), enable(viewer),
  disable(viewer), update(viewer), destroy(viewer), getStats() }`.
  `getStats()` returns `{ count, lastUpdate, error }`.
  Canonical example: `src/layers/earthquakes/index.js`
  (`createEarthquakesLayer`).
- Layer packages live in `src/layers/<family>/`, usually split as
  `index.js` (lifecycle), `model.js` (pure helpers, overlay-entry factory),
  `records.js` (payload normalization), `source.js` (a snapshot source:
  an object with async methods such as `getSnapshot({ signal })`).
- Application wrappers live in `src/app/layers/<name>.js`
  (`createApplication<Name>`) and inject the app-owned services
  (overlay host, picking, context, input) into the portable package.
- The catalog is built in `src/app/constructCatalog.js`
  (`createApplicationCatalog`): every layer instance is constructed there
  and passed, with serialization metadata, to `createLayerCatalog`
  (`src/app/catalog.js`). The catalog refuses a layer whose id has no
  metadata entry, and metadata with no layer.
- Serialization metadata is `LAYER_STATE_REGISTRY` in
  `src/data/layerState.js`: one frozen entry per layer,
  `{ id, token, disposition }`. Tokens are short base-36 strings that keep
  share-link / saved-state encodings stable; they are allocated from
  `src/data/layerStateTokenReservations.json` (an array of `[id, token]`
  rows) and new ones are minted by the module's own
  `nextLayerStateToken()` — never hand-picked. Dispositions:
  `enabled-only`, `enabled+options`, `enabled+mirrored-options`.
  Hardware-local layers that must never enter share links instead go in
  `LOCAL_ONLY_LAYER_METADATA` in `constructCatalog.js` (the Apex layers
  are not local-only: the telemetry feed is public and the comms state is
  a stub, so they take normal registry entries).

### Sources

- Sources are named, family-specific objects. `resolveCatalogSources`
  (`src/app/sourceComposition.js`) validates supplied sources against
  `CATALOG_SOURCE_CONTRACTS` (source name → layer ids + required methods).
  An omitted contracted source is replaced by an inert stub that throws
  `SourceUnavailableError` — "an omitted provider is unavailable, never an
  authoritative empty dataset."
- Reference (default) sources are assembled in
  `src/sources/reference.js` (`createReferenceSources`), consumed by the
  standalone catalog in `src/standalone/layerSources.js`.

### Globe rendering

- Layers draw labels/cards on the globe through the world-overlay host:
  `src/app/layers/overlayHost.js` re-exports `setOverlayEntries`,
  `setOverlaySourceVisible`, `clearOverlaySource` from
  `src/overlays/worldOverlay.js`. A layer owns one overlay source id and
  pushes entry objects of the shape
  `{ id, position (fromDegrees), variant: 'label', title, accent,
  priority, collisionGroup, paintLane, interactive, ... }`
  (see `createEarthquakeOverlayEntry` in `src/layers/earthquakes/model.js`).
- Ground geometry (discs, lines) goes through the renderer draw sets
  (`drawOf(viewer)`); the Apex scaffold needs labels only.

### Panels / UI

- Layer toggles are generated from the catalog in the DATA LAYERS panel
  (`src/ui/layerPanel/`, `src/ui/layers.js`); display names come from
  `LAYER_NAME_KEYS` in `src/ui/layerNames.js` (presentation-only
  translation of the English `layer.name`).
- Rich per-layer panels are Vue: a Pinia store in `src/ui/stores/`
  (e.g. `stores/radio.js`, `stores/bhoteKoshiPanel.js`) holds a
  `shallowRef` presentation the layer-side code publishes to, and a view
  in `src/ui/views/panels/` (e.g. `RadioPanel.vue`, built on
  `src/ui/rail/RailPanel.vue`) renders it. Context-column panels mount in
  `src/ui/views/ContextView.vue`. Layer code reaches the store through
  `applicationPinia()` (`src/ui/vueRuntime.js`), as
  `src/data/bhoteKoshiEvent.js` does.
- The app also ships an MCP server and ~20 data layers plus an RF/SDR
  layer (`src/layers/radio/` is internet radio + local SDR presentation);
  nothing in the upstream app carries voice comms, amateur-radio state, or
  a command porch — the comms panels below are new surface, not a rework
  of the radio layer.

## What this scaffold adds

### 1. Apex Telemetry layer — `apex` (token `03`)

- `src/layers/apex/source.js` — `createApexTelemetrySource({ url })`,
  default URL the house public pipe:
  `https://raw.githubusercontent.com/apex74-create/apex-telemetry-pipe/main/telemetry.json`.
  `getSnapshot({ signal })` fetches and validates the payload.
- `src/layers/apex/records.js` — `normalizeApexTelemetrySnapshot`:
  requires the `apex-telemetry/` schema family; carries `factory` and
  `thread` through verbatim and extracts plottable points **only** from
  feed items that carry finite `lat`/`lon` (or `latitude`/`longitude`)
  in range, under `points`, `stations`, `nodes`, or `sites`. Nothing is
  invented: no point is placed at a guessed location.
- `src/layers/apex/model.js` — overlay-entry factory for points.
- `src/layers/apex/index.js` — `createApexLayer`: the standard lifecycle.
  On update it pushes one label entry per feed point to overlay source
  `apex`. `getStats()` also reports the feed header (schema,
  generated-at, factory rpm/red/open-PRs, thread ceiling/window pct).
- `src/app/layers/apex.js` — application wrapper (overlay host injection).
- Registered in `constructCatalog.js`, `LAYER_STATE_REGISTRY`,
  `layerStateTokenReservations.json`, `CATALOG_SOURCE_CONTRACTS`
  (`apex` → `['apex']`, `getSnapshot`), `createReferenceSources`, and
  `LAYER_NAME_KEYS` ("Apex Telemetry").

**Honest state today:** the live `apex-telemetry/1` feed carries factory
and thread fields only — it has **no geo points**. The layer therefore
renders zero pins and reports `feedState: 'live-no-points'` with the real
feed header in its stats. That is the truth of the pipe, shown as-is; the
first station/node that publishes coordinates appears on the globe with
no further code.

### 2. Encrypted CB comms panel — `apex-cb` (token `04`)

### 3. Ham Radio pipe seat — `apex-ham` (token `05`)

Both are one family, `src/layers/apexComms/`:

- `model.js` — the porch contract, shared by both pipes:
  `{ connection: 'no-pipe' | 'live', channel, scanning, burst }`, where
  `burst` is `{ kind: 'audio' | 'video' | 'data', at, summary }` when a
  burst raises. `APEX_PORCH_NO_PIPE` is the frozen no-wire state and
  `normalizePorchState` validates anything a future wire delivers.
- `source.js` — `createApexCommsStubSource()`: its `getPorchState()`
  returns the NO PIPE state **by construction** — there is no porch wire
  between Encrypted CB and this app yet, and no ham feed exists yet.
  This is a stub in the open, not a simulated connection.
- `index.js` — `createApexCommsLayer({ id, name, icon, source, publish })`
  factory; `createEncryptedCbLayer` / `createHamRadioLayer` fix the two
  identities. The layers render nothing on the globe (comms are a panel,
  not a map layer); their lifecycle keeps the porch state current.
- `src/app/layers/apexCb.js` / `apexHam.js` — wrappers that also publish
  the porch state to the panel store on enable/update/disable.
- `src/ui/stores/apexComms.js` — `useApexCommsStore` (`gev-apex-comms`),
  the publish-shaped store the panel renders from.
- `src/ui/views/panels/ApexCommsPanel.vue` — mounted in `ContextView.vue`
  beside the Radio panel. Two sections (ENCRYPTED CB, HAM RADIO), each
  showing connection state, channel, scan state, and last burst. With no
  wire, both read **NO PIPE**, channel "—", scanning off, burst "None" —
  the honest connection state, and the only user-facing wording of the
  stub. (The scaffold is labelled as such here in the notes and in code
  comments, per instructions, not in user-facing copy.)

## Registration bookkeeping this change also touches

Adding a catalog layer is not one edit; the app pins its layer set in
several places, and each was updated to match:

- `LAYER_STATE_REGISTRY` is kept sorted by id (its order owns stable URL
  ordering), so the Apex entries sit in sorted position, not appended.
- Test pins updated: catalog layer count 41 → 44
  (`constructCatalog.test.mjs`, `sourceComposition.test.mjs`), the
  construction-order slice after `radio`, registered-id count 39 → 42
  (`layerState.test.mjs`), and the token-ledger fixtures
  (`layerStateTokenLedger.test.mjs`) — the pinned ledger map, the
  "future layer takes the next pair" fixture (now `06`, since the Apex
  layers hold 03–05), the published-base counts, the retired-token
  fixture, and the encoded-length pin (81 → 90).
- Voice: every catalog layer must be in the voice manifest or explicitly
  voice-off (`src/voice/layerManifest.js`). All three Apex layers are
  registered in `VOICE_OFF_LAYERS` with their reasons — the telemetry
  layer has no voice query surface yet, and voice cannot control a comms
  porch that has no wire.

## Deliberately not done in this scaffold

- No porch wire: nothing here connects to a real Encrypted CB build or a
  ham receiver; both pipes wait on those feeds existing.
- No MCP tool exposure for the new layers, no voice/analyst records.
- No upstream branding, license, or attribution changes; the Apex pieces
  are additive only.
- Translations: the 16 new Apex strings ship English-only for now. Each
  locale catalog (`src/i18n/locales/*.json`) carries them with the
  English text as the value, and each is listed in
  `src/i18n/same-as-english.json` — the repo's own mechanism for "this
  string is intentionally English in this locale" — so the catalog gate
  passes honestly rather than with invented translations. A translation
  pass replaces the values later; nothing about the panel pretends
  otherwise.
