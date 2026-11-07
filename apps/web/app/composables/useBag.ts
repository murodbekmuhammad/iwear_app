/**
 * The shopping bag. Guests can fill it without an account; it lives in the browser
 * (localStorage) and can hold items from several stores. Checkout (next phase) turns it into one order.
 */
export interface BagItem {
  productId: string;
  name: string;
  price: number;
  size: string;
  color: string | null;
  imageUrl: string | null;
  storeName: string;
  storeSlug: string;
  storeLogoUrl: string | null;
  quantity: number;
}

const STORAGE_KEY = 'iwear_bag';
const MAX_QUANTITY = 10;

function lineKey(item: Pick<BagItem, 'productId' | 'size' | 'color'>) {
  return `${item.productId}|${item.size}|${item.color ?? ''}`;
}

export function useBag() {
  const items = useState<BagItem[]>('bag-items', () => []);
  const loaded = useState('bag-loaded', () => false);

  if (import.meta.client && !loaded.value) {
    loaded.value = true;
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
      if (Array.isArray(saved)) items.value = saved;
    } catch {
      items.value = [];
    }
  }

  function save() {
    if (!import.meta.client) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items.value));
    } catch {
      // Storage can be full or blocked (private mode); the bag still works for this visit.
    }
  }

  function add(item: Omit<BagItem, 'quantity'>, quantity = 1) {
    const existing = items.value.find((line) => lineKey(line) === lineKey(item));
    if (existing) existing.quantity = Math.min(MAX_QUANTITY, existing.quantity + quantity);
    else items.value.push({ ...item, quantity });
    save();
  }

  function setQuantity(item: BagItem, quantity: number) {
    item.quantity = Math.max(1, Math.min(MAX_QUANTITY, quantity));
    save();
  }

  function remove(item: BagItem) {
    items.value = items.value.filter((line) => lineKey(line) !== lineKey(item));
    save();
  }

  /** Lines grouped by store, in the order stores were first added. */
  const byStore = computed(() => {
    const groups = new Map<string, { storeName: string; storeSlug: string; storeLogoUrl: string | null; items: BagItem[] }>();
    for (const item of items.value) {
      if (!groups.has(item.storeSlug)) {
        groups.set(item.storeSlug, { storeName: item.storeName, storeSlug: item.storeSlug, storeLogoUrl: item.storeLogoUrl, items: [] });
      }
      groups.get(item.storeSlug)!.items.push(item);
    }
    return [...groups.values()];
  });

  return {
    items,
    byStore,
    count: computed(() => items.value.reduce((sum, item) => sum + item.quantity, 0)),
    subtotal: computed(() => items.value.reduce((sum, item) => sum + item.price * item.quantity, 0)),
    add,
    setQuantity,
    remove,
    maxQuantity: MAX_QUANTITY,
  };
}
