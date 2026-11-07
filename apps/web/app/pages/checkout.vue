<script setup lang="ts">
definePageMeta({ middleware: 'auth', roles: ['CUSTOMER'] });
const { items } = useBag();
useHead({ title: 'Checkout · Iwear' });
</script>

<template>
  <div class="auth-layout">
    <section class="auth-card">
      <span class="auth-icon"><AppIcon name="truck" :size="26" /></span>
      <h1>Checkout</h1>
      <ClientOnly>
        <p v-if="items.length">
          You're signed in and your bag is ready. Choosing your delivery spot on the map and paying arrive in the next
          update.
        </p>
        <p v-else>Your bag is empty. Add something first.</p>
      </ClientOnly>
      <div class="actions">
        <NuxtLink to="/bag" class="btn btn-ghost">Back to bag</NuxtLink>
        <NuxtLink to="/" class="btn">Keep shopping</NuxtLink>
      </div>
    </section>
    <BagSummaryAside title="Your order" />
  </div>
</template>
