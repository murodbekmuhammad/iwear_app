<script setup lang="ts">
import type { Category, ProductCard, StoreSummary } from '~/types';

const api = useApi();
const media = useMediaUrl();
const category = ref<Category | undefined>();

const [{ data: stores }, { data: products, pending }] = await Promise.all([
  useAsyncData('home-stores', () => api<StoreSummary[]>('/stores')),
  useAsyncData(
    'home-products',
    () => api<ProductCard[]>('/products', { query: { limit: 12, ...(category.value ? { category: category.value } : {}) } }),
    { watch: [category] },
  ),
]);

// The hero shows the newest item that has a photo.
const { data: featured } = await useAsyncData('home-featured', () => api<ProductCard[]>('/products', { query: { limit: 1 } }));
const hero = computed(() => featured.value?.[0]);

const steps = [
  { title: 'Pick from any store', text: 'Browse clothes from all our partner stores in one place.' },
  { title: 'Try on with your camera', text: 'See each item on you. Keep the ones you like in your bag.' },
  { title: 'One checkout', text: 'Sign in once and pay for items from several stores together.' },
  { title: 'One delivery', text: 'Our courier collects from each store and brings it all to you.' },
];
</script>

<template>
  <div class="stack">
    <section class="hero">
      <div class="hero-copy">
        <span class="pill">No account needed to browse or try on</span>
        <h1>See it on you before you buy it</h1>
        <p>
          Clothes from many local stores in one place. Try them on with your camera, order several together, and we
          deliver everything in one trip.
        </p>
        <div class="actions">
          <NuxtLink :to="hero ? `/products/${hero.id}` : '/stores'" class="btn btn-large">
            <AppIcon name="camera" :size="20" />Start camera try-on
          </NuxtLink>
          <NuxtLink to="/stores" class="btn btn-ghost btn-large">Browse stores</NuxtLink>
        </div>
      </div>
      <div class="hero-visual">
        <img v-if="hero?.images[0]" :src="media(hero.images[0].url)" :alt="hero.name" />
        <span class="hero-tag"><i />Live try-on</span>
        <NuxtLink v-if="hero" :to="`/products/${hero.id}`" class="hero-caption">
          <strong>{{ hero.name }}</strong> · {{ hero.company?.name }} · {{ formatPrice(hero.price) }}
        </NuxtLink>
      </div>
    </section>

    <section v-if="stores?.length" class="section">
      <div class="section-head">
        <h2>Shop by store</h2>
        <NuxtLink to="/stores">All stores</NuxtLink>
      </div>
      <div class="store-grid">
        <StoreChip v-for="store in stores.slice(0, 8)" :key="store.id" :store="store" />
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <h2>Ready to try on</h2>
        <div class="chips" role="group" aria-label="Filter by type">
          <button class="chip" :class="{ active: !category }" @click="category = undefined">All</button>
          <button v-for="c in categories" :key="c" class="chip" :class="{ active: category === c }" @click="category = c">
            {{ categoryLabels[c] }}
          </button>
        </div>
      </div>
      <p v-if="pending && !products" class="muted">Loading…</p>
      <p v-else-if="!products?.length" class="muted">Nothing here yet. Try another type.</p>
      <div v-else class="product-grid">
        <ProductTile v-for="product in products" :key="product.id" :product="product" />
      </div>
    </section>

    <section class="card section">
      <h2>How it works</h2>
      <ol class="steps">
        <li v-for="(step, index) in steps" :key="step.title">
          <b>{{ index + 1 }}</b>
          <strong>{{ step.title }}</strong>
          <span>{{ step.text }}</span>
        </li>
      </ol>
    </section>
  </div>
</template>
