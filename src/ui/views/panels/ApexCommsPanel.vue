<script setup>
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import { t } from '../../../i18n/index.js';
import RailPanel from '../../rail/RailPanel.vue';
import { useApexCommsStore } from '../../stores/apexComms.js';

// The Apex comms panel inside Context. The Encrypted CB and Ham Radio
// layers publish their porch readings to the store; until a pipe does —
// and until a real porch wire exists at all — each pipe shows NO PIPE,
// which is the honest connection state, not a placeholder reading.
const store = useApexCommsStore();
const { pipes } = storeToRefs(store);

const NO_PIPE = Object.freeze({
  connection: 'no-pipe',
  channel: null,
  scanning: false,
  burst: null,
});
const cb = computed(() => pipes.value.cb ?? NO_PIPE);
const ham = computed(() => pipes.value.ham ?? NO_PIPE);
const anyLive = computed(
  () => cb.value.connection === 'live' || ham.value.connection === 'live',
);
const connectionText = (porch) =>
  porch.connection === 'live' ? t('LIVE') : t('NO PIPE');
const channelText = (porch) => porch.channel ?? '—';
const scanText = (porch) => (porch.scanning ? t('SCANNING') : t('HOLDING'));
const burstText = (porch) =>
  porch.burst ? porch.burst.summary || porch.burst.kind : t('None');
</script>

<template>
<RailPanel id="apex-comms-panel" tag="section" start-collapsed :aria-label="t('Apex comms')" :title="t('APEX COMMS')" :glow="false" scroll>
  <template #badge><span class="apex-comms-state" :class="{ active: anyLive }">{{ anyLive ? t('LIVE') : t('NO PIPE') }}</span></template>
  <div class="apex-comms-pipe">
    <strong>{{ t('ENCRYPTED CB') }}</strong>
    <dl>
      <div><dt>{{ t('Connection') }}</dt><dd>{{ connectionText(cb) }}</dd></div>
      <div><dt>{{ t('Channel') }}</dt><dd>{{ channelText(cb) }}</dd></div>
      <div><dt>{{ t('Scan') }}</dt><dd>{{ scanText(cb) }}</dd></div>
      <div><dt>{{ t('Last burst') }}</dt><dd>{{ burstText(cb) }}</dd></div>
    </dl>
  </div>
  <div class="apex-comms-pipe">
    <strong>{{ t('HAM RADIO') }}</strong>
    <dl>
      <div><dt>{{ t('Connection') }}</dt><dd>{{ connectionText(ham) }}</dd></div>
      <div><dt>{{ t('Channel') }}</dt><dd>{{ channelText(ham) }}</dd></div>
      <div><dt>{{ t('Scan') }}</dt><dd>{{ scanText(ham) }}</dd></div>
      <div><dt>{{ t('Last burst') }}</dt><dd>{{ burstText(ham) }}</dd></div>
    </dl>
  </div>
</RailPanel>
</template>
