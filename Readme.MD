## Using the API with Postman

Use this in Postman with base URL:

```text
http://localhost:3000
```

### 1. Request a registration OTP

- Method: `POST`
- URL: `http://localhost:3000/api/auth/request-registration-otp`
- Body → raw → JSON:

```json
{ "email": "user@example.com" }
```

Configure the SMTP variables in `.env` first. The six-digit OTP is stored hashed in Redis and expires after `REGISTRATION_OTP_TTL_SECONDS` (10 minutes by default).

### 2. Register

- Method: `POST`
- URL: `http://localhost:3000/api/auth/register`
- Body → raw → JSON:

```json
{
  "name": "Jane Doe",
  "address": "12 Market Street",
  "email": "user@example.com",
  "password": "a-strong-password-123",
  "otp": "123456"
}
```

### 3. Login

- Method: `POST`
- URL: `http://localhost:3000/api/auth/login`
- Body → raw → JSON:

```json
{
  "email": "user@example.com",
  "password": "a-strong-password-123"
}
```

Copy `accessToken` from the response.

Postman automatically saves the `refreshToken` cookie. You can verify it by clicking **Cookies** near the Send button.

### 4. Get current user

- Method: `GET`
- URL: `http://localhost:3000/api/auth/me`
- Authorization tab:
  - Type: `Bearer Token`
  - Token: paste your `accessToken`

### 5. Refresh access token

- Method: `POST`
- URL: `http://localhost:3000/api/auth/refresh`
- No body required.

Postman sends the stored refresh-token cookie automatically and returns a new `accessToken`. Copy the new token for protected API requests.

### 6. Logout

- Method: `POST`
- URL: `http://localhost:3000/api/auth/logout`
- No body required.

Postman sends the refresh cookie; the API removes its Redis session and clears the cookie.

### 7. Product and order API

| Endpoint | Access | Purpose |
| --- | --- | --- |
| `GET /api/products` | Public | List products |
| `GET /api/products/:productId` | Public | Get one product |
| `POST /api/products` | Admin | Create product (`name`, `description`, `price`, `stock`) |
| `PATCH /api/products/:productId` | Admin | Update one or more product fields |
| `DELETE /api/products/:productId` | Admin | Delete product |
| `POST /api/orders` | Logged-in user | Buy: `{ "productId": "...", "quantity": 1 }` |
| `POST /api/orders/:orderId/cancel` | Order owner | Cancel an active order and restore stock |

Pass the access token as `Authorization: Bearer <accessToken>` for protected routes. Product write routes are deliberately admin-only, including creation.

Accounts register as `user`. Promote a trusted account using MongoDB, for example:

```javascript
db.users.updateOne({ email: "admin@example.com" }, { $set: { role: "admin" } })
```

Log in again after changing a role so the newly issued access token includes it.

### 8. Health check

- Method: `GET`
- URL: `http://localhost:3000/health`
