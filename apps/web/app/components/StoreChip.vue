<script setup lang="ts">
import type { StoreSummary } from '~/types';

defineProps<{ store: StoreSummary }>();
</script>

<template>
  <NuxtLink :to="`/stores/${store.slug}`" class="store-chip">
    <StoreAvatar :name="store.name" :logo-url="store.logoUrl" />
    <span>
      <strong>{{ store.name }}</strong>
      <span>{{ store.productCount }} {{ store.productCount === 1 ? 'item' : 'items' }}<template v-if="store.address"> · {{ store.address.split(',')[0] }}</template></span>
    </span>
  </NuxtLink>
</template>
