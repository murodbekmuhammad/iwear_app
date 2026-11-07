<script setup lang="ts">
import type { ProductCard, StoreSummary } from '~/types';

const route = useRoute();
const api = useApi();
const q = computed(() => (typeof route.query.q === 'string' ? route.query.q.trim() : ''));

const { data, pending } = await useAsyncData(
  'search',
  async () => {
    const query = q.value ? { search: q.value } : {};
    const [stores, products] = await Promise.all([
      q.value ? api<StoreSummary[]>('/stores', { query }) : Promise.resolve([] as StoreSummary[]),
      api<ProductCard[]>('/products', { query: { ...query, limit: 48 } }),
    ]);
    return { stores, products };
  },
  { watch: [q] },
);

useHead(() => ({ title: q.value ? `"${q.value}" · Iwear` : 'New in · Iwear' }));
</script>

<template>
  <section class="section">
    <nav class="breadcrumb" aria-label="Breadcrumb"><NuxtLink to="/">Home</NuxtLink> / {{ q ? 'Search' : 'New in' }}</nav>
    <h1>{{ q ? `Results for "${q}"` : 'New in' }}</h1>
    <p v-if="pending && !data" class="muted">Searching…</p>
    <template v-else-if="data">
      <div v-if="data.stores.length" class="store-grid">
        <StoreChip v-for="store in data.stores" :key="store.id" :store="store" />
      </div>
      <p v-if="!data.products.length && !data.stores.length" class="muted">
        Nothing matches "{{ q }}". Try a store name or a word like "dress".
      </p>
      <div v-else-if="data.products.length" class="product-grid">
        <ProductTile v-for="product in data.products" :key="product.id" :product="product" />
      </div>
    </template>
  </section>
</template>
