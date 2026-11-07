<script setup lang="ts">
definePageMeta({ middleware: 'guest' });

const { register } = useAuth();
const form = reactive({ name: '', email: '', phone: '', password: '' });
const error = ref<string | null>(null);
const loading = ref(false);

async function submit() {
  error.value = null;
  loading.value = true;
  try {
    await register({ ...form, phone: form.phone || undefined });
  } catch (e) {
    error.value = apiErrorMessage(e);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <form class="card form narrow" @submit.prevent="submit">
    <h1>Create your account</h1>
    <label>Full name <input v-model="form.name" autocomplete="name" required minlength="2" /></label>
    <label>Email <input v-model="form.email" type="email" autocomplete="email" required /></label>
    <label>Phone (optional) <input v-model="form.phone" type="tel" autocomplete="tel" /></label>
    <label>
      Password
      <input v-model="form.password" type="password" autocomplete="new-password" required minlength="8" />
      <small class="muted">At least 8 characters.</small>
    </label>
    <FormError :message="error" />
    <button class="btn" :disabled="loading">{{ loading ? 'Creating…' : 'Sign up' }}</button>
    <p class="muted">Selling clothes? <NuxtLink to="/register-company">Register your company</NuxtLink>.</p>
  </form>
</template>
