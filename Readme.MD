## Using the API with Postman

Use this in Postman with base URL:

```text
http://localhost:3000
```

### 1. Register

- Method: `POST`
- URL: `http://localhost:3000/api/auth/register`
- Body → raw → JSON:

```json
{
  "email": "user@example.com",
  "password": "a-strong-password-123"
}
```

### 2. Login

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

### 3. Get current user

- Method: `GET`
- URL: `http://localhost:3000/api/auth/me`
- Authorization tab:
  - Type: `Bearer Token`
  - Token: paste your `accessToken`

### 4. Refresh access token

- Method: `POST`
- URL: `http://localhost:3000/api/auth/refresh`
- No body required.

Postman sends the stored refresh-token cookie automatically and returns a new `accessToken`. Copy the new token for protected API requests.

### 5. Logout

- Method: `POST`
- URL: `http://localhost:3000/api/auth/logout`
- No body required.

Postman sends the refresh cookie; the API removes its Redis session and clears the cookie.

### 6. Health check

- Method: `GET`
- URL: `http://localhost:3000/health`
