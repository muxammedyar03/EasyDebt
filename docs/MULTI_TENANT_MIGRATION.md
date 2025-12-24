# Multi-Tenant Arxitektura Migratsiyasi

## 🎯 Asosiy Maqsad

Single-tenant tizimdan multi-tenant (Shop-based) arxitekturaga o'tish

## ✅ Bajarilgan ishlar

### 1. Database Schema (Prisma)

- ✅ **Shop** modeli qo'shildi - asosiy izolyatsiya birligi
- ✅ **User** modeliga `shop_id` va `status` (ACTIVE/BLOCKED/DEACTIVATED) qo'shildi
- ✅ Barcha biznes modellariga `shop_id` qo'shildi:
  - Debtor
  - Debt
  - Payment
  - Notification
  - AuditLog
  - Settings

## 📋 Keyingi qadamlar

### 1. Database Migration

```bash
# Yangi migration yaratish
npx prisma migrate dev --name add-multi-tenant-architecture

# Agar xatolik bo'lsa, avval reset qilish
npx prisma migrate reset
npx prisma migrate dev --name add-multi-tenant-architecture
```

### 2. Seed Data (Test uchun)

```typescript
// prisma/seed.ts yaratish kerak
const shops = [
  { name: "Do'kon 1", is_active: true },
  { name: "Do'kon 2", is_active: true },
];

const users = [
  { username: "superadmin", role: "SUPER_ADMIN", shop_id: null },
  { username: "admin1", role: "ADMIN", shop_id: 1 },
  { username: "user1", role: "USER", shop_id: 1 },
];
```

### 3. Middleware (Access Control)

```typescript
// src/middleware/shop-filter.ts
export function applyShopFilter(query: any, user: User) {
  if (user.role !== "SUPER_ADMIN" && user.shop_id) {
    query.where = {
      ...query.where,
      shop_id: user.shop_id,
    };
  }
  return query;
}
```

### 4. API Endpoints o'zgarishi

```typescript
// Avval: /api/debtors
// Endi:  /api/debtors (avtomatik shop_id filter)

// Super admin uchun:
// GET /api/admin/shops - barcha shoplar
// GET /api/admin/shops/:id/stats - shop statistikasi
// PATCH /api/admin/shops/:id - shopni block/unblock
// PATCH /api/admin/users/:id - userni block/unblock
```

### 5. Frontend o'zgarishlar

- Login sahifasida shop tanlash (agar user multiple shoplarga tegishli bo'lsa)
- Super Admin uchun shop switcher
- Shop statistikasi dashboard

### 6. Authentication Update

```typescript
// JWT payload ga shop_id qo'shish
interface JWTPayload {
  userId: number;
  username: string;
  role: UserRole;
  shopId: number | null; // NEW
  status: UserStatus; // NEW
}
```

### 7. Xavfsizlik tekshiruvlari

- [ ] Shop deactivated bo'lsa, userlar kira olmasligi kerak
- [ ] User BLOCKED bo'lsa, login qila olmasligi kerak
- [ ] Cross-shop data access yo'qligi
- [ ] Super Admin barcha shoplarga kirishi

## 🔒 Muhim Qoidalar

### Super Admin

- `shop_id = null`
- Barcha shoplarni ko'ra oladi
- Userlarni block/unblock qila oladi
- Shoplarni activate/deactivate qila oladi

### Admin

- Faqat o'z `shop_id` dagi ma'lumotlar
- Faqat USER role qo'sha oladi
- O'z shopidagi statistikani ko'ra oladi

### User

- Faqat o'z `shop_id` dagi ma'lumotlar
- Cheklangan CRUD operatsiyalar

## 🚀 Production Checklist

- [ ] Barcha API endpointlarga shop_id filter qo'shish
- [ ] AuditLog ga barcha muhim actionlarni yozish
- [ ] Rate limiting (shop-level)
- [ ] Monitoring va alerts
- [ ] Backup strategiyasi

## 💡 Kelajak uchun

1. **Subscription System** - har shop uchun tariff
2. **Multi-shop users** - bir user bir nechta shopda ishlashi
3. **Shop analytics** - AI-based insights
4. **White-label** - har shop o'z domeni
