<script setup lang="ts">
definePageMeta({ middleware: 'guest' });

const { registerCompany } = useAuth();
const form = reactive({
  companyName: '',
  description: '',
  website: '',
  address: '',
  name: '',
  email: '',
  phone: '',
  password: '',
});
const error = ref<string | null>(null);
const loading = ref(false);

async function submit() {
  error.value = null;
  loading.value = true;
  try {
    // Leave out empty optional fields so the API doesn't validate blanks.
    const body = Object.fromEntries(Object.entries(form).filter(([, value]) => value !== ''));
    await registerCompany(body);
  } catch (e) {
    error.value = apiErrorMessage(e);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="auth-layout">
  <form class="auth-card" @submit.prevent="submit">
    <div class="form" style="gap: 8px">
      <h1>Sell on Iwear</h1>
      <p>Open your store on Iwear. Shoppers can try your clothes on with their camera, and our couriers deliver them. We review every new store before it goes live.</p>
    </div>

    <h3>Your store</h3>
    <label>Store name <input v-model="form.companyName" required minlength="2" /></label>
    <label>About (optional) <textarea v-model="form.description" rows="3" /></label>
    <label>Website (optional) <input v-model="form.website" type="url" placeholder="https://" /></label>
    <label>Address (optional) <input v-model="form.address" /></label>

    <h3>Your account</h3>
    <label>Your name <input v-model="form.name" autocomplete="name" required minlength="2" /></label>
    <label>Email <input v-model="form.email" type="email" autocomplete="email" required /></label>
    <label>Phone (optional) <input v-model="form.phone" type="tel" autocomplete="tel" /></label>
    <label>
      Password
      <input v-model="form.password" type="password" autocomplete="new-password" required minlength="8" />
    </label>

    <FormError :message="error" />
    <button class="btn btn-large btn-block" :disabled="loading">{{ loading ? 'Sending…' : 'Send for review' }}</button>
  </form>
  </div>
</template>
