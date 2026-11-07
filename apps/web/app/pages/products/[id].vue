<script setup lang="ts">
import type { PublicProduct } from '~/types';

const route = useRoute();
const api = useApi();
const media = useMediaUrl();
const bag = useBag();

const { data: product, error } = await useAsyncData(`product-${route.params.id}`, () =>
  api<PublicProduct>(`/products/${route.params.id}`),
);
useHead(() => ({ title: product.value ? `${product.value.name} · Iwear` : 'Iwear' }));

const photo = ref(0);
const color = ref<string | null>(product.value?.colors[0] ?? null);
const size = ref<string | null>(null);
const showChart = ref(false);
const notice = ref<{ text: string; ok?: boolean } | null>(null);

const hasSizeChart = computed(() => product.value?.sizes.some((s) => s.chestCm || s.waistCm || s.hipsCm));

function tryOn() {
  if (product.value) navigateTo({ path: '/try-on', query: { product: product.value.id } });
}

function addToBag() {
  if (!product.value) return;
  if (!size.value) {
    notice.value = { text: 'Choose your size first.' };
    return;
  }
  bag.add({
    productId: product.value.id,
    name: product.value.name,
    price: product.value.price,
    size: size.value,
    color: color.value,
    imageUrl: product.value.images[0]?.url ?? null,
    storeName: product.value.company.name,
    storeSlug: product.value.company.slug,
    storeLogoUrl: product.value.company.logoUrl,
  });
  notice.value = { text: 'Added to your bag.', ok: true };
}
</script>

<template>
  <section v-if="error" class="card empty">
    <h3>This item isn't available</h3>
    <NuxtLink to="/" class="btn">Back to the shop</NuxtLink>
  </section>

  <section v-else-if="product">
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <NuxtLink to="/">Home</NuxtLink> /
      <NuxtLink :to="`/stores/${product.company.slug}`">{{ product.company.name }}</NuxtLink> / {{ product.name }}
    </nav>

    <div class="product-page">
      <div class="gallery">
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
        <div class="main-photo">
          <img v-if="product.images[photo]" :src="media(product.images[photo]!.url)" :alt="product.name" />
          <span v-else class="muted">No photo</span>
        </div>
      </div>

      <div class="product-details">
        <div class="product-title">
          <NuxtLink :to="`/stores/${product.company.slug}`">{{ product.company.name }}</NuxtLink>
          <h1>{{ product.name }}</h1>
          <span class="product-price">{{ formatPrice(product.price) }}</span>
        </div>

        <div v-if="product.colors.length" class="option-group">
          <span class="option-label">Colour · {{ color }}</span>
          <div class="chips">
            <button v-for="c in product.colors" :key="c" class="chip" :class="{ active: color === c }" :aria-pressed="color === c" @click="color = c">{{ c }}</button>
          </div>
        </div>

        <div class="option-group">
          <span class="option-label">
            <span>Size</span>
            <button v-if="hasSizeChart" type="button" class="link-button" @click="showChart = !showChart">Size guide</button>
          </span>
          <div class="size-grid">
            <button
              v-for="s in product.sizes"
              :key="s.label"
              class="chip"
              :class="{ active: size === s.label }"
              :aria-pressed="size === s.label"
              :disabled="s.stock === 0"
              :title="s.stock === 0 ? 'Sold out' : undefined"
              @click="size = s.label"
            >
              {{ s.label }}
            </button>
          </div>
          <table v-if="showChart" class="size-chart">
            <thead><tr><th>Size</th><th>Chest</th><th>Waist</th><th>Hips</th></tr></thead>
            <tbody>
              <tr v-for="s in product.sizes" :key="s.label">
                <td>{{ s.label }}</td>
                <td>{{ s.chestCm ? `${s.chestCm} cm` : '—' }}</td>
                <td>{{ s.waistCm ? `${s.waistCm} cm` : '—' }}</td>
                <td>{{ s.hipsCm ? `${s.hipsCm} cm` : '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="cta-row">
          <button class="btn btn-ghost btn-large" @click="tryOn"><AppIcon name="camera" :size="20" />Try on with webcam</button>
          <button class="btn btn-large" @click="addToBag">Add to bag</button>
        </div>
        <p v-if="notice" class="notice" :class="notice.ok ? 'notice-ok' : ''" role="status">
          {{ notice.text }}
          <NuxtLink v-if="notice.ok" to="/bag">View bag</NuxtLink>
        </p>

        <div class="info-box">
          <div><AppIcon name="truck" :size="22" /><span>Delivered by Iwear together with items from other stores</span></div>
          <div>
            <strong>About this item</strong>
            {{ product.description || `${categoryLabels[product.category]} from ${product.company.name}.` }}
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
