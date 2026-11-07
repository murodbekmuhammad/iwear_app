<script setup lang="ts">
definePageMeta({ middleware: 'auth', roles: ['COMPANY'] });
</script>

<template>
  <section>
    <NuxtLink to="/company/products" class="back">← My clothes</NuxtLink>
    <h1>Add an item</h1>
    <ProductForm @saved="() => navigateTo('/company/products')" />
  </section>
</template>
