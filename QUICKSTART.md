# Quick Start Guide - JWT Authentication

Get up and running with authentication in 5 minutes!

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Start PostgreSQL Database
```bash
docker compose up -d
```

### 3. Push Database Schema
```bash
npm run db:push
```

### 4. Create Admin User (Optional)
```bash
npm run db:seed
```

This creates a default admin user:
- **Username**: `admin`
- **Password**: `admin123`
- **Email**: `admin@example.com`
- **Role**: `ADMIN`

To customize, set environment variables:
```bash
ADMIN_USERNAME=myuser ADMIN_PASSWORD=mypass npm run db:seed
```

### 5. Start Development Server
```bash
npm run dev
```

### 6. Test Authentication

Visit: **http://localhost:3000/auth/v2/login**

Login with:
- Username: `admin`
- Password: `admin123`

Or register a new account at: **http://localhost:3000/auth/v2/register**

## 📋 What's Included

✅ **JWT Authentication** with HTTP-only cookies  
✅ **Login & Register** pages with beautiful UI  
✅ **Protected Routes** via middleware  
✅ **Password Hashing** with bcrypt  
✅ **Session Management** (7-day expiration)  
✅ **User Roles** (SUPER_ADMIN, ADMIN, USER)  
✅ **API Endpoints** for auth operations  

## 🔐 Authentication Flow

1. User registers or logs in at `/auth/v2/login`
2. Server validates credentials and generates JWT
3. JWT stored in HTTP-only cookie
4. Middleware protects `/dashboard/*` routes
5. Unauthenticated users redirected to login
6. Authenticated users can access dashboard

## 🛠️ Useful Commands

```bash
# View database in browser
npm run prisma:studio

# Create database migration
npm run prisma:migrate

# Generate Prisma client
npm run prisma:generate

# Create admin user
npm run db:seed
```

## 📁 Key Files

- **Login Page**: `src/app/(main)/auth/v2/login/page.tsx`
- **Register Page**: `src/app/(main)/auth/v2/register/page.tsx`
- **Login Form**: `src/app/(main)/auth/_components/login-form.tsx`
- **Register Form**: `src/app/(main)/auth/_components/register-form.tsx`
- **Auth Middleware**: `src/middleware/auth-middleware.ts`
- **JWT Utils**: `src/lib/auth.ts`
- **Password Utils**: `src/lib/password.ts`
- **Prisma Client**: `src/lib/prisma.ts`

## 🔌 API Endpoints

### POST `/api/auth/register`
Register a new user
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "securepass123",
  "firstName": "John",
  "lastName": "Doe"
}
```

### POST `/api/auth/login`
Login with credentials
```json
{
  "username": "john_doe",
  "password": "securepass123"
}
```

### POST `/api/auth/logout`
Logout (clears auth cookie)

### GET `/api/auth/me`
Get current authenticated user

## 🎨 UI Components

### Logout Button
```tsx
import { LogoutButton } from "@/components/auth/logout-button";

<LogoutButton />
```

### Current User Hook
```tsx
import { useCurrentUser } from "@/hooks/use-current-user";

function MyComponent() {
  const { user, loading, isAuthenticated } = useCurrentUser();
  
  if (loading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Not logged in</div>;
  
  return <div>Welcome, {user.username}!</div>;
}
```

## 🔒 Security Notes

- ✅ Passwords hashed with bcrypt (10 rounds)
- ✅ JWT tokens in HTTP-only cookies (XSS protection)
- ✅ Secure cookies in production (HTTPS only)
- ✅ Token expiration (7 days)
- ✅ Input validation with Zod
- ⚠️ **Change JWT_SECRET in production!**

## 🐛 Troubleshooting

**Database connection error?**
```bash
docker compose up -d
```

**Module not found errors?**
```bash
npm install
```

**Middleware not working?**
Check that `src/middleware.ts` exists (not `.disabled`)

**Token verification fails?**
Ensure `JWT_SECRET` is set in `.env`

## 📚 Next Steps

- Add email verification
- Implement password reset
- Add OAuth providers (Google, GitHub)
- Implement role-based access control
- Add 2FA support
- Add rate limiting

---

For detailed documentation, see [AUTH_SETUP.md](./AUTH_SETUP.md)
