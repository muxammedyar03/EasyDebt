# 🏪 Shop Switching Architecture - Professional Multi-Tenant Pattern

## ✅ Bajarilgan Ishlar

### 1. JWT Token Architecture

```typescript
// SUPER_ADMIN uchun
{
  userId: 1,
  role: "SUPER_ADMIN",
  shopId: null,           // permanent null
  activeShopId: 3,        // currently selected shop
  status: "ACTIVE"
}

// ADMIN/USER uchun
{
  userId: 12,
  role: "ADMIN",
  shopId: 3,              // permanent shop
  activeShopId: undefined, // yo'q
  status: "ACTIVE"
}
```

**Key Point:** SUPER_ADMIN `activeShopId` ishlatadi, boshqalar `shopId`.

### 2. Shop Context Helper (`/src/lib/shop-context.ts`)

```typescript
getEffectiveShopId(session); // Returns current shop context
canSwitchShops(role); // Only SUPER_ADMIN = true
buildShopFilter(session); // Auto shop_id filter for queries
needsShopSelection(session); // Check if shop selection needed
```

### 3. Change Shop Flow

#### API Endpoint: `/api/auth/change-shop`

- **POST** - Shop o'zgartirish
- **GET** - Barcha shoplarni ko'rish (stats bilan)

#### Security:

- Faqat SUPER_ADMIN access
- JWT token yangilanadi
- AuditLog yoziladi
- No re-login required ✅

### 4. UI Components

#### Shop Switcher (Sidebar)

- **SUPER_ADMIN:** Clickable dropdown → `/change-shop`
- **ADMIN/USER:** Static shop name display
- **Location:** Sidebar header, APP name ostida

#### Change Shop Page

- Card layout barcha shoplar
- Shop statistics ko'rsatiladi
- Active/Inactive status badges
- One-click switching

### 5. Data Filtering Pattern

```typescript
// Har bir query'da
const effectiveShopId = getEffectiveShopId(session);

// Prisma query
const data = await prisma.debtor.findMany({
  where: {
    ...otherFilters,
    shop_id: effectiveShopId, // Auto filter
  },
});
```

## 🔐 Security Features

1. **Role-based Access**
   - Change shop page faqat SUPER_ADMIN
   - Route protection layout orqali
2. **Shop Isolation**
   - Har query shop_id bilan filter
   - Cross-shop data leak yo'q
3. **Audit Trail**
   - Shop change har safar log qilinadi
   - User actions tracked

## 🎯 UX Principles

1. **Zero Friction**
   - No re-login for shop switch
   - Instant context change
   - Page auto-refresh
2. **Clear Visual Feedback**
   - Current shop always visible
   - Active shop highlighted
   - Inactive shops marked
3. **Consistent Behavior**
   - Same data structure everywhere
   - Predictable filtering
   - No surprises

## 📁 File Structure

```
/src/
├── lib/
│   ├── auth.ts                    # JWT with activeShopId
│   └── shop-context.ts            # Shop helper functions
│
├── app/
│   ├── api/auth/
│   │   └── change-shop/
│   │       └── route.ts           # Shop switching API
│   │
│   └── (main)/
│       ├── change-shop/
│       │   ├── page.tsx           # Shop selection UI
│       │   └── layout.tsx         # Route protection
│       │
│       └── dashboard/
│           ├── layout.tsx         # Shop context provider
│           └── _components/
│               └── sidebar/
│                   └── shop-switcher.tsx  # Shop display
```

## 🚀 Usage Examples

### Backend Query

```typescript
// Automatic shop filtering
const session = await getSession();
const shopId = getEffectiveShopId(session);

const debtors = await prisma.debtor.findMany({
  where: { shop_id: shopId },
});
```

### Frontend Display

```tsx
// Shop name in sidebar
<ShopSwitcher currentShop={currentShop} role={userRole} needsSelection={needsShopSelection} />
```

### Shop Switch

```typescript
// API call to change shop
await fetch("/api/auth/change-shop", {
  method: "POST",
  body: JSON.stringify({ shopId: 5 }),
});
// Auto refresh with new context
```

## 🔄 Data Flow

1. **Login**
   - SUPER_ADMIN gets first active shop as default
   - JWT includes activeShopId
2. **Shop Switch**
   - POST /api/auth/change-shop
   - New JWT with updated activeShopId
   - Cookie updated
   - Page refreshes
3. **Data Access**
   - getEffectiveShopId() determines context
   - All queries filtered by shop_id
   - Consistent data isolation

## ⚠️ Edge Cases Handled

1. **No Active Shops**
   - SUPER_ADMIN sees "Select Shop" prompt
   - needsShopSelection = true
2. **Shop Deactivated**
   - SUPER_ADMIN can still access
   - Warning shown
   - ADMIN/USER blocked
3. **Direct URL Access**
   - /change-shop protected by layout
   - Non-SUPER_ADMIN → redirect to /dashboard

## 🎨 UI/UX Details

### Sidebar Shop Display

- **Position:** Below app name, above navigation
- **SUPER_ADMIN:** Dropdown with chevron
- **Others:** Static text with building icon
- **Style:** Consistent with sidebar theme

### Change Shop Page

- **Layout:** Responsive grid (1-3 columns)
- **Card Content:**
  - Shop name & address
  - User count
  - Debtor count
  - Total debt sum
- **Actions:** Single "Switch" button
- **Feedback:** Loading state, success toast

## 📈 Future Enhancements

1. **Shop Search/Filter** - Large org uchun
2. **Favorite Shops** - Quick access
3. **Shop Groups** - Regional management
4. **View-only Mode** - Audit without edit
5. **Impersonation** - Support mode

## 🔑 Key Decisions

1. **activeShopId in JWT** - Server-side truth
2. **No URL-based shop** - Security first
3. **Page refresh on switch** - Clean state
4. **Audit everything** - Compliance ready
5. **Simple UI** - Less confusion

---

**Architecture:** Professional SaaS Multi-tenant Pattern
**Security:** Role-based + Context-based
**UX:** Zero-friction shop switching
**Status:** ✅ Production Ready
