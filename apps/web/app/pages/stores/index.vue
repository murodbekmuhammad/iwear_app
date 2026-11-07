<script setup lang="ts">
import type { StoreSummary } from '~/types';

const api = useApi();
const { data: stores, pending } = await useAsyncData('all-stores', () => api<StoreSummary[]>('/stores'));
useHead({ title: 'Stores · Iwear' });
</script>

<template>
  <section class="section">
    <nav class="breadcrumb" aria-label="Breadcrumb"><NuxtLink to="/">Home</NuxtLink> / Stores</nav>
    <h1>All stores</h1>
    <p v-if="pending && !stores" class="muted">Loading stores…</p>
    <p v-else-if="!stores?.length" class="muted">No stores yet. Check back soon.</p>
    <div v-else class="store-grid">
      <StoreChip v-for="store in stores" :key="store.id" :store="store" />
    </div>
  </section>
</template>
