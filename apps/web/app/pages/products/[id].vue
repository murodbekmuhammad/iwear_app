<script setup lang="ts">
import type { PublicProduct } from '~/types';

const route = useRoute();
const api = useApi();
const media = useMediaUrl();
const { user } = useAuth();

const { data: product, error } = await useAsyncData(
  () => `product-${route.params.id}`,
  () => api<PublicProduct>(`/products/${route.params.id}`),
);

useHead(() => ({ title: product.value ? `${product.value.name} · Iwear` : 'Iwear' }));

const photo = ref(0);
const size = ref<string | null>(null);
const color = ref<string | null>(null);
const notice = ref<string | null>(null);

const hasSizeChart = computed(() => product.value?.sizes.some((s) => s.chestCm || s.waistCm || s.hipsCm));

function tryOn() {
  notice.value = 'Virtual try-on with your camera is coming soon.';
}

function order() {
  if (!user.value) return navigateTo({ path: '/login', query: { next: route.fullPath } });
  if (!size.value) {
    notice.value = 'Choose your size first.';
    return;
  }
  notice.value = 'Ordering opens in the next update. Your size is saved on this page for now.';
}
</script>

<template>
  <section v-if="error" class="card">
    <h1>This item isn't available</h1>
    <p><NuxtLink to="/">Back to all stores</NuxtLink></p>
  </section>

  <section v-else-if="product">
    <NuxtLink :to="`/stores/${product.company.slug}`" class="back">← {{ product.company.name }}</NuxtLink>
    <div class="product-page">
      <div class="gallery">
        <div class="product-photo large">
          <img v-if="product.images[photo]" :src="media(product.images[photo]!.url)" :alt="product.name" />
          <span v-else class="muted">No photo</span>
        </div>
        <div v-if="product.images.length > 1" class="thumbs">
          <button
            v-for="(image, index) in product.images"
            :key="image.id"
            :class="{ active: index === photo }"
            :aria-label="`Photo ${index + 1}`"
            @click="photo = index"
          >
            <img :src="media(image.url)" alt="" />
          </button>
        </div>
      </div>

      <div class="product-details">
        <span class="muted small">{{ categoryLabels[product.category] }}</span>
        <h1>{{ product.name }}</h1>
        <p class="price large">{{ formatPrice(product.price) }}</p>
        <p v-if="product.description">{{ product.description }}</p>

        <div v-if="product.colors.length" class="option-group">
          <span class="option-label">Colour</span>
          <div class="chips">
            <button v-for="c in product.colors" :key="c" :class="{ active: color === c }" @click="color = c">{{ c }}</button>
          </div>
        </div>

        <div class="option-group">
          <span class="option-label">Size</span>
          <div class="chips">
            <button
              v-for="s in product.sizes"
              :key="s.label"
              :class="{ active: size === s.label }"
              :disabled="s.stock === 0"
              :title="s.stock === 0 ? 'Sold out' : undefined"
              @click="size = s.label"
            >
              {{ s.label }}
            </button>
          </div>
        </div>

        <div class="actions stacked">
          <button class="btn btn-ghost" @click="tryOn">Try it on</button>
          <button class="btn" @click="order">{{ user ? 'Order' : 'Log in to order' }}</button>
        </div>
        <p v-if="notice" class="notice">{{ notice }}</p>

        <details v-if="hasSizeChart" class="size-chart">
          <summary>Size chart</summary>
          <table>
            <thead>
              <tr><th>Size</th><th>Chest</th><th>Waist</th><th>Hips</th></tr>
            </thead>
            <tbody>
              <tr v-for="s in product.sizes" :key="s.label">
                <td>{{ s.label }}</td>
                <td>{{ s.chestCm ? `${s.chestCm} cm` : '—' }}</td>
                <td>{{ s.waistCm ? `${s.waistCm} cm` : '—' }}</td>
                <td>{{ s.hipsCm ? `${s.hipsCm} cm` : '—' }}</td>
              </tr>
            </tbody>
          </table>
        </details>
      </div>
    </div>
  </section>
</template>
