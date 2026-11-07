import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { configureApp } from '../src/setup';

// Smallest valid PNG (1x1 pixel).
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

const dress = {
  name: 'Ikat silk dress',
  description: 'Hand-woven silk.',
  category: 'DRESS',
  price: 450000,
  colors: ['Blue', 'Gold'],
  sizes: [
    { label: 'S', stock: 3, chestCm: 86, waistCm: 68, hipsCm: 94 },
    { label: 'M', stock: 0, chestCm: 92, waistCm: 74, hipsCm: 100 },
  ],
};

describe('Stores and products (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let adminToken: string;

  const http = () => request(app.getHttpServer());
  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

  async function companyOwner(email: string, companyName: string, approve = true) {
    const res = await http()
      .post('/api/auth/register/company')
      .send({ name: 'Owner', email, password: 'secret123', companyName })
      .expect(201);
    if (approve) {
      await http().patch(`/api/admin/companies/${res.body.user.company.id}/approve`).set(bearer(adminToken)).expect(200);
    }
    return { token: res.body.accessToken as string, slug: res.body.user.company.slug as string, id: res.body.user.company.id as string };
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.user.deleteMany();
    await prisma.user.create({
      data: { email: 'admin@iwear.test', name: 'Admin', role: Role.ADMIN, passwordHash: await bcrypt.hash('AdminPass123', 4) },
    });
    const res = await http().post('/api/auth/login').send({ email: 'admin@iwear.test', password: 'AdminPass123' });
    adminToken = res.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('lets a company add a product with photos, and visitors see it without logging in', async () => {
    const owner = await companyOwner('owner@silk.test', 'Silk Road');

    const created = await http().post('/api/company/products').set(bearer(owner.token)).send(dress).expect(201);
    expect(created.body.sizes.map((s: { label: string }) => s.label)).toEqual(['S', 'M']);

    const withPhoto = await http()
      .post(`/api/company/products/${created.body.id}/images`)
      .set(bearer(owner.token))
      .attach('images', PNG, 'dress.png')
      .expect(201);
    const photoUrl: string = withPhoto.body.images[0].url;
    expect(photoUrl).toMatch(/^\/uploads\/.+\.png$/);
    await http().get(photoUrl).expect(200).expect('Content-Type', 'image/png');

    const stores = await http().get('/api/stores').expect(200);
    expect(stores.body).toHaveLength(1);
    expect(stores.body[0]).toMatchObject({ name: 'Silk Road', productCount: 1, previewImages: [photoUrl] });

    const store = await http().get(`/api/stores/${owner.slug}`).expect(200);
    expect(store.body.categories).toEqual(['DRESS']);
    expect(store.body.products[0]).toMatchObject({ name: 'Ikat silk dress', price: 450000 });

    const product = await http().get(`/api/products/${created.body.id}`).expect(200);
    expect(product.body.company.slug).toBe(owner.slug);
    expect(product.body.sizes[1]).toMatchObject({ label: 'M', stock: 0, chestCm: 92 });
  });

  it('hides unapproved stores and unpublished products', async () => {
    const pending = await companyOwner('pending@test.uz', 'Pending Shop', false);
    const pendingProduct = await http().post('/api/company/products').set(bearer(pending.token)).send(dress).expect(201);

    const approved = await companyOwner('approved@test.uz', 'Open Shop');
    const hidden = await http()
      .post('/api/company/products')
      .set(bearer(approved.token))
      .send({ ...dress, isPublished: false })
      .expect(201);

    const stores = await http().get('/api/stores').expect(200);
    expect(stores.body.map((s: { name: string }) => s.name)).toEqual(['Open Shop']);
    expect(stores.body[0].productCount).toBe(0);

    await http().get(`/api/stores/${pending.slug}`).expect(404);
    await http().get(`/api/products/${pendingProduct.body.id}`).expect(404);
    await http().get(`/api/products/${hidden.body.id}`).expect(404);
  });

  it('filters a store by category and searches stores by name', async () => {
    const owner = await companyOwner('owner@silk.test', 'Silk Road');
    await http().post('/api/company/products').set(bearer(owner.token)).send(dress).expect(201);
    await http()
      .post('/api/company/products')
      .set(bearer(owner.token))
      .send({ ...dress, name: 'Chapan coat', category: 'OUTERWEAR' })
      .expect(201);
    await companyOwner('other@test.uz', 'Atlas Style');

    const coats = await http().get(`/api/stores/${owner.slug}?category=OUTERWEAR`).expect(200);
    expect(coats.body.products.map((p: { name: string }) => p.name)).toEqual(['Chapan coat']);
    expect(coats.body.categories).toEqual(['DRESS', 'OUTERWEAR']);

    const found = await http().get('/api/stores?search=atlas').expect(200);
    expect(found.body.map((s: { name: string }) => s.name)).toEqual(['Atlas Style']);
  });

  it('only lets a company change its own products', async () => {
    const a = await companyOwner('a@test.uz', 'Shop A');
    const b = await companyOwner('b@test.uz', 'Shop B');
    const product = await http().post('/api/company/products').set(bearer(a.token)).send(dress).expect(201);

    await http().patch(`/api/company/products/${product.body.id}`).set(bearer(b.token)).send({ price: 1 }).expect(404);
    await http().delete(`/api/company/products/${product.body.id}`).set(bearer(b.token)).expect(404);

    const updated = await http()
      .patch(`/api/company/products/${product.body.id}`)
      .set(bearer(a.token))
      .send({ price: 399000, sizes: [{ label: 'L', stock: 2 }] })
      .expect(200);
    expect(updated.body).toMatchObject({ price: 399000, sizes: [{ label: 'L', stock: 2 }] });

    await http().delete(`/api/company/products/${product.body.id}`).set(bearer(a.token)).expect(204);
    await http().get(`/api/company/products/${product.body.id}`).set(bearer(a.token)).expect(404);
  });

  it('rejects bad products and non-image uploads', async () => {
    const owner = await companyOwner('owner@silk.test', 'Silk Road');
    await http().post('/api/company/products').set(bearer(owner.token)).send({ ...dress, sizes: [] }).expect(400);
    await http()
      .post('/api/company/products')
      .set(bearer(owner.token))
      .send({ ...dress, sizes: [{ label: 'M', stock: 1 }, { label: 'm', stock: 1 }] })
      .expect(400);
    await http().post('/api/company/products').set(bearer(owner.token)).send({ ...dress, price: -5 }).expect(400);

    const product = await http().post('/api/company/products').set(bearer(owner.token)).send(dress).expect(201);
    await http()
      .post(`/api/company/products/${product.body.id}/images`)
      .set(bearer(owner.token))
      .attach('images', Buffer.from('<script>alert(1)</script>'), 'evil.png')
      .expect(400);
  });

  it('blocks customers from managing products', async () => {
    const customer = await http()
      .post('/api/auth/register')
      .send({ name: 'Aziza', email: 'aziza@example.com', password: 'secret123' });
    await http().post('/api/company/products').set(bearer(customer.body.accessToken)).send(dress).expect(403);
  });

  it('lets a company upload its logo', async () => {
    const owner = await companyOwner('owner@silk.test', 'Silk Road');
    const res = await http().post('/api/company/logo').set(bearer(owner.token)).attach('logo', PNG, 'logo.png').expect(201);
    expect(res.body.logoUrl).toMatch(/^\/uploads\//);
    const stores = await http().get('/api/stores').expect(200);
    expect(stores.body[0].logoUrl).toBe(res.body.logoUrl);
  });
});
