<script setup lang="ts">
const { user, logout } = useAuth();
</script>

<template>
  <div class="shell">
    <header class="topbar">
      <NuxtLink to="/" class="brand">Iwear</NuxtLink>
      <nav class="nav">
        <NuxtLink to="/">Stores</NuxtLink>
        <template v-if="user?.role === 'ADMIN'">
          <NuxtLink to="/admin">Companies</NuxtLink>
          <NuxtLink to="/admin/couriers">Couriers</NuxtLink>
        </template>
        <template v-else-if="user?.role === 'COMPANY'">
          <NuxtLink to="/company/products">My clothes</NuxtLink>
          <NuxtLink to="/company">My store</NuxtLink>
        </template>
        <NuxtLink v-else-if="user?.role === 'COURIER'" to="/courier">Deliveries</NuxtLink>
        <NuxtLink v-else-if="user" to="/account">My account</NuxtLink>

        <button v-if="user" class="btn btn-ghost btn-small" @click="logout">Log out</button>
        <NuxtLink v-else to="/login" class="btn btn-small">Log in</NuxtLink>
      </nav>
    </header>
    <main class="content">
      <slot />
    </main>
    <footer class="footer">
      © {{ new Date().getFullYear() }} Iwear ·
      <NuxtLink to="/register-company">Sell your clothes on Iwear</NuxtLink>
    </footer>
  </div>
</template>
