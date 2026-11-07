import { Category, CompanyStatus, PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { copyFile, mkdir } from 'fs/promises';
import { join, resolve } from 'path';

/**
 * Demo stores, clothes and photos for testing. Runs when SEED_DEMO=true.
 *
 * Safe to run again: accounts and stores are matched by email/slug, and a store's
 * products are only created when it has none. The photos are copied into UPLOAD_DIR
 * on every run, because hosts like Render wipe that folder on each deploy.
 * The clothing photos are transparent PNGs, so the try-on can lay them over the camera.
 */

type SizeRow = { label: string; stock: number; chestCm?: number; waistCm?: number; hipsCm?: number };
type DemoProduct = {
  name: string;
  category: Category;
  price: number;
  colors: string[];
  sizes: SizeRow[];
  images: string[];
  description?: string;
};
type DemoStore = {
  owner: { name: string; email: string };
  name: string;
  slug: string;
  address: string;
  description: string;
  logo: string;
  products: DemoProduct[];
};

const sizes = (...rows: [string, number][]): SizeRow[] => rows.map(([label, stock]) => ({ label, stock }));

// Body measurements per size, for the AI size suggestion later.
const dressChart: SizeRow[] = [
  { label: 'XS', stock: 2, chestCm: 80, waistCm: 62, hipsCm: 88 },
  { label: 'S', stock: 4, chestCm: 86, waistCm: 68, hipsCm: 94 },
  { label: 'M', stock: 6, chestCm: 92, waistCm: 74, hipsCm: 100 },
  { label: 'L', stock: 3, chestCm: 98, waistCm: 80, hipsCm: 106 },
  { label: 'XL', stock: 2, chestCm: 104, waistCm: 86, hipsCm: 112 },
];
const topChart: SizeRow[] = [
  { label: 'S', stock: 5, chestCm: 88, waistCm: 72 },
  { label: 'M', stock: 8, chestCm: 94, waistCm: 78 },
  { label: 'L', stock: 6, chestCm: 100, waistCm: 84 },
  { label: 'XL', stock: 3, chestCm: 106, waistCm: 90 },
];
const bottomChart: SizeRow[] = [
  { label: 'S', stock: 3, waistCm: 68, hipsCm: 94 },
  { label: 'M', stock: 5, waistCm: 74, hipsCm: 100 },
  { label: 'L', stock: 2, waistCm: 80, hipsCm: 106 },
];

const stores: DemoStore[] = [
  {
    owner: { name: 'Dilnoza Rahimova', email: 'dilnoza@silkroad.uz' },
    name: 'Silk Road Fashion',
    slug: 'silk-road-fashion',
    address: 'Tashkent, Amir Temur 15',
    description: 'Hand-made ikat dresses and modern Uzbek silk.',
    logo: 'logo-silk.png',
    products: [
      {
        name: 'Ikat silk summer dress',
        category: Category.DRESS,
        price: 450000,
        colors: ['Blue', 'Gold'],
        sizes: dressChart,
        images: ['silk-1.png'],
        description: 'Light hand-woven silk with a classic ikat pattern. Fully lined.',
      },
      {
        name: 'Burgundy evening dress',
        category: Category.DRESS,
        price: 620000,
        colors: ['Burgundy', 'Gold'],
        sizes: dressChart,
        images: ['silk-2.png'],
        description: 'Floor-length silk with a soft golden print, made for weddings and evenings out.',
      },
      {
        name: 'Chapan coat',
        category: Category.OUTERWEAR,
        price: 890000,
        colors: ['Green', 'Gold'],
        sizes: sizes(['M', 2], ['L', 3]),
        images: ['silk-3.png'],
        description: 'A modern take on the traditional quilted chapan.',
      },
      {
        name: 'Silk scarf',
        category: Category.ACCESSORY,
        price: 120000,
        colors: ['Purple'],
        sizes: sizes(['One size', 20]),
        images: ['silk-4.png'],
      },
      {
        name: 'Atlas midi skirt',
        category: Category.BOTTOM,
        price: 280000,
        colors: ['Orange', 'Blue'],
        sizes: bottomChart,
        images: ['silk-5.png'],
      },
    ],
  },
  {
    owner: { name: 'Jasur Aliyev', email: 'jasur@atlasstyle.uz' },
    name: 'Atlas Style',
    slug: 'atlas-style',
    address: 'Samarkand, Registan 4',
    description: 'Everyday basics in natural fabrics.',
    logo: 'logo-atlas.png',
    products: [
      {
        name: 'Linen shirt',
        category: Category.TOP,
        price: 190000,
        colors: ['White'],
        sizes: topChart,
        images: ['atlas-1.png'],
        description: 'Breathable linen with a relaxed fit.',
      },
      {
        name: 'Wide-leg trousers',
        category: Category.BOTTOM,
        price: 260000,
        colors: ['Black'],
        sizes: bottomChart,
        images: ['atlas-2.png'],
      },
      {
        name: 'Little black dress',
        category: Category.DRESS,
        price: 340000,
        colors: ['Black'],
        sizes: dressChart,
        images: ['atlas-3.png'],
        description: 'A simple, fitted dress that works for the office and for dinner.',
      },
      {
        name: 'Wool overcoat',
        category: Category.OUTERWEAR,
        price: 760000,
        colors: ['Camel'],
        sizes: topChart,
        images: ['atlas-4.png'],
      },
    ],
  },
  {
    owner: { name: 'Madina Yusupova', email: 'madina@bukharabloom.uz' },
    name: 'Bukhara Bloom',
    slug: 'bukhara-bloom',
    address: 'Bukhara, Lyabi-Hauz 2',
    description: 'Soft colours for spring and summer.',
    logo: 'logo-bloom.png',
    products: [
      {
        name: 'Rose garden dress',
        category: Category.DRESS,
        price: 380000,
        colors: ['Pink'],
        sizes: dressChart,
        images: ['bloom-1.png'],
        description: 'Flowing cotton with a light floral print.',
      },
      {
        name: 'Lilac maxi dress',
        category: Category.DRESS,
        price: 420000,
        colors: ['Lilac'],
        sizes: dressChart,
        images: ['bloom-4.png'],
      },
      {
        name: 'Mint blouse',
        category: Category.TOP,
        price: 160000,
        colors: ['Mint'],
        sizes: topChart,
        images: ['bloom-2.png'],
      },
      {
        name: 'Sunshine skirt',
        category: Category.BOTTOM,
        price: 210000,
        colors: ['Yellow'],
        sizes: bottomChart,
        images: ['bloom-3.png'],
      },
    ],
  },
];

const demoCustomer = { name: 'Aziza Karimova', email: 'aziza@example.com' };

export async function seedDemo(prisma: PrismaClient) {
  const password = process.env.DEMO_PASSWORD || 'secret123';
  const passwordHash = await bcrypt.hash(password, 10);

  // Copy the photos into the uploads folder the API serves at /uploads.
  const uploadDir = resolve(process.env.UPLOAD_DIR || 'uploads');
  const demoDir = join(uploadDir, 'demo');
  await mkdir(demoDir, { recursive: true });
  const files = new Set(stores.flatMap((store) => [store.logo, ...store.products.flatMap((product) => product.images)]));
  for (const file of files) {
    await copyFile(join(__dirname, 'images', file), join(demoDir, file));
  }
  const url = (file: string) => `/uploads/demo/${file}`;

  for (const store of stores) {
    const owner = await prisma.user.upsert({
      where: { email: store.owner.email },
      update: {},
      create: { ...store.owner, passwordHash, role: Role.COMPANY },
    });

    const company = await prisma.company.upsert({
      where: { slug: store.slug },
      update: { logoUrl: url(store.logo) },
      create: {
        name: store.name,
        slug: store.slug,
        address: store.address,
        description: store.description,
        logoUrl: url(store.logo),
        status: CompanyStatus.APPROVED,
        reviewedAt: new Date(),
        ownerId: owner.id,
      },
    });

    const existing = await prisma.product.count({ where: { companyId: company.id } });
    if (existing > 0) continue;

    // Create oldest first so the first product shows first under "Newest".
    for (const [index, product] of [...store.products].reverse().entries()) {
      await prisma.product.create({
        data: {
          name: product.name,
          description: product.description,
          category: product.category,
          price: product.price,
          colors: product.colors,
          createdAt: new Date(Date.now() - (store.products.length - index) * 60_000),
          companyId: company.id,
          sizes: { create: product.sizes.map((size, sortOrder) => ({ ...size, sortOrder })) },
          images: { create: product.images.map((file, sortOrder) => ({ url: url(file), sortOrder })) },
        },
      });
    }
  }

  await prisma.user.upsert({
    where: { email: demoCustomer.email },
    update: {},
    create: { ...demoCustomer, passwordHash, role: Role.CUSTOMER },
  });

  console.log(`Demo data ready: ${stores.length} stores and ${files.size - stores.length} photos.`);
}
