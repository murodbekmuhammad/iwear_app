<script setup lang="ts">
import type { ProductCard } from '~/types';

const props = defineProps<{ product: ProductCard }>();
const media = useMediaUrl();
const inStock = computed(() => props.product.sizes.filter((size) => size.stock > 0).map((size) => size.label));
</script>

<template>
  <NuxtLink :to="`/products/${product.id}`" class="product-tile">
    <div class="product-photo">
      <img v-if="product.images[0]" :src="media(product.images[0].url)" :alt="product.name" loading="lazy" />
      <span v-else class="muted small">No photo</span>
    </div>
    <strong>{{ product.name }}</strong>
    <span class="price">{{ formatPrice(product.price) }}</span>
    <span class="muted small">{{ inStock.length ? `Sizes ${inStock.join(', ')}` : 'Sold out' }}</span>
  </NuxtLink>
</template>
