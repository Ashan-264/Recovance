# Database Setup (self-hosted Postgres + Prisma)

Recovance stores Garmin CSV uploads in a self-hosted PostgreSQL database
accessed through Prisma. This replaces the previous Supabase integration.

## Quick start

```bash
cp example.env .env.local      # then fill in your values
npm install                    # runs `prisma generate` automatically
npm run db:up                  # starts Postgres in Docker
npm run db:deploy              # applies migrations
npm run db:seed                # imports ../Activities.csv and ../Sleep.csv
npm run dev
```

## The database

`docker-compose.yml` runs `postgres:17-alpine` with a named volume so data
survives restarts. The host port is **5433**, not the default 5432, so it will
not collide with another Postgres already running on your machine.

```
DATABASE_URL=postgresql://recovance:recovance@localhost:5433/recovance?schema=public
```

Override `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, or `POSTGRES_PORT`
in the environment before `npm run db:up` to change the container's settings —
update `DATABASE_URL` to match.

| Command             | What it does                                        |
| ------------------- | --------------------------------------------------- |
| `npm run db:up`     | Start the Postgres container                         |
| `npm run db:down`   | Stop it (the volume, and your data, are kept)        |
| `npm run db:migrate`| Create + apply a migration after editing the schema  |
| `npm run db:deploy` | Apply existing migrations (use this in production)   |
| `npm run db:seed`   | Import Garmin CSVs (safe to re-run)                  |
| `npm run db:studio` | Browse the data in Prisma Studio                     |
| `npm run db:reset`  | Drop everything, re-migrate, re-seed                 |

## Schema

Defined in `prisma/schema.prisma`; migrations live in `prisma/migrations/`.

**`garmin_activity`** — one row per workout. Unique on `(date, activity_type)`,
so re-uploading an export updates existing rows instead of duplicating them.

**`garmin_sleep`** — one row per day. Garmin exports sleep a week at a time, and
the upload expands each range into individual days. Unique on `date`.

> Prisma 7 note: the connection URL lives in `prisma.config.ts`, not in
> `schema.prisma`, and the client is constructed with the `@prisma/adapter-pg`
> driver adapter (see `src/lib/prisma.ts`).

## Importing Garmin data

The seed script reads the CSV exports at the repository root:

```bash
npm run db:seed                                   # ../Activities.csv, ../Sleep.csv
npx tsx prisma/seed.ts --activities path/to.csv   # explicit paths
npx tsx prisma/seed.ts --sleep path/to.csv
```

Everything is upserted on the natural keys above, so running it twice is safe.

You can also upload through the UI: **Training → Activity Data Upload** and
**Recovery → Sleep Data Upload** post to the endpoints below.

### A quirk of the sleep export

Garmin writes weeks newest-first and *omits the year on recent rows*
(`Aug 7-13`), spelling it out only on older ones (`Aug 15-21, 2024`). It also
leaves those commas unquoted, so a naive CSV split breaks the date into extra
columns. `src/lib/garminCsv.ts` rejoins those columns and infers each row's year
from the surrounding rows, advancing the year whenever the month wraps from
December into January. Without this, unlabeled rows silently land in the wrong
year.

## API endpoints

| Method | Endpoint                        | Purpose                          |
| ------ | ------------------------------- | -------------------------------- |
| `POST` | `/api/garmin/upload-activities` | Upload a parsed activities CSV   |
| `POST` | `/api/garmin/upload-sleep`      | Upload a parsed sleep CSV        |
| `GET`  | `/api/garmin/activities`        | Query stored activities          |
| `GET`  | `/api/garmin/sleep`             | Query stored sleep days          |

Both `GET` endpoints accept `start_date`, `end_date`, and `limit`;
`/api/garmin/activities` also accepts `activity_type`.

```bash
curl "http://localhost:3000/api/garmin/activities?activity_type=Cycling&limit=5"
curl "http://localhost:3000/api/garmin/sleep?start_date=2024-12-01&end_date=2024-12-31"
```

When `DATABASE_URL` is missing these return `503` with an explanatory message
rather than crashing.

## Production

Point `DATABASE_URL` at your managed or self-hosted instance and run
`npm run db:deploy` as part of the release. Never run `db:reset` there — it
drops every table.
