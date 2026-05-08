# Calendars Sync Events

Small Notion sync service for copying approved EB activities into the SEO calendar.

## Current Scope

The service syncs from the `Activities` data source into the SEO calendar only. It polls Notion every minute by default, so no Notion webhook subscription is required.

An activity is eligible when:

- `Team` is `EB`
- `CEO calendar` is checked
- `Event date` is filled

If an eligible activity already exists in the SEO calendar, the service updates it. Otherwise, it creates a new page. Matching is done by `Source Activity ID`.

## Field Mapping

| Activities | SEO calendar |
| --- | --- |
| `Name` | `Назва події ` |
| `Event date` | `Таймінг` |
| `Businesses` | `Бізнеси ` |
| `EB Activity Type` | `Тип івенту ` |
| `EB Format` | `Формат` |
| `EB Location` | `Локація` |
| `EB Goal` | `Ціль ` |
| `EB Role` | `Хто ми тут?` |
| `EB Audience` | `Цільова аудиторія` |
| `Owner` | `Менеджер ` |
| `Recruiter assigned` | `Рекрутер ` |
| `Рекрутер (кількість)` | `Кількість рекрутерів` |
| `Мерч` | `Мерч` |
| `Status` | `Статус` |
| source page ID | `Source Activity ID` |
| source page URL | `Source Activity URL` |

Unsupported `EB Activity Type` values are skipped for that target field, but the event can still sync.

## Environment

Copy `.env.example` into Railway variables and fill the secrets:

```txt
NOTION_TOKEN=
NOTION_VERSION=2025-09-03
SOURCE_ACTIVITIES_DATA_SOURCE_ID=040fac81-5162-43ee-ad31-e19479696ba3
SEO_CALENDAR_DATA_SOURCE_ID=2a2ce989-9cb7-804f-b66f-000b0b58be12
SYNC_ADMIN_TOKEN=
ENABLE_POLLING=true
POLL_INTERVAL_MS=60000
PORT=3000
```

## Endpoints

- `GET /healthz` - health check
- `POST /webhooks/notion` - optional Notion webhook receiver
- `POST /jobs/backfill` - protected backfill for all currently eligible activities

For backfill, pass either:

```txt
Authorization: Bearer <SYNC_ADMIN_TOKEN>
```

or:

```txt
x-sync-token: <SYNC_ADMIN_TOKEN>
```

## Railway

Railway can run this as a Node service:

```sh
npm install
npm run build
npm run start
```

Polling is controlled by `ENABLE_POLLING` and `POLL_INTERVAL_MS`.
