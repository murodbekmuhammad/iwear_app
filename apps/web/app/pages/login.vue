<script setup lang="ts">
definePageMeta({ middleware: 'guest' });

const { login } = useAuth();
const route = useRoute();
const form = reactive({ email: '', password: '' });
const error = ref<string | null>(null);
const loading = ref(false);

async function submit() {
  error.value = null;
  loading.value = true;
  try {
    const next = typeof route.query.next === 'string' ? route.query.next : undefined;
    await login(form.email, form.password, next);
  } catch (e) {
    error.value = apiErrorMessage(e);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <form class="card form narrow" @submit.prevent="submit">
    <h1>Log in</h1>
    <label>Email <input v-model="form.email" type="email" autocomplete="email" required /></label>
    <label>Password <input v-model="form.password" type="password" autocomplete="current-password" required /></label>
    <FormError :message="error" />
    <button class="btn" :disabled="loading">{{ loading ? 'Logging in…' : 'Log in' }}</button>
    <p class="muted">
      New here? <NuxtLink to="/register">Create an account</NuxtLink> or
      <NuxtLink to="/register-company">register your company</NuxtLink>.
    </p>
  </form>
</template>
