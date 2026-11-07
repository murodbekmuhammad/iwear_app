<script setup lang="ts">
const media = useMediaUrl();
const { items, byStore, count, subtotal, setQuantity, remove, maxQuantity } = useBag();
useHead({ title: 'Your bag · Iwear' });
</script>

<template>
  <ClientOnly>
    <section v-if="!items.length" class="card empty">
      <h3>Your bag is empty</h3>
      <p class="muted">Add clothes from any store. You can mix several stores in one order.</p>
      <NuxtLink to="/" class="btn">Start shopping</NuxtLink>
    </section>

    <section v-else class="section">
      <div>
        <h1 style="margin-bottom: 6px">Your bag</h1>
        <p class="muted" style="margin: 0">
          {{ count }} {{ count === 1 ? 'item' : 'items' }} from {{ byStore.length }} {{ byStore.length === 1 ? 'store' : 'stores' }} · one checkout, one delivery
        </p>
      </div>

      <div class="bag-layout">
        <div class="bag-items">
          <section v-for="group in byStore" :key="group.storeSlug" class="bag-store">
            <div class="bag-store-head">
              <span><StoreAvatar :name="group.storeName" :logo-url="group.storeLogoUrl" size="sm" />{{ group.storeName }}</span>
              <NuxtLink :to="`/stores/${group.storeSlug}`">Visit store</NuxtLink>
            </div>
            <div v-for="item in group.items" :key="`${item.productId}-${item.size}-${item.color}`" class="bag-line">
              <NuxtLink :to="`/products/${item.productId}`" class="bag-thumb">
                <img v-if="item.imageUrl" :src="media(item.imageUrl)" :alt="item.name" />
              </NuxtLink>
              <div class="bag-line-info">
                <div class="bag-line-top">
                  <NuxtLink :to="`/products/${item.productId}`">{{ item.name }}</NuxtLink>
                  <span>{{ formatPrice(item.price * item.quantity) }}</span>
                </div>
                <span class="muted small">{{ [item.color, item.size].filter(Boolean).join(' · ') }} · {{ formatPrice(item.price) }} each</span>
                <div class="bag-controls">
                  <div class="qty">
                    <button type="button" aria-label="Decrease quantity" :disabled="item.quantity <= 1" @click="setQuantity(item, item.quantity - 1)">−</button>
                    <span>{{ item.quantity }}</span>
                    <button type="button" aria-label="Increase quantity" :disabled="item.quantity >= maxQuantity" @click="setQuantity(item, item.quantity + 1)">+</button>
                  </div>
                  <button type="button" class="link-button" @click="remove(item)">Remove</button>
                </div>
              </div>
            </div>
          </section>
          <NuxtLink to="/" class="small" style="font-weight: 600">← Continue shopping</NuxtLink>
        </div>

        <aside class="summary" aria-label="Order summary">
          <h2>Summary</h2>
          <div class="summary-row"><span>Subtotal</span><span>{{ formatPrice(subtotal) }}</span></div>
          <div class="summary-row"><span>Delivery (one courier)</span><span>At checkout</span></div>
          <div class="summary-total"><span>Total</span><span>{{ formatPrice(subtotal) }}</span></div>
          <NuxtLink to="/checkout" class="btn btn-large btn-block">Checkout</NuxtLink>
          <span class="summary-note"><AppIcon name="lock" :size="14" />You'll sign in at the next step. Your bag is saved.</span>
        </aside>
      </div>
    </section>
  </ClientOnly>
</template>
