<script setup lang="ts">
definePageMeta({ middleware: 'auth', roles: ['CUSTOMER'] });

const { user } = useAuth();
</script>

<template>
  <section v-if="user">
    <h1>Hi, {{ user.name }}</h1>
    <div class="grid two">
      <div class="card">
        <h3>Your details</h3>
        <dl class="details">
          <dt>Email</dt><dd>{{ user.email }}</dd>
          <dt>Phone</dt><dd>{{ user.phone || '—' }}</dd>
        </dl>
      </div>
      <div class="card">
        <h3>Your orders</h3>
        <p class="muted">You haven't ordered anything yet.</p>
        <NuxtLink to="/" class="btn">Browse stores</NuxtLink>
      </div>
    </div>
  </section>
</template>
