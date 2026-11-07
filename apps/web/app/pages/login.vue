<script setup lang="ts">
definePageMeta({ middleware: 'guest' });

const { login } = useAuth();
const route = useRoute();
const next = computed(() => (typeof route.query.next === 'string' ? route.query.next : undefined));
const ordering = computed(() => next.value === '/checkout');
const form = reactive({ email: '', password: '' });
const error = ref<string | null>(null);
const loading = ref(false);

async function submit() {
  error.value = null;
  loading.value = true;
  try {
    await login(form.email, form.password, next.value);
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
      <span class="auth-icon"><AppIcon name="lock" :size="26" /></span>
      <div class="form" style="gap: 8px">
        <h1>{{ ordering ? 'Sign in to place your order' : 'Welcome back' }}</h1>
        <p>
          {{ ordering
            ? 'You browsed as a guest. To pay and get delivery updates, we need an account. Your bag is saved.'
            : 'Sign in to order, track deliveries or manage your store.' }}
        </p>
      </div>
      <label>Email <input v-model="form.email" type="email" autocomplete="email" required /></label>
      <label>Password <input v-model="form.password" type="password" autocomplete="current-password" required /></label>
      <FormError :message="error" />
      <button class="btn btn-large btn-block" :disabled="loading">{{ loading ? 'Signing in…' : 'Sign in' }}</button>
      <div class="divider">or</div>
      <NuxtLink :to="{ path: '/register', query: next ? { next } : {} }" class="btn btn-ghost btn-block">Create an account</NuxtLink>
      <p class="small">Selling clothes? <NuxtLink to="/register-company">Register your store</NuxtLink>.</p>
    </form>
    <BagSummaryAside v-if="ordering" />
  </div>
</template>
