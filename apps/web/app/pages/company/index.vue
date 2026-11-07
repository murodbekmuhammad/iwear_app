<script setup lang="ts">
import type { Company } from '~/types';

definePageMeta({ middleware: 'auth', roles: ['COMPANY'] });

const api = useApi();
const { fetchMe } = useAuth();
const { data: company, refresh, error: loadError } = await useAsyncData('my-company', () => api<Company>('/company'));

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
</script>

<template>
  <section>
    <FormError v-if="loadError" :message="apiErrorMessage(loadError)" />
    <template v-if="company">
      <div class="row">
        <h1>{{ company.name }}</h1>
        <StatusBadge :status="company.status" />
      </div>

      <div v-if="company.status === 'PENDING'" class="notice">
        Your company is waiting for admin review. You'll be able to add products once it's approved.
      </div>
      <div v-else-if="company.status === 'REJECTED'" class="notice notice-error">
        <strong>Your application was not approved.</strong> Reason: {{ company.rejectionReason }}<br />
        Update your details below and save to send it for review again.
      </div>
      <div v-else-if="company.status === 'SUSPENDED'" class="notice notice-error">
        Your company is suspended. Please contact Iwear support.
      </div>
      <div v-else class="notice notice-ok">
        Your company is approved. Product management is coming in the next release.
      </div>

      <form class="card form" @submit.prevent="save">
        <h3>Company profile</h3>
        <label>Name <input v-model="form.name" required minlength="2" /></label>
        <label>About <textarea v-model="form.description" rows="3" /></label>
        <label>Phone <input v-model="form.phone" type="tel" /></label>
        <label>Website <input v-model="form.website" type="url" placeholder="https://" /></label>
        <label>Address <input v-model="form.address" /></label>
        <FormError :message="error" />
        <p v-if="saved" class="success">Saved.</p>
        <div class="actions">
          <button class="btn" :disabled="saving">{{ saving ? 'Saving…' : 'Save' }}</button>
          <button type="button" class="btn btn-ghost" @click="() => refresh()">Reload</button>
        </div>
      </form>
    </template>
  </section>
</template>
