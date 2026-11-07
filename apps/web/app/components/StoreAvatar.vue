<script setup lang="ts">
const props = defineProps<{ name: string; logoUrl?: string | null; size?: 'sm' | 'md' | 'lg' }>();
const media = useMediaUrl();
const initials = computed(() =>
  props.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join(''),
);
const sizeClass = computed(() => (props.size === 'sm' ? 'avatar-sm' : props.size === 'lg' ? 'avatar-lg' : ''));
</script>

<template>
  <img v-if="logoUrl" :src="media(logoUrl)" :alt="`${name} logo`" class="avatar" :class="sizeClass" />
  <span v-else class="avatar" :class="sizeClass" aria-hidden="true">{{ initials }}</span>
</template>
