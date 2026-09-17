# Anvil — shop-floor manufacturing system

Anvil is a small all-in-one production, inventory, and quality system for
small/mid-size manufacturers: work orders, a raw-material and finished-goods
inventory with bills of materials, purchase and sales orders, and an
NCR/CAPA quality workflow. This is a real, deployable Next.js web app backed
by a real Postgres database — not a mockup.

This README covers three things: running it locally, deploying it for a
real pilot customer, and what this version does and doesn't do yet.

## 1. Running it locally

You need Node.js 20+ and a Postgres database (16 or later).

```bash
npm install
cp .env.example .env
```

Edit `.env` and point `DATABASE_URL` at your Postgres instance. If you
don't have Postgres running anywhere, the quickest way is:

```bash
docker run --name anvil-postgres -e POSTGRES_PASSWORD=anvildev \
  -p 5432:5432 -d postgres:16
# then set DATABASE_URL=postgresql://postgres:anvildev@127.0.0.1:5432/anvil
```

Then create the tables and seed the first company + admin login:

```bash
npm run db:migrate
npm run db:seed
```

`db:seed` prints the admin email/password it created — that's what you log
in with. It's safe to re-run; it skips seeding if the organization already
exists.

Start the app:

```bash
npm run dev
```

Open http://localhost:3000 — it redirects you to `/login`.

## 2. Deploying a real pilot (Render)

This repo includes a `Dockerfile` and a `render.yaml` blueprint, so you can
get a real, always-on, internet-reachable copy running for a pilot customer
in about ten minutes, without writing any deployment code yourself.

**Step 1 — push this code to GitHub or GitLab.** Render deploys from a git
repo, not from a zip file. Create an empty repo and push this folder to it.

**Step 2 — create the Blueprint.** In the [Render
dashboard](https://dashboard.render.com), click **New +** → **Blueprint**,
and point it at your repo. Render reads `render.yaml` and shows you a plan:
one web service (`anvil-app`) and one Postgres database (`anvil-db`). Click
**Apply**.

**Step 3 — wait for the first deploy.** Render builds the Docker image,
creates the database, and — because of the `preDeployCommand` in
`render.yaml` — automatically runs `node db/migrate.js` to create the
tables before the app starts. This part is automatic; you don't run
anything by hand.

**Step 4 — seed the first company and admin login.** Migrations create
empty tables but don't create your customer's organization or their first
login. Do that once, from Render's dashboard: open the `anvil-app` service
→ **Shell** tab, and run:

```bash
ORG_NAME="Their Company Name" ORG_SLUG="their-company" \
ADMIN_EMAIL="owner@theircompany.com" ADMIN_NAME="Owner Name" \
ADMIN_PASSWORD="some-temporary-password" \
node db/seed.js
```

It prints the login it created. Give that to your customer and have them
change the password the moment they log in (see "known limitations" below
— there's no in-app password change yet, so for now that means creating a
fresh user for them and deleting the old one, or updating the
`password_hash` column directly).

**Step 5 — set a real `AUTH_SECRET`.** `render.yaml` already has Render
generate a random one for you (`generateValue: true`) — you don't need to
do anything here, just don't override it with something guessable.

That's it — `anvil-app.onrender.com` (or whatever Render names it) is a
real, live login page. Point your customer's browser at it.

### What this costs

As of writing, Render's `starter` web service plan is about $7/month
(always-on, no cold start) and the `basic-256mb` Postgres plan is about
$6/month — roughly $13/month total for one pilot customer. Render also
offers free tiers for both, which are fine for kicking the tires, but two
things will bite you if you put a real customer on them: the free web
service spins down after inactivity and is slow to wake back up, and —
more importantly — **Render's free Postgres databases are deleted 30 days
after creation**, taking your customer's data with them. Don't run a real
pilot on the free database plan. Check
[render.com/pricing](https://render.com/pricing) for current numbers
before you commit to anything — pricing pages change.

### Running it anywhere else (plain Docker)

`render.yaml` is Render-specific, but the `Dockerfile` isn't. Any host that
runs a container works:

```bash
docker build -t anvil .
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@your-db-host:5432/anvil" \
  -e AUTH_SECRET="$(openssl rand -base64 48)" \
  -e DATABASE_SSL=true \
  anvil
```

Run migrations and the seed script once, the same way, as one-off
containers pointed at the same `DATABASE_URL`:

```bash
docker run -e DATABASE_URL=... -e AUTH_SECRET=... anvil node db/migrate.js
docker run -e DATABASE_URL=... -e AUTH_SECRET=... -e ORG_NAME=... \
  -e ORG_SLUG=... -e ADMIN_EMAIL=... -e ADMIN_NAME=... -e ADMIN_PASSWORD=... \
  anvil node db/seed.js
```

## 3. What's real, and what's still a pilot-stage limitation

Everything in the app talks to a real Postgres database through real
server-side code — logins are real bcrypt-hashed passwords behind signed,
httpOnly session cookies, and every number on screen (stock levels, work
order status, NCR counts) is a live query, not sample data. Completing a
work order actually decrements raw materials and increments the finished
good according to its bill of materials; receiving a purchase order
actually increments stock; shipping a sales order actually decrements it.
That logic has been tested end-to-end against a real database, not just
read from the code.

What it doesn't do yet, so you (or your customer) aren't surprised:

- **One company per deployment.** Every table is already scoped by an
  `orgId` so a future multi-tenant version is a real possibility, but today
  there's no self-serve signup — each pilot customer needs their own
  deploy (or their own seeded organization, if you later add multi-org
  routing). This is a pilot tool, not yet a multi-tenant SaaS product.
- **Two roles only.** Admin and member. No per-module permissions.
- **No self-serve password reset.** An admin creates teammates with a
  temporary password by hand; there's no "forgot password" email flow.
- **No email notifications** — nothing pages anyone when a work order is
  blocked or a reorder point is hit; that's on-screen only.
- **No file attachments** on NCRs, work orders, or POs (no photos of a
  defect, no scanned packing slips).
- **No data export/import or reporting beyond the on-screen lists.**
- **No mobile app** — the pages are usable on a tablet in a browser but
  aren't a native app.
- **BOMs are capped at 8 component rows** in the editor, to keep the UI
  working without client-side JavaScript. Real BOMs with more components
  need a schema change to lift, not just a config flag.

None of these are hard to add — they're deliberately deferred so a real
pilot could get running now. If a pilot goes well, that limitations list is
the honest starting point for what "make this sellable to more than one
company" actually requires next: self-serve signup and billing,
role-based permissions, and multi-tenant routing chief among them.

## Project layout

```
app/(app)/…       authenticated pages (dashboard, production, inventory, quality, team)
app/login/        login page
app/actions.js    all server actions (every mutation in the app lives here)
db/schema.js      Drizzle table definitions
db/migrate.js     applies db/migrations/*.sql — run on every deploy
db/seed.js        creates the first organization + admin login — run once
lib/auth.js       password hashing + session cookie helpers
lib/session-token.js   JWT sign/verify (Edge-safe, used by proxy.js)
proxy.js          auth gate — redirects logged-out visitors to /login
```
