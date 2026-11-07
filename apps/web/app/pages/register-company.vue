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
  <form class="card form narrow" @submit.prevent="submit">
    <h1>Sell on Iwear</h1>
    <p class="muted">Tell us about your company. An admin reviews every new company before it can sell.</p>

    <h3>Company</h3>
    <label>Company name <input v-model="form.companyName" required minlength="2" /></label>
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
    <button class="btn" :disabled="loading">{{ loading ? 'Sending…' : 'Send for review' }}</button>
  </form>
</template>
