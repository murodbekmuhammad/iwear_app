<script setup lang="ts">
definePageMeta({ middleware: 'guest' });

const { register } = useAuth();
const route = useRoute();
const next = computed(() => (typeof route.query.next === 'string' ? route.query.next : undefined));
const form = reactive({ name: '', email: '', phone: '', password: '' });
const error = ref<string | null>(null);
const loading = ref(false);

async function submit() {
  error.value = null;
  loading.value = true;
  try {
    await register({ ...form, phone: form.phone || undefined }, next.value);
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
        <h1>Create your account</h1>
        <p>You only need an account to order. Browsing and trying on stay free for everyone.</p>
      </div>
      <label>Full name <input v-model="form.name" autocomplete="name" required minlength="2" /></label>
      <label>Email <input v-model="form.email" type="email" autocomplete="email" required /></label>
      <label>Phone <span class="hint">Optional, for delivery updates</span><input v-model="form.phone" type="tel" autocomplete="tel" /></label>
      <label>
        Password <span class="hint">At least 8 characters</span>
        <input v-model="form.password" type="password" autocomplete="new-password" required minlength="8" />
      </label>
      <FormError :message="error" />
      <button class="btn btn-large btn-block" :disabled="loading">{{ loading ? 'Creating…' : 'Create account' }}</button>
      <p class="small">
        Already have an account? <NuxtLink :to="{ path: '/login', query: next ? { next } : {} }">Sign in</NuxtLink>
      </p>
    </form>
    <BagSummaryAside v-if="next === '/checkout'" />
  </div>
</template>
