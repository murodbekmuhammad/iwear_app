<script setup lang="ts">
defineProps<{ title?: string }>();
const media = useMediaUrl();
const { items, subtotal } = useBag();
</script>

<template>
  <ClientOnly>
    <aside v-if="items.length" class="auth-aside" aria-label="Your bag">
      <h2>{{ title ?? 'Your bag is saved' }}</h2>
      <div v-for="item in items" :key="`${item.productId}-${item.size}-${item.color}`" class="mini-line">
        <img v-if="item.imageUrl" :src="media(item.imageUrl)" alt="" />
        <span v-else class="mini-thumb" />
        <span><strong>{{ item.name }}</strong><em>{{ item.storeName }} · {{ item.size }}<template v-if="item.quantity > 1"> · ×{{ item.quantity }}</template></em></span>
        <span>{{ formatPrice(item.price * item.quantity) }}</span>
      </div>
      <div class="summary-total"><span>Subtotal</span><span>{{ formatPrice(subtotal) }}</span></div>
    </aside>
  </ClientOnly>
</template>
