# 🚀 Loyihani Ishga Tushirish

## 1. Paketlarni o'rnatish

```bash
npm install
```

## 2. Optimizatsiya uchun qo'shimcha paket (ixtiyoriy)

```bash
npm install @tanstack/react-query-devtools --save-dev
```

## 3. Database migratsiyasi

```bash
# Yangi migration yaratish (index'lar uchun)
npx prisma migrate dev --name add_indexes

# Yoki mavjud migration'ni ishlatish
npx prisma migrate deploy
```

## 4. Prisma Client yangilash

```bash
npx prisma generate
```

## 5. Development server

```bash
npm run dev
```

## 6. Production build

```bash
npm run build
npm run start
```

## Optimizatsiya Natijalari

### Database

- ✅ Parallel queries (Promise.all)
- ✅ Optimized select statements
- ✅ Database indexes qo'shildi
- ✅ Query result limiting

### Frontend

- ✅ React Query cache konfiguratsiyasi
- ✅ Image optimization
- ✅ Bundle size optimization
- ✅ Security headers

### Performance

- ✅ Cache utilities
- ✅ Performance monitoring
- ✅ Slow query detection

## Keyingi Qadamlar

1. **React Query Devtools qo'shish** (development uchun)
2. **Providers qo'shish** layout.tsx ga
3. **Migration ishlatish** database indexes uchun
4. **Performance test** qilish

Batafsil ma'lumot uchun `OPTIMIZATION.md` faylini ko'ring.
