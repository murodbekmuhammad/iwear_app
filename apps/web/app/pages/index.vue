<script setup lang="ts">
import type { StoreSummary } from '~/types';

const api = useApi();
const search = ref('');
const query = ref('');
let timer: ReturnType<typeof setTimeout> | undefined;
watch(search, (value) => {
  clearTimeout(timer);
  timer = setTimeout(() => (query.value = value.trim()), 300);
});

const { data: stores, pending } = await useAsyncData(
  'stores',
  () => api<StoreSummary[]>('/stores', { query: query.value ? { search: query.value } : {} }),
  { watch: [query] },
);
</script>

<template>
  <section class="intro">
    <h1>Find clothes you love, try them on, get them delivered.</h1>
    <input v-model="search" type="search" class="search" placeholder="Search stores" aria-label="Search stores" />
  </section>

  <p v-if="pending && !stores" class="muted">Loading stores…</p>
  <p v-else-if="!stores?.length" class="muted">
    {{ query ? `No stores match "${query}".` : 'No stores yet. Check back soon.' }}
  </p>
  <div v-else class="grid stores">
    <StoreCard v-for="store in stores" :key="store.id" :store="store" />
  </div>
</template>
