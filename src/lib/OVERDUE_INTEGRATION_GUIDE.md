# Overdue Calculation System - Integration Guide

## Overview

The overdue calculation system has been refactored to compute status **dynamically** from facts (debts, payments, settings) instead of storing computed values in the database.

**Key Benefits:**

- ✅ Settings changes instantly reflected across the app
- ✅ No database migrations needed
- ✅ Consistent calculations everywhere
- ✅ Handles partial payments correctly
- ✅ Single source of truth: `overdue-calculator.ts`

---

## Architecture

### Core Files

1. **`@/lib/overdue-calculator.ts`** - Single source of truth
   - `calculateDebtOverdueStatus(debt, settings)` - Single debt
   - `calculateDebtorOverdueStatus(debts, settings)` - Multiple debts
   - `computeDebtorOverdueStatus(debts, payments, settings)` - Helper with domain types
   - `parseOverdueSettings(record)` - Parse DB settings
   - `getDefaultOverdueSettings()` - Defaults

2. **`@/lib/overdue-checker.ts`** - Cron/background jobs
   - `loadOverdueSettings()` - Load from DB
   - `checkOverdueDebtors()` - Mark debtors as overdue
   - `reEvaluateOverdueDebtors()` - Called when settings change

3. **`@/lib/rating-calculator.ts`** - Payment rating calculations
   - `calculatePaymentRating()` - For UI display
   - `calculateAverageDaysBetweenDebtAndPayment()` - For service layer
   - `calculateCustomerRating()` - For service layer

---

## Integration Steps

### Step 1: Service Layer (debtor.service.ts)

Add overdue calculation when returning debtor data:

```typescript
import {
  computeDebtorOverdueStatus,
  parseOverdueSettings,
  getDefaultOverdueSettings,
  type OverdueSettings,
} from "@/lib/overdue-calculator";

export class DebtorService {
  private async getOverdueSettings(): Promise<OverdueSettings> {
    const settings = await prisma.settings.findMany({
      where: {
        key: {
          in: ["good_until_days", "medium_until_days", "min_paid_percent"],
        },
      },
    });

    const settingsRecord = settings.reduce(
      (acc, s) => {
        acc[s.key] = s.value;
        return acc;
      },
      {} as Record<string, string>,
    );

    return Object.keys(settingsRecord).length > 0 ? parseOverdueSettings(settingsRecord) : getDefaultOverdueSettings();
  }

  async findById(id: number, includeRelations = false): Promise<DebtorDomain | null> {
    const settings = await this.getOverdueSettings();

    const debtor = await prisma.debtor.findUnique({
      where: { id },
      include: {
        debts: includeRelations,
        payments: includeRelations,
        creator: includeRelations,
      },
    });

    if (!debtor) return null;

    const domainDebtor = prismaToDomainDebtor(debtor, {
      debtLimit: 2000000,
      overdueDays: settings.mediumUntilDays,
    });

    // Compute overdue status dynamically
    if (domainDebtor.debts && domainDebtor.payments) {
      const overdueStatus = computeDebtorOverdueStatus(domainDebtor.debts, domainDebtor.payments, settings);

      // Add to domain for context/calculations
      domainDebtor.overdueStatus = overdueStatus;
    }

    return domainDebtor;
  }
}
```

### Step 2: Mapper Layer (debtor.mapper.ts)

Update mapper to include computed overdue status:

```typescript
import { computeDebtorOverdueStatus, type OverdueSettings } from "@/lib/overdue-calculator";

export function prismaToDomainDebtor(
  prismaDebtor: Debtor & {
    debts?: Debt[];
    payments?: Payment[];
    creator?: User;
  },
  options?: {
    debtLimit?: number;
    overdueDays?: number;
    overdueSettings?: OverdueSettings;
  },
): DebtorDomain {
  // ... existing code ...

  // Compute overdue status if settings provided
  let overdueStatus = undefined;
  if (options?.overdueSettings && prismaDebtor.debts && prismaDebtor.payments) {
    const domainDebts = prismaDebtor.debts.map(prismaToDomainDebt);
    const domainPayments = prismaDebtor.payments.map(prismaToDomainPayment);

    overdueStatus = computeDebtorOverdueStatus(domainDebts, domainPayments, options.overdueSettings);
  }

  return {
    // ... existing fields ...
    overdueStatus,
  };
}
```

### Step 3: API Endpoints

Return computed status instead of stored value:

```typescript
// GET /api/debtors/:id
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const debtorId = parseInt(params.id, 10);
  const debtor = await debtorService.findById(debtorId, true);

  if (!debtor) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Return computed status
  return NextResponse.json({
    ...debtor,
    status: debtor.overdueStatus?.status,
    isOverdue: debtor.overdueStatus?.isOverdue,
    overdueDays: debtor.overdueStatus?.overdueDays,
  });
}
```

### Step 4: UI Components

Use computed status from context/props:

```typescript
// In debtor-context.tsx
const overdueStatus = React.useMemo(() => {
  if (!debtor.debts || !debtor.payments) return null;

  const settings = loadOverdueSettings(); // Load from context or props
  return computeDebtorOverdueStatus(debtor.debts, debtor.payments, settings);
}, [debtor.debts, debtor.payments]);

// In components
<div className={overdueStatus?.isOverdue ? "text-red-600" : "text-green-600"}>
  Status: {overdueStatus?.status}
</div>
```

---

## Settings Management

### Database Schema

Add these columns to `settings` table:

```sql
INSERT INTO settings (key, value) VALUES
('good_until_days', '30'),
('medium_until_days', '45'),
('min_paid_percent', '0.5');
```

### Settings API

Update `/api/settings` to trigger re-evaluation:

```typescript
export async function POST(request: NextRequest) {
  const { key, value } = await request.json();

  // Update setting
  await prisma.settings.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });

  // Re-evaluate overdue debtors if overdue-related setting changed
  if (["good_until_days", "medium_until_days", "min_paid_percent"].includes(key)) {
    await reEvaluateOverdueDebtors();
    revalidatePath("/dashboard");
  }

  return NextResponse.json({ success: true });
}
```

---

## Business Rules Reference

### Overdue Days Calculation (CRITICAL)

**🔥 RULE: Overdue ALWAYS starts from the EARLIEST UNPAID debt**

```
1. Filter debts: keep only those with paid_percent < min_paid_percent
2. Find the earliest (oldest) unpaid debt
3. Count days from that earliest unpaid debt to today
4. New debts do NOT reset the overdue counter
```

**Example:**

```
Debts:
- Oct 22, 2025: 1000 (unpaid)
- Jan 11, 2026: 500 (unpaid)

Start date = Oct 22 (earliest unpaid)
Overdue days = days from Oct 22 to today (~90+ days)
Status = "bad" (isOverdue = true)

❌ WRONG: Using Jan 11 as start (would give ~28 days)
✅ RIGHT: Using Oct 22 as start (gives ~90+ days)
```

### Status Logic

```typescript
if (paidPercent >= minPaidPercent) {
  status = "good";
  isOverdue = false;
} else if (overdueDays <= goodUntilDays) {
  status = "good";
  isOverdue = false;
} else if (overdueDays <= mediumUntilDays) {
  status = "medium";
  isOverdue = false;
} else {
  status = "bad";
  isOverdue = true;
}
```

### Partial Payments

- Only first moment when threshold reached matters
- Overdue days stop increasing after threshold
- Status doesn't restart for same debt

---

## Testing Scenarios

### Scenario 1: Debt with no payments

```
debt.amount = 1000
debt.created_at = 2024-01-01
payments = []
settings = { goodUntilDays: 30, mediumUntilDays: 45, minPaidPercent: 0.5 }

Today = 2024-02-20 (50 days later)

Result:
- overdueDays = 50
- paidPercent = 0%
- status = "bad"
- isOverdue = true
```

### Scenario 2: Debt with partial payment reaching threshold

```
debt.amount = 1000
debt.created_at = 2024-01-01
payments = [
  { amount: 300, createdAt: 2024-01-10 },
  { amount: 300, createdAt: 2024-01-20 } // Total = 600 (60%)
]
settings = { minPaidPercent: 0.5 }

Result:
- overdueDays = 19 (days from debt creation to when 50% was reached)
- paidPercent = 60%
- status = "good"
- isOverdue = false
```

### Scenario 3: Settings change

```
Before:
- mediumUntilDays = 45
- Debtor with 50 days overdue = "bad" (isOverdue = true)

After settings change to mediumUntilDays = 60:
- reEvaluateOverdueDebtors() is called
- Same debtor with 50 days overdue = "medium" (isOverdue = false)
```

---

## Migration Checklist

- [ ] Add `good_until_days`, `medium_until_days`, `min_paid_percent` to settings table
- [ ] Update `debtor.service.ts` to load and use settings
- [ ] Update `debtor.mapper.ts` to compute overdue status
- [ ] Update API endpoints to return computed status
- [ ] Update UI components to use computed status
- [ ] Update settings API to call `reEvaluateOverdueDebtors()`
- [ ] Test with various payment scenarios
- [ ] Remove any hardcoded overdue day values (use settings instead)

---

## Key Points

1. **Database**: `is_overdue` column still exists for quick filtering, but value is always computed
2. **No Migrations**: Settings changes don't require DB updates
3. **Single Source of Truth**: All calculations in `overdue-calculator.ts`
4. **Dynamic**: Status updates instantly when settings change
5. **Consistent**: Same logic everywhere in the app
