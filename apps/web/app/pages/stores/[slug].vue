<script setup lang="ts">
import type { Category, Store } from '~/types';

const route = useRoute();
const api = useApi();
const media = useMediaUrl();
const category = ref<Category | undefined>();

const { data: store, error } = await useAsyncData(
  () => `store-${route.params.slug}`,
  () => api<Store>(`/stores/${route.params.slug}`, { query: category.value ? { category: category.value } : {} }),
  { watch: [category] },
);

useHead(() => ({ title: store.value ? `${store.value.name} · Iwear` : 'Store · Iwear' }));
</script>

<template>
  <section v-if="error" class="card">
    <h1>Store not found</h1>
    <p><NuxtLink to="/">Back to all stores</NuxtLink></p>
  </section>

  <section v-else-if="store">
    <NuxtLink to="/" class="back">← All stores</NuxtLink>
    <div class="store-header">
      <img v-if="store.logoUrl" :src="media(store.logoUrl)" :alt="`${store.name} logo`" class="logo logo-large" />
      <div v-else class="logo logo-large logo-letter">{{ store.name.charAt(0) }}</div>
      <div>
        <h1>{{ store.name }}</h1>
        <p v-if="store.description" class="muted">{{ store.description }}</p>
        <p v-if="store.address" class="muted small">{{ store.address }}</p>
      </div>
    </div>

    <div v-if="store.categories.length > 1" class="tabs">
      <button :class="{ active: !category }" @click="category = undefined">All</button>
      <button v-for="c in store.categories" :key="c" :class="{ active: category === c }" @click="category = c">
        {{ categoryLabels[c] }}
      </button>
    </div>

    <p v-if="!store.products.length" class="muted">This store hasn't added any clothes yet.</p>
    <div v-else class="grid products">
      <ProductTile v-for="product in store.products" :key="product.id" :product="product" />
    </div>
  </section>
</template>
