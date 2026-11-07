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
2. **Stores and clothes** (done): visitors browse stores and clothes without logging in; companies manage their clothes with photos, sizes, stock and an optional size chart
3. **Orders:** cart, checkout, payments, order statuses
4. **Delivery:** address picker on a map, courier assignment, delivery tracking
5. **AI:** camera try-on, size estimation, recommendations

## How it works

The UI follows the Iwear product design (warm off-white, plum accent, DM Serif Display + Inter).

1. A visitor opens the site: a try-on hero, "Shop by store" and a "Ready to try on" grid. No login needed.
2. They search dresses or stores from the header, or open a store and filter by type, size and price.
3. On the item page they pick a colour and size and **Add to bag**. The bag can hold items from many
   stores and is kept in the browser.
4. **Checkout** asks the visitor to sign in (or create an account); the bag is kept. Choosing the delivery
   spot on the map and paying come in phase 3. Camera try-on comes later.
5. Companies log in and manage their clothes under **My clothes**. Their store appears to shoppers
   once an admin approves it.

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

## Deploy to Render

`render.yaml` sets up three things on [Render](https://render.com), all in Frankfurt: the PostgreSQL
database (`iwear-db`), the API (`iwear-api`) and the website (`iwear-web`). Each merge to `main`
redeploys both apps, runs database migrations and makes sure the admin account exists.

1. On Render, choose **New → Blueprint**, connect this GitHub repo and pick `main`.
2. Render asks for the values marked `sync: false`. For now, set `ADMIN_EMAIL` and `ADMIN_PASSWORD`
   (your admin login) and leave the two URLs blank. Click **Apply**.
3. When both services are up, copy their addresses from the dashboard and set:
   - on **iwear-web**: `NUXT_PUBLIC_API_BASE` = `https://<iwear-api address>/api`
   - on **iwear-api**: `CORS_ORIGINS` = `https://<iwear-web address>`

   Save both. Render restarts them, and the site is live at the iwear-web address.

Things to know about the free plan:
- Services sleep after 15 minutes without visitors, so the first page after a pause takes about a minute.
- The free database expires after 30 days. Upgrade it before then to keep the data.
- Uploaded photos are saved on the server's disk, which is wiped on every deploy. Before real stores
  upload photos, add a Render disk mounted at `apps/api/uploads` (paid) or switch `UploadsService` to
  S3-style storage.

### Website on GitHub Pages (optional)

GitHub Pages can host the website only, not the API or the database, so the API still runs on Render.
`.github/workflows/pages.yml` builds the website as static files on every push to `main` and publishes it.

1. In the repo, go to **Settings → Pages** and set **Source** to **GitHub Actions**.
2. In **Settings → Secrets and variables → Actions → Variables**, add `API_BASE` =
   `https://<iwear-api address>/api`, then re-run the **Website on GitHub Pages** workflow.
3. On Render, add `https://<your-user>.github.io` to `CORS_ORIGINS` on **iwear-api**
   (comma-separated if there are several).

The site is then at `https://<your-user>.github.io/iwear_app/`.

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
| GET | `/stores?search=` | Public: approved stores |
| GET | `/stores/:slug?category=DRESS` | Public: a store and its visible clothes |
| GET | `/products?search=&category=&limit=` | Public: newest items across all stores (search matches item or store name) |
| GET | `/products/:id` | Public: one item with photos, sizes and size chart |
| GET, POST | `/company/products` | Company: list or add clothes |
| GET, PATCH, DELETE | `/company/products/:id` | Company: view, edit or delete an item |
| POST | `/company/products/:id/images` | Company: upload photos (multipart field `images`) |
| DELETE | `/company/products/:id/images/:imageId` | Company: remove a photo |
| POST | `/company/logo` | Company: upload the store logo (multipart field `logo`) |
| GET | `/health` | Public |

Uploaded photos are saved in `apps/api/uploads` (set `UPLOAD_DIR` to change it) and served at
`/uploads/<file>`. Only real JPG, PNG and WebP files up to 5 MB are accepted. For production, swap
`UploadsService` for cloud storage such as S3.

### Company status

`PENDING` → `APPROVED` or `REJECTED`. A rejected company goes back to `PENDING` when the owner
edits their profile. An admin can suspend an approved company and approve it again later.
