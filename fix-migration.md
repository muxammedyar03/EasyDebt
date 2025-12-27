# Migration Muammosini Hal Qilish

## Muammo

```
The `20251119095002_init` migration started at 2025-11-19 10:49:07.488798 UTC failed
```

## Server'da Bajaring

### Option 1: Failed Migration'ni Applied Deb Belgilash (Tezkor)

```bash
# Server'da
cd /var/www/EasyDebt

# Failed migration'ni resolved qilish
docker compose -f docker-compose.prod.yml run --rm migrate sh -c "npx prisma migrate resolve --applied 20251119095002_init"

# Qayta migration deploy
docker compose -f docker-compose.prod.yml run --rm migrate sh -c "npx prisma migrate deploy"

# Container'larni ishga tushirish
docker compose -f docker-compose.prod.yml up -d
```

### Option 2: Migration'ni Rollback va Qayta Qo'llash

```bash
# Migration'ni rolled back deb belgilash
docker compose -f docker-compose.prod.yml run --rm migrate sh -c "npx prisma migrate resolve --rolled-back 20251119095002_init"

# Qayta deploy
docker compose -f docker-compose.prod.yml run --rm migrate sh -c "npx prisma migrate deploy"

# Container'larni ishga tushirish
docker compose -f docker-compose.prod.yml up -d
```

### Option 3: Database'ni Schema bilan Sync Qilish (Xavfli - Data Loss!)

⚠️ **FAQAT AGAR DATA MUHIM EMAS BO'LSA!**

```bash
# Database'ni schema bilan sync qilish
docker compose -f docker-compose.prod.yml run --rm migrate sh -c "npx prisma db push --accept-data-loss --skip-generate"

# Migration history'ni tozalash
docker compose -f docker-compose.prod.yml exec postgres psql -U admin -d debt_management -c "DELETE FROM _prisma_migrations WHERE migration_name = '20251119095002_init';"

# Qayta migration deploy
docker compose -f docker-compose.prod.yml run --rm migrate sh -c "npx prisma migrate deploy"

# Container'larni ishga tushirish
docker compose -f docker-compose.prod.yml up -d
```

## Tavsiya: Option 1 (Tezkor va Xavfsiz)

### BARCHA Failed Migration'larni Resolve Qilish

```bash
cd /var/www/EasyDebt

# 1. Birinchi failed migration
docker compose -f docker-compose.prod.yml run --rm migrate sh -c "npx prisma migrate resolve --applied 20251119095002_init"

# 2. Ikkinchi failed migration
docker compose -f docker-compose.prod.yml run --rm migrate sh -c "npx prisma migrate resolve --applied 20251224203706_init_date"

# 3. Yana migration deploy qilib ko'ring
docker compose -f docker-compose.prod.yml run --rm migrate sh -c "npx prisma migrate deploy"

# 4. Agar yana failed migration bo'lsa, uni ham resolve qiling
# docker compose -f docker-compose.prod.yml run --rm migrate sh -c "npx prisma migrate resolve --applied MIGRATION_NAME"

# 5. Container'larni ishga tushirish
docker compose -f docker-compose.prod.yml up -d
```

### Yoki Barcha Migration'larni Bir Vaqtda

```bash
cd /var/www/EasyDebt

# Barcha failed migration'larni resolve qilish
docker compose -f docker-compose.prod.yml run --rm migrate sh -c "npx prisma migrate resolve --applied 20251119095002_init"
docker compose -f docker-compose.prod.yml run --rm migrate sh -c "npx prisma migrate resolve --applied 20251224203706_init_date"

# Uchinchi migration ham bo'lsa (agar xato bersa)
docker compose -f docker-compose.prod.yml run --rm migrate sh -c "npx prisma migrate resolve --applied 20251225113629_add_external_ids_and_import_history"
docker compose -f docker-compose.prod.yml run --rm migrate sh -c "npx prisma migrate resolve --applied 20251225150703_add_description_to_audit_log"

# Keyin container'larni ishga tushirish
docker compose -f docker-compose.prod.yml up -d
```

Bu migration'lar allaqachon qo'llanilgan deb belgilaydi va keyingi migration'lar ishlaydi.
