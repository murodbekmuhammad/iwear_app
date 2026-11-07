<script setup lang="ts">
const { user } = useAuth();
const company = computed(() => user.value?.company);
</script>

<template>
  <template v-if="company">
    <div v-if="company.status === 'PENDING'" class="notice">
      Your store is waiting for approval. You can add clothes now; shoppers will see them once an admin approves your store.
    </div>
    <div v-else-if="company.status === 'REJECTED'" class="notice notice-error">
      <strong>Your store was not approved.</strong> Reason: {{ company.rejectionReason }}.
      <NuxtLink to="/company">Update your store details</NuxtLink> to send it for review again.
    </div>
    <div v-else-if="company.status === 'SUSPENDED'" class="notice notice-error">
      Your store is suspended and hidden from shoppers. Please contact Iwear support.
    </div>
  </template>
</template>
