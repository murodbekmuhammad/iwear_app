<script setup lang="ts">
import type { Category, Product, ProductSize } from '~/types';

const props = defineProps<{ product?: Product | null }>();
const emit = defineEmits<{ saved: [product: Product] }>();

const api = useApi();
const media = useMediaUrl();
const COMMON_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

interface SizeRow { label: string; stock: number | null; chestCm: number | null; waistCm: number | null; hipsCm: number | null }

const form = reactive({
  name: '',
  description: '',
  category: 'DRESS' as Category,
  price: null as number | null,
  colors: '',
  isPublished: true,
  sizes: [] as SizeRow[],
});
const showChart = ref(false);

function load(product?: Product | null) {
  form.name = product?.name ?? '';
  form.description = product?.description ?? '';
  form.category = product?.category ?? 'DRESS';
  form.price = product?.price ?? null;
  form.colors = product?.colors.join(', ') ?? '';
  form.isPublished = product?.isPublished ?? true;
  form.sizes = (product?.sizes ?? [{ label: 'S', stock: 1 }, { label: 'M', stock: 1 }, { label: 'L', stock: 1 }]).map((s: ProductSize) => ({
    label: s.label,
    stock: s.stock,
    chestCm: s.chestCm ?? null,
    waistCm: s.waistCm ?? null,
    hipsCm: s.hipsCm ?? null,
  }));
  showChart.value = form.sizes.some((s) => s.chestCm || s.waistCm || s.hipsCm);
}
watch(() => props.product, load, { immediate: true });

function addSize() {
  const next = COMMON_SIZES.find((label) => !form.sizes.some((s) => s.label === label)) ?? '';
  form.sizes.push({ label: next, stock: 1, chestCm: null, waistCm: null, hipsCm: null });
}

const saving = ref(false);
const error = ref<string | null>(null);

// Photos chosen before the product exists are uploaded right after it is created.
const pendingFiles = ref<File[]>([]);
const uploading = ref(false);
const photoError = ref<string | null>(null);
const current = ref<Product | null>(props.product ?? null);
watch(() => props.product, (p) => (current.value = p ?? null));

async function uploadFiles(productId: string, files: File[]) {
  const body = new FormData();
  files.forEach((file) => body.append('images', file));
  return api<Product>(`/company/products/${productId}/images`, { method: 'POST', body });
}

async function onFiles(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  input.value = '';
  if (!files.length) return;
  photoError.value = null;
  if (!current.value) {
    pendingFiles.value.push(...files);
    return;
  }
  uploading.value = true;
  try {
    current.value = await uploadFiles(current.value.id, files);
  } catch (e) {
    photoError.value = apiErrorMessage(e);
  } finally {
    uploading.value = false;
  }
}

async function removePhoto(imageId: string) {
  if (!current.value) return;
  try {
    current.value = await api<Product>(`/company/products/${current.value.id}/images/${imageId}`, { method: 'DELETE' });
  } catch (e) {
    photoError.value = apiErrorMessage(e);
  }
}

const previews = computed(() => pendingFiles.value.map((file) => ({ file, url: import.meta.client ? URL.createObjectURL(file) : '' })));

const num = (value: number | null | '') => (value === null || value === '' ? undefined : Number(value));

async function save() {
  error.value = null;
  saving.value = true;
  try {
    const body = {
      name: form.name,
      description: form.description || undefined,
      category: form.category,
      price: Number(form.price ?? 0),
      colors: form.colors.split(',').map((c) => c.trim()).filter(Boolean),
      isPublished: form.isPublished,
      sizes: form.sizes
        .filter((s) => s.label.trim())
        .map((s) => ({
          label: s.label.trim(),
          stock: Number(s.stock ?? 0),
          chestCm: showChart.value ? num(s.chestCm) : undefined,
          waistCm: showChart.value ? num(s.waistCm) : undefined,
          hipsCm: showChart.value ? num(s.hipsCm) : undefined,
        })),
    };
    let saved = current.value
      ? await api<Product>(`/company/products/${current.value.id}`, { method: 'PATCH', body })
      : await api<Product>('/company/products', { method: 'POST', body });
    if (pendingFiles.value.length) {
      try {
        saved = await uploadFiles(saved.id, pendingFiles.value);
        pendingFiles.value = [];
      } catch (e) {
        photoError.value = `Saved, but the photos didn't upload: ${apiErrorMessage(e)}`;
      }
    }
    current.value = saved;
    emit('saved', saved);
  } catch (e) {
    error.value = apiErrorMessage(e);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <form class="card form" @submit.prevent="save">
    <label>Name <input v-model="form.name" required minlength="2" placeholder="e.g. Silk summer dress" /></label>

    <div class="form-row">
      <label>
        Type
        <select v-model="form.category">
          <option v-for="c in categories" :key="c" :value="c">{{ categoryLabels[c] }}</option>
        </select>
      </label>
      <label>Price (so'm) <input v-model.number="form.price" type="number" min="0" step="1000" required placeholder="450000" /></label>
    </div>

    <label>Description (optional) <textarea v-model="form.description" rows="3" /></label>
    <label>Colours (optional) <input v-model="form.colors" placeholder="Blue, Gold" /></label>

    <fieldset class="photos">
      <legend>Photos</legend>
      <div class="photo-grid">
        <div v-for="image in current?.images ?? []" :key="image.id" class="photo-item">
          <img :src="media(image.url)" alt="" />
          <button type="button" class="photo-remove" aria-label="Remove photo" @click="removePhoto(image.id)">×</button>
        </div>
        <div v-for="preview in previews" :key="preview.url" class="photo-item">
          <img :src="preview.url" alt="" />
          <button type="button" class="photo-remove" aria-label="Remove photo" @click="pendingFiles.splice(pendingFiles.indexOf(preview.file), 1)">×</button>
        </div>
        <label class="photo-add">
          <span>{{ uploading ? 'Uploading…' : '+ Add photos' }}</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden @change="onFiles" />
        </label>
      </div>
      <small class="muted">JPG, PNG or WebP, up to 5 MB each, 8 photos max.</small>
      <FormError :message="photoError" />
    </fieldset>

    <fieldset>
      <legend>Sizes and stock</legend>
      <div class="size-rows" :class="{ 'with-chart': showChart }">
        <div class="size-row size-head">
          <span>Size</span><span>In stock</span>
          <template v-if="showChart"><span>Chest cm</span><span>Waist cm</span><span>Hips cm</span></template>
          <span />
        </div>
        <div v-for="(s, index) in form.sizes" :key="index" class="size-row">
          <input v-model="s.label" required maxlength="20" aria-label="Size" />
          <input v-model.number="s.stock" type="number" min="0" required aria-label="In stock" />
          <template v-if="showChart">
            <input v-model.number="s.chestCm" type="number" min="30" max="250" aria-label="Chest cm" />
            <input v-model.number="s.waistCm" type="number" min="30" max="250" aria-label="Waist cm" />
            <input v-model.number="s.hipsCm" type="number" min="30" max="250" aria-label="Hips cm" />
          </template>
          <button type="button" class="btn btn-ghost btn-small" :disabled="form.sizes.length === 1" @click="form.sizes.splice(index, 1)">Remove</button>
        </div>
      </div>
      <div class="actions">
        <button type="button" class="btn btn-ghost btn-small" @click="addSize">+ Add size</button>
        <label class="inline">
          <input v-model="showChart" type="checkbox" /> Add body measurements (helps AI pick sizes)
        </label>
      </div>
    </fieldset>

    <label class="inline"><input v-model="form.isPublished" type="checkbox" /> Show this item in my store</label>

    <FormError :message="error" />
    <div class="actions">
      <button class="btn" :disabled="saving">{{ saving ? 'Saving…' : current ? 'Save changes' : 'Add item' }}</button>
      <NuxtLink to="/company/products" class="btn btn-ghost">Cancel</NuxtLink>
    </div>
  </form>
</template>
