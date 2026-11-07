<script setup lang="ts">
import type { Category, Store } from '~/types';

const route = useRoute();
const api = useApi();
const { data: store, error } = await useAsyncData(`store-${route.params.slug}`, () => api<Store>(`/stores/${route.params.slug}`));
useHead(() => ({ title: store.value ? `${store.value.name} · Iwear` : 'Store · Iwear' }));

// Filters run in the browser: a store's catalogue is small enough to load at once.
const types = ref<Category[]>([]);
const size = ref<string | null>(null);
const price = ref<'any' | 'under' | 'over'>('any');
const sort = ref<'new' | 'low' | 'high'>('new');
const PRICE_SPLIT = 300_000;

const sizes = computed(() => {
  const all = new Set<string>();
  store.value?.products.forEach((p) => p.sizes.forEach((s) => all.add(s.label)));
  return [...all];
});

const results = computed(() => {
  let list = [...(store.value?.products ?? [])];
  if (types.value.length) list = list.filter((p) => types.value.includes(p.category));
  if (size.value) list = list.filter((p) => p.sizes.some((s) => s.label === size.value && s.stock > 0));
  if (price.value === 'under') list = list.filter((p) => p.price < PRICE_SPLIT);
  if (price.value === 'over') list = list.filter((p) => p.price >= PRICE_SPLIT);
  if (sort.value === 'low') list.sort((a, b) => a.price - b.price);
  if (sort.value === 'high') list.sort((a, b) => b.price - a.price);
  return list;
});
</script>

<template>
  <section v-if="error" class="card empty">
    <h3>Store not found</h3>
    <NuxtLink to="/stores" class="btn">See all stores</NuxtLink>
  </section>

  <section v-else-if="store">
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <NuxtLink to="/">Home</NuxtLink> / <NuxtLink to="/stores">Stores</NuxtLink> / {{ store.name }}
    </nav>

    <div class="store-banner">
      <StoreAvatar :name="store.name" :logo-url="store.logoUrl" size="lg" />
      <div>
        <h1>{{ store.name }}</h1>
        <p>{{ store.description || 'Every item can be tried on with your camera.' }}</p>
        <p v-if="store.address" class="small muted">{{ store.address }}</p>
      </div>
      <span class="pill pill-white"><AppIcon name="truck" />Delivered by Iwear</span>
    </div>

    <div class="store-layout">
      <aside class="filters" aria-label="Filters">
        <fieldset v-if="store.categories.length > 1">
          <legend>Type</legend>
          <label v-for="c in store.categories" :key="c" class="inline">
            <input v-model="types" type="checkbox" :value="c" />{{ categoryLabels[c] }}
          </label>
        </fieldset>
        <fieldset v-if="sizes.length">
          <legend>Size</legend>
          <div class="size-filter">
            <button v-for="s in sizes" :key="s" type="button" class="chip" :class="{ active: size === s }" :aria-pressed="size === s" @click="size = size === s ? null : s">
              {{ s }}
            </button>
          </div>
        </fieldset>
        <fieldset>
          <legend>Price</legend>
          <label class="inline"><input v-model="price" type="radio" value="any" />Any price</label>
          <label class="inline"><input v-model="price" type="radio" value="under" />Under {{ formatPrice(PRICE_SPLIT) }}</label>
          <label class="inline"><input v-model="price" type="radio" value="over" />{{ formatPrice(PRICE_SPLIT) }} and up</label>
        </fieldset>
      </aside>

      <section class="store-results">
        <div class="results-bar">
          <span>{{ results.length }} {{ results.length === 1 ? 'item' : 'items' }}</span>
          <label>Sort
            <select v-model="sort">
              <option value="new">Newest</option>
              <option value="low">Price: low to high</option>
              <option value="high">Price: high to low</option>
            </select>
          </label>
        </div>
        <p v-if="!store.products.length" class="muted">This store hasn't added any clothes yet.</p>
        <p v-else-if="!results.length" class="muted">No items match these filters.</p>
        <div v-else class="product-grid">
          <ProductTile v-for="product in results" :key="product.id" :product="product" :store-name="categoryLabels[product.category]" />
        </div>
      </section>
    </div>
  </section>
</template>
