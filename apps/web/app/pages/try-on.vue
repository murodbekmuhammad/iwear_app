<script setup lang="ts">
import type { Category, ProductCard, PublicProduct } from '~/types';
import { fitGarment, measureGarment, type BodyPoints, type GarmentShape } from '~/utils/garmentFit';

/**
 * Camera try-on: shows the shopper's webcam and lays the clothing photo (a transparent PNG)
 * over it. Body tracking (MediaPipe, in the browser) finds the shoulders and hips and keeps the
 * clothes on the body as the shopper moves. They can also drag and resize the clothes by hand.
 */
definePageMeta({ layout: false });
useHead({ title: 'Try on · Iwear' });

interface TryItem {
  id: string;
  name: string;
  price: number;
  category: Category;
  imageUrl: string | null;
  storeName: string;
  storeSlug: string;
  storeLogoUrl: string | null;
  colors: string[];
  sizes: { label: string; stock: number }[];
}

const route = useRoute();
const api = useApi();
const media = useMediaUrl();
const bag = useBag();

const productId = computed(() => (typeof route.query.product === 'string' ? route.query.product : ''));

// The chosen item first, then other clothes to compare with.
const { data: items, error } = await useAsyncData(`try-on-${productId.value}`, async () => {
  const [chosen, others] = await Promise.all([
    productId.value ? api<PublicProduct>(`/products/${productId.value}`).catch(() => null) : Promise.resolve(null),
    api<ProductCard[]>('/products', { query: { limit: 8 } }),
  ]);
  const list: TryItem[] = [];
  if (chosen) {
    list.push({
      id: chosen.id,
      name: chosen.name,
      price: chosen.price,
      category: chosen.category,
      imageUrl: chosen.images[0]?.url ?? null,
      storeName: chosen.company.name,
      storeSlug: chosen.company.slug,
      storeLogoUrl: chosen.company.logoUrl,
      colors: chosen.colors,
      sizes: chosen.sizes,
    });
  }
  for (const p of others) {
    if (p.id === chosen?.id || !p.images[0]) continue;
    list.push({
      id: p.id,
      name: p.name,
      price: p.price,
      category: p.category,
      imageUrl: p.images[0].url,
      storeName: p.company?.name ?? '',
      storeSlug: p.company?.slug ?? '',
      storeLogoUrl: null,
      colors: p.colors,
      sizes: p.sizes,
    });
  }
  return list.slice(0, 6);
});

const activeIndex = ref(0);
const active = computed(() => items.value?.[activeIndex.value] ?? null);
const kept = ref<Record<string, boolean>>({});
const sizes = ref<Record<string, string>>({});
watch(
  items,
  (list) => {
    if (list?.[0] && kept.value[list[0].id] === undefined) kept.value[list[0].id] = true;
  },
  { immediate: true },
);

// ---- Camera ----
const video = ref<HTMLVideoElement | null>(null);
const cameraState = ref<'starting' | 'on' | 'denied' | 'missing' | 'unsupported'>('starting');
let stream: MediaStream | null = null;

async function startCamera() {
  cameraState.value = 'starting';
  if (!navigator.mediaDevices?.getUserMedia) {
    cameraState.value = 'unsupported';
    return;
  }
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    if (video.value) {
      video.value.srcObject = stream;
      await video.value.play().catch(() => undefined);
    }
    cameraState.value = 'on';
    tracking.start();
  } catch (err) {
    const name = (err as DOMException)?.name;
    cameraState.value = name === 'NotFoundError' || name === 'OverconstrainedError' ? 'missing' : 'denied';
  }
}

function stopCamera() {
  stream?.getTracks().forEach((track) => track.stop());
  stream = null;
}

onMounted(startCamera);
onBeforeUnmount(stopCamera);

// ---- Placing the clothes: centre in % of the stage, size in % of its height, angle in degrees ----
const DEFAULT_PLACE = { x: 50, y: 58, size: 72, angle: 0 };
const place = reactive({ ...DEFAULT_PLACE });
const stage = ref<HTMLElement | null>(null);
const pointers = new Map<number, { x: number; y: number }>();
let pinchStart: { distance: number; size: number } | null = null;

// Auto-fit: follow the body. Moving the clothes by hand turns it off until "Follow me".
const autoFit = ref(true);
const garmentShape = ref<GarmentShape | null>(null);

function onBody(body: BodyPoints | null) {
  const box = stage.value?.getBoundingClientRect();
  if (!body || !autoFit.value || !active.value || !garmentShape.value || !box) return;
  const fit = fitGarment(active.value.category, body, garmentShape.value);
  if (!fit) return;
  // Smooth the movement so the clothes don't shake.
  const ease = 0.45;
  place.x += ((fit.x / box.width) * 100 - place.x) * ease;
  place.y += ((fit.y / box.height) * 100 - place.y) * ease;
  place.size += (clampSize((fit.height / box.height) * 100) - place.size) * ease;
  place.angle += (fit.angle - place.angle) * ease;
}

const tracking = useBodyTracking(video, stage, onBody);

const trackingLabel = computed(() => {
  if (!autoFit.value) return 'Placed by hand';
  switch (tracking.state.value) {
    case 'loading':
      return 'Loading body tracking…';
    case 'searching':
      return 'Looking for you…';
    case 'tracking':
      return 'Following you';
    case 'failed':
      return "Auto-fit isn't available here. Drag the clothes onto you";
    default:
      return '';
  }
});

const hint = computed(() =>
  autoFit.value && tracking.state.value !== 'failed'
    ? 'Step back so your shoulders and hips are in the frame'
    : 'Drag the clothes onto you, and resize them with the slider',
);

function onGarmentLoad(event: Event) {
  garmentShape.value = measureGarment(event.target as HTMLImageElement);
}

function manual() {
  autoFit.value = false;
}

function followMe() {
  autoFit.value = true;
}

function resetPlace() {
  Object.assign(place, DEFAULT_PLACE);
  autoFit.value = true;
}
watch(activeIndex, () => {
  garmentShape.value = null;
  place.angle = 0;
});

const clampSize = (value: number) => Math.min(140, Math.max(20, value));

function onPointerDown(event: PointerEvent) {
  manual();
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinchStart = { distance: Math.hypot(a!.x - b!.x, a!.y - b!.y), size: place.size };
  }
}

function onPointerMove(event: PointerEvent) {
  const last = pointers.get(event.pointerId);
  if (!last || !stage.value) return;
  const rect = stage.value.getBoundingClientRect();
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (pointers.size === 2 && pinchStart) {
    const [a, b] = [...pointers.values()];
    place.size = clampSize(pinchStart.size * (Math.hypot(a!.x - b!.x, a!.y - b!.y) / pinchStart.distance));
    return;
  }
  place.x = Math.min(100, Math.max(0, place.x + ((event.clientX - last.x) / rect.width) * 100));
  place.y = Math.min(100, Math.max(0, place.y + ((event.clientY - last.y) / rect.height) * 100));
}

function onPointerUp(event: PointerEvent) {
  pointers.delete(event.pointerId);
  if (pointers.size < 2) pinchStart = null;
}

function onWheel(event: WheelEvent) {
  manual();
  place.size = clampSize(place.size - event.deltaY * 0.05);
}

function onKey(event: KeyboardEvent) {
  const step = event.shiftKey ? 5 : 1;
  const moves: Record<string, () => void> = {
    ArrowLeft: () => (place.x = Math.max(0, place.x - step)),
    ArrowRight: () => (place.x = Math.min(100, place.x + step)),
    ArrowUp: () => (place.y = Math.max(0, place.y - step)),
    ArrowDown: () => (place.y = Math.min(100, place.y + step)),
    '+': () => (place.size = clampSize(place.size + step)),
    '=': () => (place.size = clampSize(place.size + step)),
    '-': () => (place.size = clampSize(place.size - step)),
  };
  const move = moves[event.key];
  if (move) {
    event.preventDefault();
    manual();
    move();
  }
}

const garmentStyle = computed(() => ({
  left: `${place.x}%`,
  top: `${place.y}%`,
  height: `${place.size}%`,
  transform: `translate(-50%, -50%) rotate(${place.angle}deg)`,
}));

// ---- Photo ----
const garment = ref<HTMLImageElement | null>(null);
const notice = ref<{ text: string; ok?: boolean } | null>(null);

async function takePhoto() {
  const el = video.value;
  const box = stage.value?.getBoundingClientRect();
  if (!el || !box || cameraState.value !== 'on') return;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(box.width * 2);
  canvas.height = Math.round(box.height * 2);
  const ctx = canvas.getContext('2d')!;

  // Same "cover" crop and mirror as the video on screen.
  const scale = Math.max(canvas.width / el.videoWidth, canvas.height / el.videoHeight);
  const w = el.videoWidth * scale;
  const h = el.videoHeight * scale;
  ctx.save();
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(el, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
  ctx.restore();

  const img = garment.value;
  if (img?.complete && img.naturalHeight) {
    const gh = (place.size / 100) * canvas.height;
    const gw = gh * (img.naturalWidth / img.naturalHeight);
    ctx.save();
    ctx.translate((place.x / 100) * canvas.width, (place.y / 100) * canvas.height);
    ctx.rotate((place.angle * Math.PI) / 180);
    ctx.drawImage(img, -gw / 2, -gh / 2, gw, gh);
    ctx.restore();
  }

  try {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('empty');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `iwear-try-on-${active.value?.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') ?? 'photo'}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    notice.value = { text: 'Photo saved to your downloads.', ok: true };
  } catch {
    notice.value = { text: "Couldn't save the photo in this browser. Try a screenshot instead." };
  }
}

// ---- Bag ----
const keptItems = computed(() => (items.value ?? []).filter((item) => kept.value[item.id]));
const bagLabel = computed(() => {
  const n = keptItems.value.length;
  return n === 0 ? 'Tick items to keep' : `Add ${n} ${n === 1 ? 'item' : 'items'} to bag`;
});

function addKeptToBag() {
  const missing = keptItems.value.find((item) => !sizes.value[item.id]);
  if (missing) {
    activeIndex.value = items.value!.indexOf(missing);
    notice.value = { text: `Choose your size for ${missing.name}.` };
    return;
  }
  for (const item of keptItems.value) {
    bag.add({
      productId: item.id,
      name: item.name,
      price: item.price,
      size: sizes.value[item.id]!,
      color: item.colors[0] ?? null,
      imageUrl: item.imageUrl,
      storeName: item.storeName,
      storeSlug: item.storeSlug,
      storeLogoUrl: item.storeLogoUrl,
    });
  }
  notice.value = { text: 'Added to your bag.', ok: true };
}

function exit() {
  if (window.history.length > 1) useRouter().back();
  else navigateTo(productId.value ? `/products/${productId.value}` : '/');
}
</script>

<template>
  <div class="tryon">
    <header class="tryon-header">
      <NuxtLink to="/" class="brand">Iwear</NuxtLink>
      <span class="live"><span class="live-dot" :class="{ on: cameraState === 'on' }" />Live try-on</span>
      <button type="button" class="tryon-exit" @click="exit">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        Exit
      </button>
    </header>

    <main class="tryon-main">
      <div class="tryon-view">
      <section ref="stage" class="tryon-stage" aria-label="Camera preview">
        <video ref="video" class="tryon-video" autoplay playsinline muted />

        <div v-if="cameraState !== 'on'" class="tryon-camera-msg">
          <AppIcon name="camera" :size="36" />
          <template v-if="cameraState === 'starting'">
            <p>Starting your camera… If your browser asks, allow camera access.</p>
          </template>
          <template v-else-if="cameraState === 'denied'">
            <p>Iwear needs your camera for the try-on. Allow camera access in your browser's address bar, then try again.</p>
            <button type="button" class="btn btn-light" @click="startCamera">Try again</button>
          </template>
          <template v-else-if="cameraState === 'missing'">
            <p>We couldn't find a camera on this device.</p>
            <button type="button" class="btn btn-light" @click="startCamera">Try again</button>
          </template>
          <template v-else>
            <p>This browser can't open the camera. Use a recent Chrome, Safari or Firefox over https.</p>
          </template>
        </div>

        <img
          v-if="active?.imageUrl"
          ref="garment"
          :key="active.id"
          :src="media(active.imageUrl)"
          crossorigin="anonymous"
          :alt="`${active.name}, drag to move`"
          class="tryon-garment"
          :style="garmentStyle"
          draggable="false"
          tabindex="0"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
          @wheel.prevent="onWheel"
          @keydown="onKey"
          @load="onGarmentLoad"
        />

        <div class="tryon-hint">{{ hint }}</div>
        <div v-if="cameraState === 'on' && trackingLabel" class="tryon-status" role="status">
          <span class="tryon-status-dot" :class="{ on: autoFit && tracking.state.value === 'tracking' }" />{{ trackingLabel }}
        </div>
      </section>

        <div v-if="active" class="tryon-bar">
          <span class="tryon-bar-info">
            <strong>{{ active.name }}</strong>
            <span>{{ active.storeName }} · {{ formatPrice(active.price) }}</span>
          </span>
          <label class="tryon-size">
            <span>Resize</span>
            <input v-model.number="place.size" type="range" min="20" max="140" step="1" aria-label="Make the clothes bigger or smaller" @input="manual" />
          </label>
          <span class="tryon-bar-actions">
            <button v-if="!autoFit && tracking.state.value !== 'failed'" type="button" class="btn-outline-light" @click="followMe">Follow me</button>
            <button type="button" class="btn-outline-light" @click="resetPlace">Reset</button>
            <button type="button" class="btn-outline-light" :disabled="cameraState !== 'on'" @click="takePhoto">Take photo</button>
            <NuxtLink :to="`/products/${active.id}`" class="btn btn-light">Details</NuxtLink>
          </span>
        </div>
      </div>

      <aside class="tryon-list" aria-label="Clothes to try">
        <div>
          <h1>Your try-on list</h1>
          <p>Click an item to see it on you. Tick the ones you want and pick your size.</p>
        </div>

        <p v-if="error" class="tryon-empty">We couldn't load the clothes. Check your connection and reload the page.</p>
        <p v-else-if="items && !items.length" class="tryon-empty">There are no clothes to try on yet.</p>

        <ul>
          <li v-for="(item, index) in items ?? []" :key="item.id" :class="{ active: index === activeIndex }">
            <div class="tryon-row">
              <button type="button" class="tryon-pick" :aria-pressed="index === activeIndex" @click="activeIndex = index">
                <span class="tryon-thumb"><img v-if="item.imageUrl" :src="media(item.imageUrl)" alt="" /></span>
                <span class="tryon-pick-text">
                  <strong>{{ item.name }}</strong>
                  <span>{{ item.storeName }} · {{ formatPrice(item.price) }}</span>
                </span>
              </button>
              <label class="tryon-keep">
                <input v-model="kept[item.id]" type="checkbox" :aria-label="`Keep ${item.name}`" />
              </label>
            </div>
            <div v-if="kept[item.id]" class="tryon-sizes" role="group" :aria-label="`Size for ${item.name}`">
              <button
                v-for="s in item.sizes"
                :key="s.label"
                type="button"
                class="tryon-chip"
                :class="{ active: sizes[item.id] === s.label }"
                :aria-pressed="sizes[item.id] === s.label"
                :disabled="s.stock === 0"
                @click="sizes[item.id] = s.label"
              >
                {{ s.label }}
              </button>
            </div>
          </li>
        </ul>

        <p v-if="notice" class="tryon-notice" :class="{ ok: notice.ok }" role="status">
          {{ notice.text }}
          <NuxtLink v-if="notice.ok && notice.text.includes('bag')" to="/bag">View bag</NuxtLink>
        </p>
        <button type="button" class="btn btn-light btn-large tryon-bag" :disabled="!keptItems.length" @click="addKeptToBag">{{ bagLabel }}</button>
      </aside>
    </main>
  </div>
</template>

<style scoped>
.tryon { min-height: 100vh; background: #141312; color: #fff; font-family: Inter, system-ui, sans-serif; }
.tryon-header { max-width: 1280px; margin: 0 auto; padding: 12px 24px; display: flex; align-items: center; justify-content: space-between; gap: 16px; border-bottom: 1px solid #2e2b29; }
.tryon-header .brand { font-family: 'DM Serif Display', serif; font-size: 28px; color: #fff; text-decoration: none; }
.live { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 600; }
.live-dot { width: 8px; height: 8px; border-radius: 4px; background: #6b6560; }
.live-dot.on { background: #f06a6a; }
.tryon-exit { height: 44px; padding: 0 16px; border-radius: 22px; border: 1px solid #4a4542; background: transparent; color: #fff; display: flex; align-items: center; gap: 8px; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
.tryon-main { max-width: 1280px; margin: 0 auto; padding: 24px; display: flex; flex-wrap: wrap; gap: 24px; align-items: stretch; }

.tryon-view { flex: 999 1 560px; min-width: 0; position: relative; align-self: flex-start; }
.tryon-stage { position: relative; height: 720px; max-height: calc(100vh - 120px); min-height: 480px; border-radius: 24px; background: #2a2725; overflow: hidden; touch-action: none; }
.tryon-video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); }
.tryon-camera-msg { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 32px; text-align: center; color: #d8d2cc; }
.tryon-camera-msg p { max-width: 380px; margin: 0; font-size: 15px; line-height: 1.5; }
.tryon-garment { position: absolute; width: auto; cursor: grab; user-select: none; touch-action: none; filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.25)); }
.tryon-garment:active { cursor: grabbing; }
.tryon-garment:focus-visible { outline: 2px dashed #fff; outline-offset: 4px; }
.tryon-status { position: absolute; top: 64px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: 14px; background: rgba(0, 0, 0, 0.6); font-size: 12px; font-weight: 600; white-space: nowrap; pointer-events: none; }
.tryon-status-dot { width: 8px; height: 8px; border-radius: 4px; background: #b8b2ac; }
.tryon-status-dot.on { background: #6ee7a8; }
.tryon-hint { position: absolute; top: 20px; left: 50%; transform: translateX(-50%); max-width: calc(100% - 40px); padding: 8px 16px; border-radius: 18px; background: rgba(0, 0, 0, 0.6); font-size: 13px; text-align: center; pointer-events: none; }
.tryon-bar { position: absolute; bottom: 20px; left: 20px; right: 20px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; border-radius: 16px; background: rgba(0, 0, 0, 0.65); }
.tryon-bar-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.tryon-bar-info strong { font-size: 16px; font-weight: 600; }
.tryon-bar-info span { font-size: 13px; color: #d8d2cc; }
.tryon-size { display: flex; flex-direction: row; align-items: center; gap: 8px; margin: 0; font-size: 13px; font-weight: 500; color: #d8d2cc; }
.tryon-size input { width: 120px; height: auto; padding: 0; border: 0; background: transparent; accent-color: #c24e78; }
.tryon-bar-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.btn-outline-light { height: 44px; padding: 0 16px; border-radius: 22px; border: 1px solid #fff; background: transparent; color: #fff; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
.btn-outline-light:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-light { background: #fff; border-color: #fff; color: #1c1a19; }
.btn-light:hover { background: #f4e7ec; color: #1c1a19; }

.tryon-list { flex: 1 1 320px; display: flex; flex-direction: column; gap: 16px; padding: 20px; border-radius: 24px; background: #1f1d1b; }
.tryon-list h1 { margin: 0; font-family: 'DM Serif Display', serif; font-weight: 400; font-size: 26px; }
.tryon-list > div > p { margin: 4px 0 0; font-size: 13px; color: #b8b2ac; }
.tryon-list ul { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 10px; flex: 1; }
.tryon-list li { padding: 8px 8px 8px 10px; border-radius: 14px; border: 1px solid #2e2b29; }
.tryon-list li.active { border-color: #fff; background: #2a2725; }
.tryon-row { display: flex; align-items: center; gap: 8px; }
.tryon-pick { flex: 1; min-width: 0; display: flex; align-items: center; gap: 12px; padding: 0; border: 0; background: transparent; color: #fff; font: inherit; text-align: left; cursor: pointer; }
.tryon-thumb { flex: none; width: 52px; height: 66px; border-radius: 10px; background: #f4e7ec; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.tryon-thumb img { width: 100%; height: 100%; object-fit: contain; }
.tryon-pick-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.tryon-pick-text strong { font-size: 14px; font-weight: 600; }
.tryon-pick-text span { font-size: 12px; color: #b8b2ac; }
.tryon-keep { flex: none; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; cursor: pointer; }
.tryon-keep input { width: 20px; height: 20px; accent-color: #c24e78; cursor: pointer; }
.tryon-sizes { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px 0 2px 64px; }
.tryon-chip { min-width: 40px; height: 32px; padding: 0 10px; border-radius: 16px; border: 1px solid #4a4542; background: transparent; color: #fff; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
.tryon-chip.active { background: #fff; border-color: #fff; color: #1c1a19; }
.tryon-chip:disabled { opacity: 0.35; text-decoration: line-through; cursor: not-allowed; }
.tryon-empty { margin: 0; color: #b8b2ac; font-size: 14px; }
.tryon-notice { margin: 0; padding: 10px 14px; border-radius: 12px; background: #2a2725; font-size: 14px; color: #f4e7ec; }
.tryon-notice.ok { background: #1f3a2c; color: #d7f5e3; }
.tryon-notice a { color: #fff; margin-left: 6px; }
.tryon-bag { width: 100%; justify-content: center; }
.tryon-bag:disabled { opacity: 0.6; cursor: not-allowed; }

@media (max-width: 720px) {
  .tryon-header { padding: 10px 16px; }
  .tryon-main { padding: 16px; gap: 16px; }
  .tryon-view { flex-basis: 100%; }
  .tryon-stage { height: auto; aspect-ratio: 3 / 4; min-height: 0; max-height: 75vh; width: 100%; }
  .tryon-bar { position: static; margin-top: 12px; background: #1f1d1b; }
  .tryon-size { flex: 1; }
  .tryon-size input { flex: 1; width: auto; }
  .tryon-status { position: absolute; top: 64px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: 14px; background: rgba(0, 0, 0, 0.6); font-size: 12px; font-weight: 600; white-space: nowrap; pointer-events: none; }
.tryon-status-dot { width: 8px; height: 8px; border-radius: 4px; background: #b8b2ac; }
.tryon-status-dot.on { background: #6ee7a8; }
.tryon-hint { top: 12px; font-size: 12px; padding: 6px 12px; }
}
</style>
