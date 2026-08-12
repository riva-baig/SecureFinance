# SecureFin authentication testing playbook

The development reset mode logs the reset link and returns `development_token` in the forgot-password response so the flow can be verified without pretending an email was delivered.

1. Register with `POST /api/auth/register` using name, email, password, confirm_password and demo_data true.
2. Confirm the response has a user object and secure session cookies.
3. Call `GET /api/auth/me` with the same cookie jar.
4. Call `POST /api/auth/forgot-password` then use the returned development_token with `POST /api/auth/reset-password`.
5. Log in with the new password, call `POST /api/auth/2fa/setup`, generate the current TOTP from the returned secret, and call `POST /api/auth/2fa/verify`.
6. Log out, then confirm login requires `two_factor_code`.
7. Confirm the admin password is bcrypt hashed in MongoDB, user records are user-scoped, and `/api/auth/me` never returns password_hash.