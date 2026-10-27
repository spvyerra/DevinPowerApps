# Feature Flags service API

The Feature Flags service stores named true/false flags that other apps read and toggle.
It is a mock of an internal service and stands in for the internal wiki page Devin reads when building apps.

## Base URL

Server code reads the base URL from `FEATURE_FLAGS_URL`, which defaults to `http://localhost:4001`.
Only server code (server components, server actions, route handlers) calls this service.
Browsers never call it directly, and it has no auth or CORS.

## Flag object

```json
{
  "key": "new-checkout",
  "description": "Turns on the new checkout flow",
  "enabled": false,
  "createdAt": "2026-10-26T12:00:00.000Z",
  "updatedAt": "2026-10-26T12:00:00.000Z"
}
```

`key` is 1 to 64 characters of lowercase letters, digits, and single dashes, for example `new-checkout`.
`description` is at most 500 characters.

## Endpoints

### GET /health

Returns `200` with `{ "ok": true }` while the service runs.

### GET /flags

Returns `200` with an array of flag objects, sorted by key.

### POST /flags

Creates a flag that starts disabled.
Body: `{ "key": "new-checkout", "description": "Turns on the new checkout flow" }`, where `description` is optional.
Returns `201` with the new flag object.

### PATCH /flags/:key

Sets a flag on or off.
Body: `{ "enabled": true }`.
Returns `200` with the updated flag object.

### DELETE /flags/:key

Deletes a flag.
Returns `204` with no body.

## Errors

Errors return JSON `{ "error": "message" }` with one of these statuses.

1. `400`: invalid body, key, description, or enabled value.
2. `404`: unknown flag key or route.
3. `409`: a flag with that key already exists.
4. `413`: body larger than 16 KB.

## Example

```bash
curl -X POST localhost:4001/flags -H 'content-type: application/json' -d '{"key":"new-checkout"}'
curl -X PATCH localhost:4001/flags/new-checkout -H 'content-type: application/json' -d '{"enabled":true}'
curl localhost:4001/flags
```
