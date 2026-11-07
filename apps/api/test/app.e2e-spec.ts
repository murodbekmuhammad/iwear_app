import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { configureApp } from '../src/setup';

describe('Iwear API (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let adminToken: string;

  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.company.deleteMany();
    await prisma.user.deleteMany();
    await prisma.user.create({
      data: {
        email: 'admin@iwear.test',
        name: 'Admin',
        role: Role.ADMIN,
        passwordHash: await bcrypt.hash('AdminPass123', 4),
      },
    });
    const res = await http().post('/api/auth/login').send({ email: 'admin@iwear.test', password: 'AdminPass123' });
    adminToken = res.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('reports health', async () => {
    await http().get('/api/health').expect(200, { status: 'ok' });
  });

  describe('customers', () => {
    it('registers, logs in and reads their profile', async () => {
      const reg = await http()
        .post('/api/auth/register')
        .send({ name: 'Aziza', email: 'Aziza@Example.com', password: 'secret123' })
        .expect(201);
      expect(reg.body.user).toMatchObject({ email: 'aziza@example.com', role: 'CUSTOMER' });
      expect(reg.body.user.passwordHash).toBeUndefined();

      const login = await http()
        .post('/api/auth/login')
        .send({ email: 'aziza@example.com', password: 'secret123' })
        .expect(200);

      const me = await http().get('/api/auth/me').set('Authorization', `Bearer ${login.body.accessToken}`).expect(200);
      expect(me.body.name).toBe('Aziza');
    });

    it('rejects duplicate emails, bad passwords and invalid input', async () => {
      const body = { name: 'Aziza', email: 'aziza@example.com', password: 'secret123' };
      await http().post('/api/auth/register').send(body).expect(201);
      await http().post('/api/auth/register').send(body).expect(409);
      await http().post('/api/auth/login').send({ email: body.email, password: 'wrong-pass' }).expect(401);
      await http().post('/api/auth/register').send({ name: 'A', email: 'nope', password: '1' }).expect(400);
    });

    it('cannot pick their own role', async () => {
      await http()
        .post('/api/auth/register')
        .send({ name: 'Sneaky', email: 'sneaky@example.com', password: 'secret123', role: 'ADMIN' })
        .expect(400);
    });

    it('cannot reach admin routes', async () => {
      const reg = await http()
        .post('/api/auth/register')
        .send({ name: 'Aziza', email: 'aziza@example.com', password: 'secret123' });
      await http().get('/api/admin/companies').set('Authorization', `Bearer ${reg.body.accessToken}`).expect(403);
      await http().get('/api/admin/companies').expect(401);
    });
  });

  describe('company approval', () => {
    async function registerCompany(email = 'owner@silk.test', companyName = 'Silk Road Fashion') {
      const res = await http()
        .post('/api/auth/register/company')
        .send({ name: 'Owner', email, password: 'secret123', companyName })
        .expect(201);
      return res.body as { accessToken: string; user: { company: { id: string; status: string; slug: string } } };
    }

    it('creates a pending company with a unique slug', async () => {
      const first = await registerCompany();
      const second = await registerCompany('other@silk.test');
      expect(first.user.company).toMatchObject({ status: 'PENDING', slug: 'silk-road-fashion' });
      expect(second.user.company.slug).toBe('silk-road-fashion-2');
    });

    it('lets an admin list, approve and suspend companies', async () => {
      const owner = await registerCompany();
      const id = owner.user.company.id;
      const auth = { Authorization: `Bearer ${adminToken}` };

      const pending = await http().get('/api/admin/companies?status=PENDING').set(auth).expect(200);
      expect(pending.body.total).toBe(1);

      const approved = await http().patch(`/api/admin/companies/${id}/approve`).set(auth).expect(200);
      expect(approved.body.status).toBe('APPROVED');
      await http().patch(`/api/admin/companies/${id}/approve`).set(auth).expect(400);

      const suspended = await http().patch(`/api/admin/companies/${id}/suspend`).set(auth).expect(200);
      expect(suspended.body.status).toBe('SUSPENDED');
    });

    it('sends a rejected company back to review after the owner edits it', async () => {
      const owner = await registerCompany();
      const id = owner.user.company.id;

      await http()
        .patch(`/api/admin/companies/${id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Missing address' })
        .expect(200);

      const ownerAuth = { Authorization: `Bearer ${owner.accessToken}` };
      const mine = await http().get('/api/company').set(ownerAuth).expect(200);
      expect(mine.body).toMatchObject({ status: 'REJECTED', rejectionReason: 'Missing address' });

      const updated = await http().patch('/api/company').set(ownerAuth).send({ address: 'Tashkent' }).expect(200);
      expect(updated.body).toMatchObject({ status: 'PENDING', rejectionReason: null, address: 'Tashkent' });
    });
  });

  describe('couriers and accounts', () => {
    it('lets an admin create a courier who can then log in', async () => {
      await http()
        .post('/api/admin/couriers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Bekzod', email: 'bekzod@iwear.test', password: 'secret123' })
        .expect(201);

      const login = await http()
        .post('/api/auth/login')
        .send({ email: 'bekzod@iwear.test', password: 'secret123' })
        .expect(200);
      expect(login.body.user.role).toBe('COURIER');
    });

    it('blocks a deactivated user straight away', async () => {
      const reg = await http()
        .post('/api/auth/register')
        .send({ name: 'Aziza', email: 'aziza@example.com', password: 'secret123' });

      await http()
        .patch(`/api/admin/users/${reg.body.user.id}/active`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false })
        .expect(200);

      await http().get('/api/auth/me').set('Authorization', `Bearer ${reg.body.accessToken}`).expect(401);
      await http().post('/api/auth/login').send({ email: 'aziza@example.com', password: 'secret123' }).expect(401);
    });
  });
});
