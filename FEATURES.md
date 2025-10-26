# 🎯 EasyDebt - Yangi Funksiyalar

## ✅ Qo'shilgan Funksiyalar

### 1. 📱 Mobile Optimizatsiya

- **Card View**: Mobileda table o'rniga qulay card ko'rinishi
- **Tez Qidiruv**: Debounced search input (500ms)
- **Quick Actions**: Har bir qarzdor uchun:
  - ➕ Qarz qo'shish (2 step dialog)
  - 💰 To'lov qo'shish (2 step dialog)
  - Telefon raqamiga bosish orqali qo'ng'iroq
- **Responsive Design**: Desktop'da table, mobile'da card
- **Optimized Filters**: Mobile uchun moslashtirilgan filterlar
- **Auto-refresh**: Qarz/to'lov qo'shgandan keyin avtomatik yangilanadi

**Fayllar:**

- `src/components/mobile/debtor-card.tsx` - Mobile card komponenti
- `src/components/mobile/quick-add-debt.tsx` - Tez qarz qo'shish dialog
- `src/components/mobile/quick-add-payment.tsx` - Tez to'lov qo'shish dialog
- `src/app/(main)/dashboard/debtors/_components/debtors-table.tsx` - Responsive table/card view

---

### 2. ⏰ Muddati O'tgan To'lovlar Tizimi

- **45 Kun Qoidasi**: Oxirgi to'lovdan 45 kun o'tgach avtomatik "Muddati o'tgan" status
- **Avtomatik Tekshirish**: Cron job orqali muntazam tekshirish
- **Notification Tizimi**: Muddati o'tgan qarzdorlar haqida bildirishnoma
- **Status Badge**: Qarzdorlar ro'yxatida maxsus badge

**Database O'zgarishlari:**

```prisma
model Debtor {
  last_payment_date DateTime?
  is_overdue        Boolean   @default(false)
}

model Notification {
  id         Int              @id @default(autoincrement())
  user_id    Int?
  debtor_id  Int?
  type       NotificationType
  title      String
  message    String
  is_read    Boolean          @default(false)
  created_at DateTime         @default(now())
}
```

**API Endpoints:**

- `GET /api/cron/check-overdue` - Muddati o'tganlarni tekshirish
- `GET /api/notifications` - Bildirishnomalarni olish
- `POST /api/notifications` - Bildirishnomalarni boshqarish
- `PATCH /api/notifications/[id]` - O'qilgan deb belgilash

**Fayllar:**

- `src/lib/overdue-checker.ts`
- `src/lib/notifications.ts`
- `src/components/dashboard/overdue-debtors-card.tsx`

---

### 3. 📊 Dashboard Yaxshilash

#### a) Risk Tahlili

- **Yuqori Risk**: Limitdan oshgan qarzdorlar
- **Muddati O'tgan**: 45 kundan ortiq to'lov qilmaganlar
- **O'rta Risk**: Oddiy qarzdorlar
- **Past Risk**: To'langan qarzdorlar
- **Progress Bar**: Har bir kategoriya uchun vizual ko'rsatkich

#### b) Trend Tahlili

- **Oylik Taqqoslash**: Joriy oy vs o'tgan oy
- **Metrikalar**:
  - To'lovlar summasi
  - Qarzlar summasi
  - To'lovlar soni
- **Trend Ko'rsatkichlari**: ⬆️ ⬇️ ➖ ikonlar bilan

**Fayllar:**

- `src/components/dashboard/risk-analysis-card.tsx` - Risk tahlili komponenti
- `src/components/dashboard/trend-analysis.tsx` - Trend tahlili komponenti
- `src/app/(main)/dashboard/default/page.tsx` - Dashboard page (yangilandi)

---

### 4. 📝 Audit Log Tizimi

- **Barcha Harakatlar**: CREATE, UPDATE, DELETE, LOGIN, LOGOUT, PAYMENT_ADDED, DEBT_ADDED
- **Kuzatuv Ma'lumotlari**:
  - Foydalanuvchi (kim)
  - Harakat turi (nima qildi)
  - Entity (qaysi obyekt)
  - Eski va yangi qiymatlar
  - IP address
  - User agent
  - Vaqt belgisi
- **Maxsus Sahifa**: `/dashboard/audit-logs` - barcha harakatlar tarixi
- **Mobile Responsive**: Card view mobileda, table desktop'da

**Database:**

```prisma
model AuditLog {
  id          Int      @id @default(autoincrement())
  user_id     Int?
  action      String
  entity_type String
  entity_id   Int?
  old_value   Json?
  new_value   Json?
  ip_address  String?
  user_agent  String?
  created_at  DateTime @default(now())
}
```

**API Endpoints:**

- `GET /api/audit-logs` - Audit loglarni olish

**Fayllar:**

- `src/lib/audit.ts` - Audit log helper funksiyalari
- `src/app/api/audit-logs/route.ts` - API endpoint
- `src/app/(main)/dashboard/audit-logs/page.tsx` - Audit log sahifasi
- `src/app/(main)/dashboard/audit-logs/_components/audit-logs-table.tsx` - Audit log table komponenti
- `src/app/api/debts/route.ts` (audit log qo'shildi)
- `src/app/api/payments/route.ts` (audit log qo'shildi)
- `src/navigation/sidebar/sidebar-items.ts` (sidebar'ga qo'shildi)

---

## 🚀 Qanday Ishlatish

### Muddati O'tganlarni Tekshirish

```bash
# Manual tekshirish
curl http://localhost:3000/api/cron/check-overdue

# Cron job sozlash (Linux/Mac)
# Har kuni soat 9:00 da
0 9 * * * curl http://localhost:3000/api/cron/check-overdue
```

### Database Migration

```bash
# Migration allaqachon qo'llangan
npx prisma migrate dev --name add_overdue_audit_notifications

# Prisma Client yangilash
npx prisma generate
```

### Development

```bash
npm run dev
```

---

## 📱 Mobile Funksiyalar

### Qarzdorlar Sahifasi

- **Tez Qidiruv**: Ism, familiya yoki telefon bo'yicha
- **Card View**: Har bir qarzdor uchun:
  - Ism va status badge
  - Telefon raqam (bosish orqali qo'ng'iroq)
  - Manzil
  - Qarz summasi
  - **Qarz qo'shish** tugmasi
  - **To'lov qo'shish** tugmasi

### Quick Add Dialogs

- **Minimal Steps**: 2-3 ta maydon
- **Auto Focus**: Birinchi inputga avtomatik focus
- **Numeric Keyboard**: Summa uchun raqamli klaviatura
- **Validation**: Real-time validatsiya

---

## 📊 Dashboard Yangi Ko'rinish

```
┌─────────────────────────────────────────┐
│  Qarzdorlar Jadvali                     │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  ⚠️ Muddati O'tgan To'lovlar (5)       │
│  - Alisher Valiyev (120 kun)            │
│  - Nodira Karimova (95 kun)             │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Statistika Kartochkalari               │
└─────────────────────────────────────────┘

┌──────────────────┬──────────────────────┐
│  Risk Tahlili    │  Trend Tahlili       │
│  - Yuqori: 12%   │  To'lovlar: ⬆️ 15%  │
│  - Muddati: 8%   │  Qarzlar: ⬇️ 5%     │
│  - O'rta: 45%    │  Soni: ⬆️ 23%       │
│  - Past: 35%     │                      │
└──────────────────┴──────────────────────┘

┌─────────────────────────────────────────┐
│  Payment Heatmap (90 kun)               │
│  [GitHub-style calendar]                │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  To'lovlar Grafigi                      │
└─────────────────────────────────────────┘
```

---

## 🔐 Security

### Audit Log

- Barcha muhim harakatlar yozib olinadi
- IP address va User Agent saqlanadi
- Faqat adminlar ko'ra oladi

### Notifications

- Foydalanuvchi o'z bildirishnomalarini ko'radi
- Muddati o'tgan qarzdorlar haqida avtomatik ogohlantirish

---

## 🎨 UI/UX Yaxshilashlar

1. **Mobile-First**: Barcha komponentlar mobile uchun optimallashtirilgan
2. **Dark Mode Support**: Barcha yangi komponentlar dark mode'ni qo'llab-quvvatlaydi
3. **Loading States**: Barcha async operatsiyalar uchun loading ko'rsatkichlari
4. **Error Handling**: Foydalanuvchiga tushunarli xato xabarlari
5. **Accessibility**: Keyboard navigation va screen reader support

---

## 📈 Performance

- **Debounced Search**: 500ms delay bilan qidiruv
- **Optimized Queries**: Prisma indexes qo'shildi
- **Lazy Loading**: Faqat kerakli ma'lumotlar yuklanadi
- **Caching**: React Query cache strategiyasi

---

## 🔄 Keyingi Qadamlar

### Tavsiya Qilinadigan Qo'shimcha Funksiyalar:

1. **SMS/Telegram Bildirishnomalar**
2. **PDF Hisobotlar**
3. **Excel Import/Export** (Export allaqachon mavjud)
4. **Multi-Currency Support**
5. **QR Kod To'lovlari**
6. **PWA (Progressive Web App)**

   ***

## 📞 Support

Savollar yoki muammolar bo'lsa:

- GitHub Issues
- Email: support@easydebt.uz

---

## 💸 Смета (Mijoz uchun tijoriy taklif)

### 1) Ish hajmi (Scope)

- **Core modul**: `Qarzdorlar`, `Qarzlar`, `To'lovlar`, `Foydalanuvchilar`, `Auth`
- **Mobile optimizatsiya**: Card view, quick actions, responsive filterlar
- **Dashboard**: Risk tahlili, trend tahlili, statistik kartalar
- **Audit Log**: Harakatlar tarixi (IP, User Agent, vaqt, kim-nima)
- **Overdue tizimi**: 45 kun qoidasi, cron tekshirish, bildirishnomalar
- **Export/Import**: (Export mavjud), import minimal (CSV) — ixtiyoriy
- **Role/Permissions**: Admin, User
- **Security & Performance**: Validatsiya, rate-limit, caching strategiyasi

### 2) Muddat (Timeline)

- **1-hafta**: Arxitektura, autentifikatsiya, asosiy CRUD (Debtors/Debts/Payments)
- **2-hafta**: Mobile UI, dashboard metrikalar, optimizatsiya
- **3-hafta**: Audit Log, Overdue cron, Notifications, testlar
- **4-hafta**: Yakuniy polishing, deploy, hujjatlar, trening

Umumiy: **3–4 hafta** (mijozdan feedback sikllariga qarab)

### 3) Narx (Cost breakdown)

- **Backend (API + Prisma + Cron + Audit)**: 40 soat
- **Frontend (UI/UX + Mobile + Dashboard)**: 36 soat
- **QA/Test & Fix**: 12 soat
- **PM/Analitika/Hujjat**: 8 soat
- **Deploy & CI/CD sozlamalari**: 6 soat

Jami: **102 soat**

- **Soatlik stavka (namuna)**: $20/soat
- **Jami qiymat (taxminiy)**: 102 × $20 = **$2,040**

Eslatma: Bu dastlabki baho. Yakuniy narx mijozning qo'shimcha talablariga (masalan, import avtomatsiyalari, ko'p-valyuta, PWA, SMS/Telegram integratsiya) qarab o'zgarishi mumkin.

### 4) Ekspluatatsiya va Hosting

- **VPS/Hosting**: $8–20/oy (DigitalOcean/Hetzner)

### 5) Ixtiyoriy qo'shimchalar (Add-ons)

- **SMS/Telegram bildirishnomalar**: $200–400 (bir martalik dev) + trafik narxi
- **PDF hisobotlar**: $150–300
- **Excel import** (murakkab mapping bilan): $250–500
- **Multi-currency**: $200–400
- **PWA/Offline**: $200–400

### 6) Kafolat va Qo'llab-quvvatlash

- **Bug-fix kafolat**: 30 kun (prod relizdan keyin)
- **Qo'llab-quvvatlash**: 10 soat/oy — $200 (ixtiyoriy, SLA bilan)

---

Agar ushbu Смета Sizga ma'qul bo'lsa, keyingi qadamlar: texnik topshiriqni (TТ) yakunlash, calendar rejasi, va shartnoma.
