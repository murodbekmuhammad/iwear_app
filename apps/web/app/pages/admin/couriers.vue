<script setup lang="ts">
import type { Page, User } from '~/types';

definePageMeta({ middleware: 'auth', roles: ['ADMIN'] });

const api = useApi();
const { data, refresh } = await useAsyncData('admin-couriers', () =>
  api<Page<User>>('/admin/users', { query: { role: 'COURIER', perPage: 100 } }),
);

const form = reactive({ name: '', email: '', phone: '', password: '' });
const error = ref<string | null>(null);
const creating = ref(false);

async function create() {
  error.value = null;
  creating.value = true;
  try {
    await api('/admin/couriers', { method: 'POST', body: { ...form, phone: form.phone || undefined } });
    Object.assign(form, { name: '', email: '', phone: '', password: '' });
    await refresh();
  } catch (e) {
    error.value = apiErrorMessage(e);
  } finally {
    creating.value = false;
  }
}

async function toggle(courier: User) {
  error.value = null;
  try {
    await api(`/admin/users/${courier.id}/active`, { method: 'PATCH', body: { isActive: !courier.isActive } });
    await refresh();
  } catch (e) {
    error.value = apiErrorMessage(e);
  }
}
</script>

<template>
  <section>
    <h1>Couriers</h1>
    <div class="grid two">
      <form class="card form" @submit.prevent="create">
        <h3>Add a courier</h3>
        <label>Name <input v-model="form.name" required minlength="2" /></label>
        <label>Email <input v-model="form.email" type="email" required /></label>
        <label>Phone <input v-model="form.phone" type="tel" /></label>
        <label>Temporary password <input v-model="form.password" type="text" required minlength="8" /></label>
        <FormError :message="error" />
        <button class="btn" :disabled="creating">{{ creating ? 'Adding…' : 'Add courier' }}</button>
      </form>

      <div class="card">
        <h3>All couriers ({{ data?.total ?? 0 }})</h3>
        <p v-if="!data?.items.length" class="muted">No couriers yet.</p>
        <ul class="list">
          <li v-for="courier in data?.items" :key="courier.id">
            <div>
              <strong>{{ courier.name }}</strong>
              <div class="muted small">{{ courier.email }} · {{ courier.phone || 'no phone' }}</div>
            </div>
            <button class="btn btn-ghost" @click="toggle(courier)">
              {{ courier.isActive ? 'Deactivate' : 'Activate' }}
            </button>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>
