<script setup lang="ts">
import type { StoreSummary } from '~/types';

defineProps<{ store: StoreSummary }>();
const media = useMediaUrl();
</script>

<template>
  <NuxtLink :to="`/stores/${store.slug}`" class="card store-card">
    <div class="store-preview">
      <img v-for="url in store.previewImages" :key="url" :src="media(url)" alt="" loading="lazy" />
      <div v-if="!store.previewImages.length" class="store-preview-empty">No photos yet</div>
    </div>
    <div class="store-info">
      <img v-if="store.logoUrl" :src="media(store.logoUrl)" :alt="`${store.name} logo`" class="logo" />
      <div v-else class="logo logo-letter">{{ store.name.charAt(0) }}</div>
      <div>
        <strong>{{ store.name }}</strong>
        <div class="muted small">
          {{ store.productCount }} {{ store.productCount === 1 ? 'item' : 'items' }}
          <template v-if="store.address"> · {{ store.address }}</template>
        </div>
      </div>
    </div>
  </NuxtLink>
</template>
