<script setup lang="ts">
import type { CompanyStatus } from '~/types';

defineProps<{ status: CompanyStatus }>();
</script>

<template>
  <span class="badge" :class="`badge-${status.toLowerCase()}`">{{ status.toLowerCase() }}</span>
</template>
