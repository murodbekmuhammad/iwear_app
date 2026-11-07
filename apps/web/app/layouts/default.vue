<script setup lang="ts">
const { user, logout } = useAuth();

const roleLabel: Record<string, string> = {
  ADMIN: 'Admin',
  COMPANY: 'Company',
  CUSTOMER: 'Customer',
  COURIER: 'Courier',
};
</script>

<template>
  <div class="shell">
    <header class="topbar">
      <NuxtLink to="/" class="brand">Iwear</NuxtLink>
      <nav class="nav">
        <template v-if="user">
          <NuxtLink :to="homeForRole[user.role]">Dashboard</NuxtLink>
          <NuxtLink v-if="user.role === 'ADMIN'" to="/admin/couriers">Couriers</NuxtLink>
          <span class="who">{{ user.name }} · {{ roleLabel[user.role] }}</span>
          <button class="btn btn-ghost" @click="logout">Log out</button>
        </template>
        <template v-else>
          <NuxtLink to="/login">Log in</NuxtLink>
          <NuxtLink to="/register" class="btn">Sign up</NuxtLink>
        </template>
      </nav>
    </header>
    <main class="content">
      <slot />
    </main>
    <footer class="footer">© {{ new Date().getFullYear() }} Iwear</footer>
  </div>
</template>
