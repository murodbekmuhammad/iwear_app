<script setup lang="ts">
import type { ProductCard } from '~/types';

const props = defineProps<{ product: ProductCard; storeName?: string }>();
const media = useMediaUrl();
const soldOut = computed(() => props.product.sizes.every((size) => size.stock === 0));
const subtitle = computed(() => props.storeName ?? props.product.company?.name ?? categoryLabels[props.product.category]);
</script>

<template>
  <NuxtLink :to="`/products/${product.id}`" class="product-tile">
    <span class="product-photo">
      <img v-if="product.images[0]" :src="media(product.images[0].url)" :alt="product.name" loading="lazy" />
      <span v-else class="muted small">No photo</span>
      <span class="try-badge"><AppIcon name="camera" :size="14" />{{ soldOut ? 'Sold out' : 'Try on' }}</span>
    </span>
    <span class="tile-meta">
      <span>
        <strong>{{ product.name }}</strong>
        <span>{{ subtitle }}</span>
      </span>
      <span class="price">{{ formatPrice(product.price) }}</span>
    </span>
  </NuxtLink>
</template>
