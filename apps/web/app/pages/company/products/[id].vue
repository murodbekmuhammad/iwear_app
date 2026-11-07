<script setup lang="ts">
import type { Product } from '~/types';

definePageMeta({ middleware: 'auth', roles: ['COMPANY'] });

const route = useRoute();
const api = useApi();
const { data: product, error } = await useAsyncData(`my-product-${route.params.id}`, () =>
  api<Product>(`/company/products/${route.params.id}`),
);
</script>

<template>
  <section>
    <NuxtLink to="/company/products" class="back">← My clothes</NuxtLink>
    <h1>Edit item</h1>
    <FormError v-if="error" :message="apiErrorMessage(error)" />
    <ProductForm v-else-if="product" :product="product" @saved="() => navigateTo('/company/products')" />
  </section>
</template>
