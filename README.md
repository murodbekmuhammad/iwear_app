# Iwear

Iwear is an online clothing marketplace with virtual try-on. Companies sell their clothes,
customers try them on with their camera, AI suggests their size and the best items for them,
and couriers deliver orders to the spot the customer picks on a map.

## Roles

| Role | Who | How they get an account |
| --- | --- | --- |
| Admin | Iwear staff | Seeded from `.env` (`npm run db:seed`) |
| Company | Brands and shops that sell clothes | Sign up at `/register-company`, then an admin approves them |
| Customer | Shoppers | Sign up at `/register` |
| Courier | Delivery staff | Created by an admin at `/admin/couriers` |

## Stack

- **API:** [NestJS](https://nestjs.com) + [Prisma](https://www.prisma.io) + PostgreSQL, in `apps/api`
- **Website:** [Nuxt](https://nuxt.com) (Vue 3), in `apps/web`
- TypeScript throughout, with npm workspaces. The API is a plain REST API, so the mobile apps can use it later.

## Roadmap

1. **Foundation** (done): accounts, the four roles, login with JWT, company sign-up and admin approval, courier accounts
2. **Catalog:** companies manage products, sizes, colours, photos and size charts; customers browse and search
3. **Orders:** cart, checkout, payments, order statuses
4. **Delivery:** address picker on a map, courier assignment, delivery tracking
5. **AI:** camera try-on, size estimation, recommendations

## Getting started

You need Node.js 22+ and PostgreSQL 16 (or Docker).

```bash
# 1. Start PostgreSQL and Redis (or use your own PostgreSQL)
docker compose up -d

# 2. Install dependencies
npm install

# 3. Configure the API and the website
cp apps/api/.env.example apps/api/.env      # then set JWT_SECRET and ADMIN_PASSWORD
cp apps/web/.env.example apps/web/.env

# 4. Create the database tables and the first admin
npm run db:migrate
npm run db:seed

# 5. Run both apps (two terminals)
npm run dev:api     # http://localhost:3001/api, docs at http://localhost:3001/api/docs
npm run dev:web     # http://localhost:3000
```

Log in at http://localhost:3000/login with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `apps/api/.env`.

## Tests

```bash
npm run lint    # type-checks the API and the website
npm test        # API unit tests, then end-to-end tests
```

The end-to-end tests use a separate database (`iwear_test` by default, or `TEST_DATABASE_URL`)
and wipe it on every run. Create it once with `createdb -O iwear iwear_test`, or let Docker's
`iwear` user create it.

## API overview

All routes are under `/api`. Send `Authorization: Bearer <accessToken>` except where marked public.
Full, interactive docs are at `/api/docs`.

| Method | Route | Who |
| --- | --- | --- |
| POST | `/auth/register` | Public: customer sign-up |
| POST | `/auth/register/company` | Public: company sign-up (starts as pending) |
| POST | `/auth/login` | Public |
| GET | `/auth/me` | Any signed-in user |
| GET, PATCH | `/company` | Company: view and edit own company |
| GET | `/admin/companies?status=PENDING` | Admin |
| PATCH | `/admin/companies/:id/approve` \| `reject` \| `suspend` | Admin |
| GET | `/admin/users?role=COURIER` | Admin |
| PATCH | `/admin/users/:id/active` | Admin: activate or deactivate an account |
| POST | `/admin/couriers` | Admin: create a courier account |
| GET | `/health` | Public |

### Company status

`PENDING` → `APPROVED` or `REJECTED`. A rejected company goes back to `PENDING` when the owner
edits their profile. An admin can suspend an approved company and approve it again later.
