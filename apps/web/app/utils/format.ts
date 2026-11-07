import type { Category } from '~/types';

/** 450000 -> "450 000 so'm" */
export function formatPrice(price: number): string {
  return `${price.toLocaleString('en-US').replace(/,/g, ' ')} so'm`;
}

export const categoryLabels: Record<Category, string> = {
  DRESS: 'Dresses',
  TOP: 'Tops',
  BOTTOM: 'Skirts & trousers',
  OUTERWEAR: 'Coats & jackets',
  SUIT: 'Suits',
  ACCESSORY: 'Accessories',
};

export const categories = Object.keys(categoryLabels) as Category[];
