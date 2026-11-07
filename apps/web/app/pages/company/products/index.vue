<script setup lang="ts">
import type { Product } from '~/types';

definePageMeta({ middleware: 'auth', roles: ['COMPANY'] });

const api = useApi();
const media = useMediaUrl();
const { user } = useAuth();
const { data: products, refresh, pending } = await useAsyncData('my-products', () => api<Product[]>('/company/products'));
const error = ref<string | null>(null);

async function remove(product: Product) {
  if (!window.confirm(`Delete "${product.name}"? This can't be undone.`)) return;
  try {
    await api(`/company/products/${product.id}`, { method: 'DELETE' });
    await refresh();
  } catch (e) {
    error.value = apiErrorMessage(e);
  }
}

const totalStock = (product: Product) => product.sizes.reduce((sum, size) => sum + size.stock, 0);
</script>

<template>
  <section>
    <div class="row between">
      <h1>My clothes</h1>
      <NuxtLink to="/company/products/new" class="btn">+ Add item</NuxtLink>
    </div>
    <CompanyStatusNotice />
    <p v-if="user?.company?.status === 'APPROVED'" class="muted small">
      Shoppers see your store at <NuxtLink :to="`/stores/${user.company.slug}`">/stores/{{ user.company.slug }}</NuxtLink>.
    </p>
    <FormError :message="error" />

    <p v-if="pending && !products" class="muted">Loading…</p>
    <div v-else-if="!products?.length" class="card empty">
      <h3>No clothes yet</h3>
      <p class="muted">Add your first item with a photo, price and sizes.</p>
      <NuxtLink to="/company/products/new" class="btn">+ Add item</NuxtLink>
    </div>
    <div v-else class="card table-wrap">
      <table>
        <thead>
          <tr><th>Item</th><th>Price</th><th>Sizes</th><th>Status</th><th /></tr>
        </thead>
        <tbody>
          <tr v-for="product in products" :key="product.id">
            <td>
              <div class="item-cell">
                <img v-if="product.images[0]" :src="media(product.images[0].url)" alt="" class="thumb" />
                <div v-else class="thumb thumb-empty" />
                <div>
                  <strong>{{ product.name }}</strong>
                  <div class="muted small">{{ categoryLabels[product.category] }}</div>
                </div>
              </div>
            </td>
            <td>{{ formatPrice(product.price) }}</td>
            <td>
              {{ product.sizes.map((s) => s.label).join(', ') }}
              <div class="muted small">{{ totalStock(product) }} in stock</div>
            </td>
            <td>
              <span class="badge" :class="product.isPublished ? 'badge-approved' : ''">
                {{ product.isPublished ? 'Visible' : 'Hidden' }}
              </span>
            </td>
            <td class="actions">
              <NuxtLink :to="`/company/products/${product.id}`" class="btn btn-ghost btn-small">Edit</NuxtLink>
              <button class="btn btn-ghost btn-small" @click="remove(product)">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
