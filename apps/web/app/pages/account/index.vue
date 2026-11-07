<script setup lang="ts">
definePageMeta({ middleware: 'auth', roles: ['CUSTOMER'] });

const { user } = useAuth();
</script>

<template>
  <section v-if="user">
    <h1>Hi, {{ user.name }}</h1>
    <div class="grid two">
      <div class="card">
        <h3>Your profile</h3>
        <dl class="details">
          <dt>Email</dt><dd>{{ user.email }}</dd>
          <dt>Phone</dt><dd>{{ user.phone || '—' }}</dd>
          <dt>Member since</dt><dd>{{ new Date(user.createdAt).toLocaleDateString() }}</dd>
        </dl>
      </div>
      <div class="card">
        <h3>Shop and try on</h3>
        <p class="muted">Browsing, virtual try-on and orders are coming in the next releases.</p>
      </div>
    </div>
  </section>
</template>
