# JWT Authentication Setup

This project now includes a complete JWT-based authentication system integrated with Prisma and PostgreSQL.

## Features

- ✅ JWT token-based authentication with HTTP-only cookies
- ✅ User registration and login
- ✅ Password hashing with bcrypt
- ✅ Protected routes with middleware
- ✅ Session management (7-day expiration)
- ✅ Beautiful auth UI with shadcn/ui components
- ✅ Integration with Prisma User model

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

This will install the new dependencies:
- `jose` - JWT signing and verification
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT utilities

### 2. Start Database

```bash
docker compose up -d
```

### 3. Run Database Migrations

```bash
npm run db:push
# or
npm run prisma:migrate
```

### 4. Create First User (Optional)

You can create a user via the API or use Prisma Studio:

```bash
npm run prisma:studio
```

Or register through the UI at `/auth/v2/register`

### 5. Start Development Server

```bash
npm run dev
```

## Routes

### Authentication Pages
- **Login**: `/auth/v2/login`
- **Register**: `/auth/v2/register`

### API Endpoints
- **POST** `/api/auth/login` - Login with username/password
- **POST** `/api/auth/register` - Register new user
- **POST** `/api/auth/logout` - Logout (clears cookie)
- **GET** `/api/auth/me` - Get current user session

### Protected Routes
- All `/dashboard/*` routes require authentication
- Unauthenticated users are redirected to `/auth/v2/login`
- Authenticated users accessing auth pages are redirected to `/dashboard/default`

## Environment Variables

Required in `.env`:

```env
DATABASE_URL="postgresql://admin:pwd@localhost:5432/debt_management"
JWT_SECRET="your-super-secret-jwt-key-change-in-production-min-32-chars"
```

⚠️ **Important**: Change `JWT_SECRET` to a strong random string in production!

## API Usage Examples

### Register a New User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "securepass123",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "password": "securepass123"
  }'
```

### Get Current User

```bash
curl http://localhost:3000/api/auth/me \
  -H "Cookie: auth-token=YOUR_TOKEN"
```

### Logout

```bash
curl -X POST http://localhost:3000/api/auth/logout
```

## User Roles

The system supports three user roles defined in the Prisma schema:
- `SUPER_ADMIN` - Full system access
- `ADMIN` - Administrative access
- `USER` - Standard user access (default)

## Security Features

1. **Password Hashing**: All passwords are hashed using bcrypt with 10 salt rounds
2. **HTTP-Only Cookies**: JWT tokens stored in HTTP-only cookies to prevent XSS
3. **Secure Cookies**: Cookies are secure in production (HTTPS only)
4. **Token Expiration**: Tokens expire after 7 days
5. **Middleware Protection**: Routes are protected at the middleware level
6. **Input Validation**: Zod schemas validate all inputs

## File Structure

```
src/
├── app/
│   ├── api/auth/
│   │   ├── login/route.ts       # Login endpoint
│   │   ├── register/route.ts    # Registration endpoint
│   │   ├── logout/route.ts      # Logout endpoint
│   │   └── me/route.ts          # Get current user
│   └── (main)/auth/v2/
│       ├── login/page.tsx       # Login page
│       └── register/page.tsx    # Register page
├── lib/
│   ├── auth.ts                  # JWT utilities
│   ├── password.ts              # Password hashing
│   └── prisma.ts                # Prisma client
├── middleware/
│   └── auth-middleware.ts       # Auth middleware
└── middleware.ts                # Main middleware
```

## Troubleshooting

### "Cannot find module 'jose'" error
Run `npm install` to install all dependencies.

### Database connection errors
Ensure Docker Postgres is running: `docker compose up -d`

### Token verification fails
Check that `JWT_SECRET` is set in `.env` and matches across restarts.

### Middleware not working
Ensure `src/middleware.ts` exists (not `middleware.disabled.ts`).

## Next Steps

- Add password reset functionality
- Implement email verification
- Add OAuth providers (Google, GitHub, etc.)
- Add role-based access control (RBAC)
- Add rate limiting for auth endpoints
- Add 2FA support
