<script setup lang="ts">
definePageMeta({ middleware: 'auth', roles: ['COURIER'] });

const { user } = useAuth();
</script>

<template>
  <section v-if="user">
    <h1>Deliveries</h1>
    <div class="card">
      <p>Welcome, {{ user.name }}.</p>
      <p class="muted">
        Your assigned orders, the delivery map and status updates will appear here once delivery is
        built.
      </p>
    </div>
  </section>
</template>
