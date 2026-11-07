<script setup lang="ts">
import type { Company } from '~/types';

definePageMeta({ middleware: 'auth', roles: ['COMPANY'] });

const api = useApi();
const media = useMediaUrl();
const { fetchMe } = useAuth();
const { data: company, error: loadError } = await useAsyncData('my-company', () => api<Company>('/company'));

const form = reactive({ name: '', description: '', phone: '', website: '', address: '' });
watchEffect(() => {
  if (!company.value) return;
  form.name = company.value.name;
  form.description = company.value.description ?? '';
  form.phone = company.value.phone ?? '';
  form.website = company.value.website ?? '';
  form.address = company.value.address ?? '';
});

const saving = ref(false);
const error = ref<string | null>(null);
const saved = ref(false);

async function save() {
  saving.value = true;
  error.value = null;
  saved.value = false;
  try {
    const body = Object.fromEntries(Object.entries(form).filter(([, value]) => value !== ''));
    company.value = await api<Company>('/company', { method: 'PATCH', body });
    saved.value = true;
    await fetchMe();
  } catch (e) {
    error.value = apiErrorMessage(e);
  } finally {
    saving.value = false;
  }
}

const logoError = ref<string | null>(null);
async function uploadLogo(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  logoError.value = null;
  const body = new FormData();
  body.append('logo', file);
  try {
    company.value = await api<Company>('/company/logo', { method: 'POST', body });
  } catch (e) {
    logoError.value = apiErrorMessage(e);
  }
}
</script>

<template>
  <section>
    <FormError v-if="loadError" :message="apiErrorMessage(loadError)" />
    <template v-if="company">
      <div class="row">
        <h1>My store</h1>
        <StatusBadge :status="company.status" />
      </div>
      <CompanyStatusNotice />

      <div class="card logo-row">
        <img v-if="company.logoUrl" :src="media(company.logoUrl)" alt="Store logo" class="logo logo-large" />
        <div v-else class="logo logo-large logo-letter">{{ company.name.charAt(0) }}</div>
        <div>
          <strong>Store logo</strong>
          <p class="muted small">Shown on the store list. A square image works best.</p>
          <label class="btn btn-ghost btn-small">
            {{ company.logoUrl ? 'Change logo' : 'Upload logo' }}
            <input type="file" accept="image/jpeg,image/png,image/webp" hidden @change="uploadLogo" />
          </label>
          <FormError :message="logoError" />
        </div>
      </div>

      <form class="card form" @submit.prevent="save">
        <h3>Store details</h3>
        <label>Store name <input v-model="form.name" required minlength="2" /></label>
        <label>About your store <textarea v-model="form.description" rows="3" /></label>
        <label>Address <input v-model="form.address" /></label>
        <div class="form-row">
          <label>Phone <input v-model="form.phone" type="tel" /></label>
          <label>Website <input v-model="form.website" type="url" placeholder="https://" /></label>
        </div>
        <FormError :message="error" />
        <p v-if="saved" class="success">Saved.</p>
        <div class="actions">
          <button class="btn" :disabled="saving">{{ saving ? 'Saving…' : 'Save' }}</button>
        </div>
      </form>
    </template>
  </section>
</template>
