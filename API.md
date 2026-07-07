# Compra Inteligente API

Backend para simular planes de pago de crédito vehicular bajo la modalidad **Compra Inteligente** (cuota balón).

**Base URL:** `/api/v1`  
**Auth scheme:** `Authorization: Bearer <access_token>` (HTTP Bearer)

---

## Table of Contents

1. [Auth Flow](#auth-flow)
2. [Auth Behavior — Frontend Guide](#auth-behavior--frontend-guide)
3. [Endpoints](#endpoints)
   - [Health](#health)
   - [Auth](#auth)
   - [Clients](#clients)
   - [Vehicles](#vehicles)
   - [Loans](#loans)
4. [Error Shape](#error-shape)
5. [Domain Enumerations](#domain-enumerations)

---

## Auth Flow

```
POST /api/v1/auth/register   → creates user
POST /api/v1/auth/login      → returns access_token + refresh_token
GET  /api/v1/auth/me         → returns user profile (requires access_token)
POST /api/v1/auth/refresh    → exchanges refresh_token for a new token pair
```

All routes except `/auth/register`, `/auth/login`, and `/health` require a valid `access_token`.

---

## Auth Behavior — Frontend Guide

### Token lifetimes (defaults, overridable via env)
| Token         | Default TTL      |
|---------------|------------------|
| access_token  | 30 minutes       |
| refresh_token | 7 days           |

### Recommended storage
- **access_token** → memory only (JS variable / React state). Never `localStorage` — XSS can steal it.
- **refresh_token** → `HttpOnly` cookie set by the server, OR encrypted `localStorage` if the server cannot set cookies. The cookie path should be restricted to `/api/v1/auth/refresh`.

### Request cycle
1. Attach `Authorization: Bearer <access_token>` to every authenticated request.
2. If the API returns `401 authentication_error`, the access token has expired or is invalid.
3. Call `POST /api/v1/auth/refresh` with the stored refresh token.
4. If refresh succeeds, replace both tokens in storage and retry the original request **once**.
5. If refresh fails (`401`), the refresh token is expired or revoked — redirect to login.

### Token type validation
The server enforces a `type` claim inside each JWT:
- `access` tokens are accepted on all protected routes.
- `refresh` tokens are accepted **only** on `POST /auth/refresh`. Sending a refresh token to any other route returns `401`.

### Ownership model
Every resource (client, vehicle, loan) belongs to the authenticated user (`owner_id = user.id`). Attempting to read or modify another user's resource returns `403 authorization_error`. The frontend should never store or expose the `owner_id` — it is informational only.

---

## Endpoints

### Health

#### `GET /health`

No authentication required.

**Response `200`**
```json
{ "status": "ok" }
```

---

### Auth

#### `POST /api/v1/auth/register`

Create a new user account.

**Request body**
```json
{
  "email": "user@example.com",
  "password": "min8chars",
  "full_name": "Fabrizio Contreras"
}
```

| Field       | Type   | Constraints              |
|-------------|--------|--------------------------|
| `email`     | string | valid email              |
| `password`  | string | 8–128 characters         |
| `full_name` | string | 1–255 characters         |

**Response `201`**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "Fabrizio Contreras",
  "is_active": true,
  "created_at": "2026-06-20T12:00:00Z"
}
```

---

#### `POST /api/v1/auth/login`

Exchange credentials for a token pair.

**Request body**
```json
{
  "email": "user@example.com",
  "password": "yourpassword"
}
```

**Response `200`**
```json
{
  "access_token": "<jwt>",
  "refresh_token": "<jwt>",
  "token_type": "bearer"
}
```

Errors: `401 authentication_error` if credentials are invalid.

---

#### `POST /api/v1/auth/refresh`

Exchange a refresh token for a new access + refresh token pair. **Previous tokens are invalidated.**

**Request body**
```json
{
  "refresh_token": "<jwt>"
}
```

**Response `200`** — same shape as login.

Errors: `401 authentication_error` if the token is expired, invalid, or not of type `refresh`.

---

#### `GET /api/v1/auth/me`

Return the profile of the currently authenticated user.

**Headers:** `Authorization: Bearer <access_token>`

**Response `200`** — same shape as register response.

---

### Clients

All routes require authentication. Users can only see and modify their own clients.

#### `GET /api/v1/clients`

List all clients belonging to the authenticated user.

**Response `200`**
```json
[
  {
    "id": "uuid",
    "owner_id": "uuid",
    "full_name": "Juan Pérez",
    "document_id": "12345678",
    "email": "juan@example.com",
    "phone": "999999999",
    "created_at": "2026-06-20T12:00:00Z"
  }
]
```

---

#### `POST /api/v1/clients`

Create a new client.

**Request body**
```json
{
  "full_name": "Juan Pérez",
  "document_id": "12345678",
  "email": "juan@example.com",
  "phone": "999999999"
}
```

| Field         | Type   | Constraints       |
|---------------|--------|-------------------|
| `full_name`   | string | 1–255 characters  |
| `document_id` | string | 1–50 characters   |
| `email`       | string | valid email       |
| `phone`       | string | optional, ≤50 chars |

**Response `201`** — same shape as list item.

---

#### `GET /api/v1/clients/{client_id}`

Get a single client by UUID. Returns `403` if the client belongs to another user.

**Response `200`** — same shape as list item.

---

#### `PATCH /api/v1/clients/{client_id}`

Update a client. All registered fields are editable.

**Request body** (all fields optional)
```json
{
  "full_name": "Juan Pérez Díaz",
  "document_id": "45678912",
  "email": "new@example.com",
  "phone": "987654321"
}
```

**Response `200`** — updated client object.

---

#### `DELETE /api/v1/clients/{client_id}`

Delete a client. Returns `403` if not the owner.

**Response `204 No Content`**

---

### Vehicles

All routes require authentication. Users can only see and modify their own vehicles.

#### `GET /api/v1/vehicles`

List all vehicles belonging to the authenticated user.

**Response `200`**
```json
[
  {
    "id": "uuid",
    "owner_id": "uuid",
    "brand": "Toyota",
    "model": "Corolla",
    "year": 2024,
    "list_price": "85000.00",
    "currency": "PEN",
    "created_at": "2026-06-20T12:00:00Z"
  }
]
```

Note: `list_price` is returned as a string to preserve decimal precision.

---

#### `POST /api/v1/vehicles`

Create a new vehicle.

**Request body**
```json
{
  "brand": "Toyota",
  "model": "Corolla",
  "year": 2024,
  "list_price": "85000.00",
  "currency": "PEN"
}
```

| Field        | Type    | Constraints              |
|--------------|---------|--------------------------|
| `brand`      | string  | 1–100 characters         |
| `model`      | string  | 1–100 characters         |
| `year`       | integer | 1900–2100                |
| `list_price` | decimal | > 0                      |
| `currency`   | string  | `"PEN"` or `"USD"`       |

**Response `201`** — same shape as list item.

---

#### `GET /api/v1/vehicles/{vehicle_id}`

Get a single vehicle by UUID. Returns `403` if not the owner.

**Response `200`** — same shape as list item.

---

#### `PATCH /api/v1/vehicles/{vehicle_id}`

Update a vehicle. All registered fields are editable.

**Request body** (all fields optional)
```json
{
  "brand": "Toyota",
  "model": "Corolla Cross",
  "year": 2026,
  "list_price": "90000.00",
  "currency": "PEN"
}
```

**Response `200`** — updated vehicle object.

---

#### `DELETE /api/v1/vehicles/{vehicle_id}`

Delete a vehicle. Returns `403` if not the owner.

**Response `204 No Content`**

---

### Loans

All routes require authentication. A loan belongs to a client; ownership is verified transitively (`loan → client → owner_id == user.id`).

#### `GET /api/v1/loans`

List all loans whose client belongs to the authenticated user.

**Response `200`**
```json
[
  {
    "id": "uuid",
    "client_id": "uuid",
    "vehicle_id": "uuid",
    "currency": "PEN",
    "vehicle_price": "85000.00",
    "initial_payment_pct": "0.20",
    "balloon_pct": "0.30",
    "term_periods": 36,
    "frequency_days": 30,
    "rate_segments": [
      {
        "from_period": 1,
        "to_period": 36,
        "rate_kind": "TEA",
        "rate_value": "0.12",
        "capitalizations_per_year": null
      }
    ],
    "grace_periods": ["T", "P", "S"],
    "additional_charges": [],
    "status": "draft",
    "created_at": "2026-06-20T12:00:00Z"
  }
]
```

The loan object includes the full configuration (`rate_segments`,
`grace_periods`, `additional_charges`) so the UI can pre-fill edit forms.

---

#### `POST /api/v1/loans`

Create a new loan simulation.

**Request body**
```json
{
  "client_id": "uuid",
  "vehicle_id": "uuid",
  "currency": "PEN",
  "vehicle_price": "85000.00",
  "initial_payment_pct": "0.20",
  "balloon_pct": "0.30",
  "term_periods": 36,
  "frequency_days": 30,
  "rate_segments": [
    {
      "from_period": 1,
      "to_period": 36,
      "rate_kind": "TEA",
      "rate_value": "0.12",
      "capitalizations_per_year": null
    }
  ],
  "grace_periods": ["T", "P", "S"],
  "additional_charges": [
    {
      "name": "Seguro vehicular",
      "kind": "seguro",
      "basis": "balance_pct",
      "value": "0.003",
      "applies_from_period": 1,
      "applies_to_period": null
    }
  ]
}
```

**Field reference**

| Field                | Type            | Constraints / Notes                                     |
|----------------------|-----------------|---------------------------------------------------------|
| `client_id`          | UUID            | Must belong to authenticated user                       |
| `vehicle_id`         | UUID            | Must belong to authenticated user                       |
| `currency`           | string          | `"PEN"` or `"USD"`                                      |
| `vehicle_price`      | decimal         | > 0                                                     |
| `initial_payment_pct`| decimal         | 0 ≤ x < 1 (e.g. `"0.20"` = 20%)                       |
| `balloon_pct`        | decimal         | 0 ≤ x < 1 (e.g. `"0.30"` = 30% balloon payment)       |
| `term_periods`       | integer         | > 0 (number of installments)                            |
| `frequency_days`     | integer         | > 0 (e.g. 30 = monthly, 15 = biweekly)                 |
| `rate_segments`      | array           | At least one; periods must be contiguous and cover 1–N  |
| `grace_periods`      | array of string | One entry per period; `"S"` normal (no grace), `"P"` partial grace, `"T"` total grace |
| `additional_charges` | array           | Optional fees/insurance applied per period              |

**`rate_segments` item**

| Field                    | Type    | Constraints                        |
|--------------------------|---------|------------------------------------|
| `from_period`            | integer | ≥ 1                                |
| `to_period`              | integer | ≥ 1, ≥ `from_period`              |
| `rate_kind`              | string  | `"TEA"` or `"TNA"`                 |
| `rate_value`             | decimal | Annual rate as decimal (0.12 = 12%)|
| `capitalizations_per_year` | integer | Required when `rate_kind = "TNA"` |

**`additional_charges` item**

| Field                | Type    | Constraints / Notes                          |
|----------------------|---------|----------------------------------------------|
| `name`               | string  | Display label                                |
| `kind`               | string  | `"seguro"`, `"comision"`, `"portes"`, `"otro"` |
| `basis`              | string  | `"fixed"`, `"balance_pct"`, `"payment_pct"`  |
| `value`              | decimal | Amount or rate depending on `basis`          |
| `applies_from_period`| integer | Default `1`                                  |
| `applies_to_period`  | integer | `null` = every period from `from` to end     |

**Response `201`** — same shape as list item.

---

#### `GET /api/v1/loans/{loan_id}`

Get a single loan. Returns `403` if not the owner's loan.

**Response `200`** — same shape as list item.

---

#### `PATCH /api/v1/loans/{loan_id}`

Update mutable loan fields. All fields are optional; omit to leave unchanged.
Patching any parameter **discards the stored schedule** and resets `status` to
`draft` — call `POST /schedule` again to recompute.

**Request body**
```json
{
  "currency": "PEN",
  "vehicle_price": "90000.00",
  "initial_payment_pct": "0.25",
  "balloon_pct": "0.35",
  "term_periods": 48,
  "frequency_days": 30,
  "rate_segments": [...],
  "grace_periods": [...],
  "additional_charges": [...]
}
```

**Response `200`** — updated loan object.

---

#### `DELETE /api/v1/loans/{loan_id}`

Delete a loan and its schedule. Returns `403` if not the owner.

**Response `204 No Content`**

---

#### `POST /api/v1/loans/{loan_id}/schedule`

**Compute and persist** the French amortization schedule (Compra Inteligente modality). Replaces any previously stored schedule for this loan.

**Response `200`**
```json
{
  "loan_id": "uuid",
  "rows": [
    {
      "period": 1,
      "grace_type": "S",
      "initial_balance": "68000.00",
      "interest": "660.23",
      "payment": "2138.45",
      "amortization": "1478.22",
      "final_balance": "66521.78",
      "charges": [
        { "name": "Seguro vehicular", "kind": "seguro", "amount": "-204.00" }
      ],
      "charges_total": "-204.00",
      "total_payment": "2342.45"
    }
  ]
}
```

All monetary values are strings (decimal precision). `charges` lists each
per-period additional charge (negative amounts = debtor outflows);
`total_payment = payment + charges_total` is the full installment required by
the transparency norm. (Example shown with positive payment values for
brevity; the engine returns them negative.)

---

#### `GET /api/v1/loans/{loan_id}/schedule`

Return the **stored** schedule. Returns an empty `rows` array if no schedule has been generated yet (call `POST` first).

**Response `200`** — same shape as above.

---

#### `GET /api/v1/loans/{loan_id}/indicators`

Return financial indicators for the loan. The schedule must exist before calling this.

**Query parameters**

| Parameter                | Type    | Required | Description                                       |
|--------------------------|---------|----------|---------------------------------------------------|
| `discount_rate_per_period` | decimal | No     | Period rate for VAN computation. If omitted, `van_at_period_rate` is `null`. |

**Response `200`**
```json
{
  "loan_id": "uuid",
  "tir_per_period": "0.00987",
  "tcea": "0.12453",
  "van_at_period_rate": "1523.45",
  "cashflows": ["-68000.00", "2138.45", "2138.45", "..."]
}
```

| Field              | Description                                                   |
|--------------------|---------------------------------------------------------------|
| `tir_per_period`   | IRR per payment period (solved via Brent's method)            |
| `tcea`             | Costo Efectivo Anual (annualized, 360-day Peruvian convention)|
| `van_at_period_rate` | NPV at the supplied discount rate; `null` if not provided   |
| `cashflows`        | Loan outflow (negative) followed by each period payment       |

---

### Operations log

#### `GET /api/v1/operations`

Return the authenticated user's operation log (every mutation — register,
login, CRUD, schedule generation, indicator calculation — is recorded in the
`operations_log` table).

**Query parameters**

| Parameter | Type    | Required | Description                    |
|-----------|---------|----------|--------------------------------|
| `limit`   | integer | No       | Max rows (1–500, default 100)  |

**Response `200`**
```json
[
  {
    "id": "uuid",
    "action": "loan.schedule_generated",
    "entity_type": "loan",
    "entity_id": "uuid",
    "detail": { "rows": 36 },
    "created_at": "2026-07-02T12:00:00Z"
  }
]
```

---

## Error Shape

All errors follow a consistent envelope:

```json
{
  "error": "<code>",
  "message": "<human-readable description>"
}
```

| HTTP Status | `error` code          | Typical cause                                          |
|-------------|-----------------------|--------------------------------------------------------|
| 400         | `domain_error`        | Business rule violation (e.g., invalid rate segment)   |
| 401         | `authentication_error`| Missing / expired / malformed token                    |
| 403         | `authorization_error` | Accessing a resource that belongs to another user      |
| 404         | `not_found`           | Resource UUID does not exist                           |
| 422         | `validation_error`    | Request body fails schema validation                   |
| 422         | `convergence_error`   | TIR/VAN solver did not converge (degenerate cash flows)|

---

## Domain Enumerations

### Currency
| Value | Description     |
|-------|-----------------|
| `PEN` | Peruvian Sol    |
| `USD` | US Dollar       |

### Rate kind (`rate_kind`)
| Value | Description                                      |
|-------|--------------------------------------------------|
| `TEA` | Tasa Efectiva Anual (effective annual rate)       |
| `TNA` | Tasa Nominal Anual (nominal annual rate); requires `capitalizations_per_year` |

### Grace period codes
| Value | Description                                    |
|-------|------------------------------------------------|
| `N`   | Normal — full interest + amortization          |
| `S`   | Parcial (Sólo interés) — interest only, no amortization |
| `T`   | Total — no payment (interest capitalized)      |

### Additional charge kind (`kind`)
| Value      | Description          |
|------------|----------------------|
| `seguro`   | Insurance            |
| `comision` | Commission           |
| `portes`   | Handling / postage   |
| `otro`     | Other                |

### Additional charge basis (`basis`)
| Value         | Description                              |
|---------------|------------------------------------------|
| `fixed`       | Fixed amount per period                  |
| `balance_pct` | Percentage of outstanding balance        |
| `payment_pct` | Percentage of the period payment amount  |

### Loan status
| Value       | Description                           |
|-------------|---------------------------------------|
| `draft`     | Created, schedule not yet computed    |
| `scheduled` | Schedule computed and persisted       |

### Grace codes
| Value | Description                                              |
|-------|----------------------------------------------------------|
| `S`   | Normal period (no grace): full installment               |
| `P`   | Partial grace: interest only, no amortization            |
| `T`   | Total grace: nothing paid, interest capitalizes          |
