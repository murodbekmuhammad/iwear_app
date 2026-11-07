<script setup lang="ts">
// Line icons from the Iwear design. Decorative unless a label is given.
const props = withDefaults(defineProps<{ name: 'search' | 'bag' | 'camera' | 'truck' | 'lock' | 'check'; size?: number; label?: string }>(), { size: 18 });
const paths: Record<string, string> = {
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  bag: '<path d="M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  truck: '<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
};
</script>

<template>
  <svg
    :width="props.size"
    :height="props.size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    :aria-hidden="props.label ? undefined : 'true'"
    :role="props.label ? 'img' : undefined"
    :aria-label="props.label"
    v-html="paths[props.name]"
  />
</template>
