<script setup lang="ts">
const { user, logout } = useAuth();
const { count: bagCount } = useBag();
const route = useRoute();
const search = ref(typeof route.query.q === 'string' ? route.query.q : '');
watch(() => route.query.q, (q) => (search.value = typeof q === 'string' ? q : ''));

function submitSearch() {
  const q = search.value.trim();
  if (q) navigateTo({ path: '/search', query: { q } });
}
</script>

<template>
  <div class="shell">
    <header class="topbar">
      <div class="topbar-inner">
        <NuxtLink to="/" class="brand">Iwear</NuxtLink>
        <nav class="nav" aria-label="Main">
          <NuxtLink to="/stores">Stores</NuxtLink>
          <NuxtLink to="/search">New in</NuxtLink>
          <template v-if="user?.role === 'ADMIN'">
            <NuxtLink to="/admin">Companies</NuxtLink>
            <NuxtLink to="/admin/couriers">Couriers</NuxtLink>
          </template>
          <template v-else-if="user?.role === 'COMPANY'">
            <NuxtLink to="/company/products">My clothes</NuxtLink>
            <NuxtLink to="/company">My store</NuxtLink>
          </template>
          <NuxtLink v-else-if="user?.role === 'COURIER'" to="/courier">Deliveries</NuxtLink>
        </nav>
        <form class="header-search" role="search" @submit.prevent="submitSearch">
          <AppIcon name="search" />
          <input v-model="search" type="search" aria-label="Search dresses or stores" placeholder="Search dresses or stores" />
        </form>
        <div class="header-actions">
          <template v-if="user">
            <NuxtLink v-if="user.role === 'CUSTOMER'" to="/account" class="header-link">{{ user.name.split(' ')[0] }}</NuxtLink>
            <button class="header-link" @click="logout">Log out</button>
          </template>
          <NuxtLink v-else to="/login" class="header-link">Sign in</NuxtLink>
          <NuxtLink to="/bag" class="bag-button">
            <AppIcon name="bag" />
            <ClientOnly fallback="Bag">Bag ({{ bagCount }})</ClientOnly>
          </NuxtLink>
        </div>
      </div>
    </header>
    <main class="content">
      <slot />
    </main>
    <footer class="footer">
      <div class="footer-inner">
        <span>© {{ new Date().getFullYear() }} Iwear</span>
        <nav aria-label="Footer">
          <NuxtLink to="/register-company">Sell on Iwear</NuxtLink>
          <NuxtLink to="/stores">All stores</NuxtLink>
        </nav>
      </div>
    </footer>
  </div>
</template>
