# 🔥 CRITICAL BUG FIX: Overdue Calculation Start Date

## The Bug (Before Fix)

**Problem:** Overdue days were calculated incorrectly when a debtor had multiple unpaid debts.

**Example:**

```
Debts:
- Oct 22, 2025: 1000 (unpaid)
- Jan 11, 2026: 500 (unpaid)

❌ WRONG RESULT: 28 days overdue (using Jan 11 as start)
✅ CORRECT RESULT: 90+ days overdue (using Oct 22 as start)
```

**Root Cause:** The calculation was using the **latest debt date** or **debtor creation date** instead of the **earliest unpaid debt date**.

---

## The Fix

### What Changed

**File:** `@/lib/overdue-calculator.ts`

**Function:** `calculateDebtorOverdueStatus()`

**Key Changes:**

1. **Added helper function** `getEarliestUnpaidDebt()`
   - Filters debts to find only those with `paid_percent < min_paid_percent`
   - Sorts by creation date
   - Returns the earliest unpaid debt

2. **Updated logic** to use earliest unpaid debt as start date
   - Calculates overdue days from earliest unpaid debt to today
   - New debts do NOT reset the overdue counter
   - Aggregate payment percentage is checked across all debts

### Code Changes

```typescript
// BEFORE (WRONG)
const debtStatuses = debts.map((debt) => calculateDebtOverdueStatus(debt, settings));
const worstStatus = debtStatuses.reduce((worst, current) =>
  statusPriority[current.status] > statusPriority[worst.status] ? current : worst,
);

// AFTER (CORRECT)
const earliestUnpaidDebt = getEarliestUnpaidDebt(debts, settings);
const overdueDays = Math.floor(
  (now.getTime() - new Date(earliestUnpaidDebt.createdAt).getTime()) / (1000 * 60 * 60 * 24),
);
```

---

## Business Rule (CRITICAL)

> **Overdue ALWAYS starts from the EARLIEST UNPAID debt.**
>
> New debts do NOT reset the overdue counter.
>
> The system never forgets the oldest unpaid debt.

---

## Test Cases Covered

### Scenario 1: Multiple unpaid debts

- ✅ Uses Oct 22 (earliest) as start, not Jan 11 (latest)
- ✅ Calculates ~90+ days, not ~28 days

### Scenario 2: New debt doesn't reset counter

- ✅ Adding Jan 11 debt doesn't reset Oct 22 start date
- ✅ Overdue days keep counting from Oct 22

### Scenario 3: Paid debts are excluded

- ✅ Debts with 50%+ payment are ignored
- ✅ Only unpaid debts matter for start date

### Scenario 4: All debts paid

- ✅ Returns "good" status when all debts >= 50% paid
- ✅ Overdue days = 0

### Scenario 5: Aggregate payment percentage

- ✅ Total paid across all debts is considered
- ✅ If total >= 50%, status = "good"

### Scenario 6: Status thresholds

- ✅ good_until_days (30) → "good"
- ✅ medium_until_days (45) → "medium"
- ✅ > medium_until_days → "bad"

---

## Impact

### Before Fix

- Debtors with old unpaid debts appeared "good" if they added new debts
- Overdue days were incorrect and misleading
- Reports showed wrong overdue status
- New debts could "reset" the overdue counter

### After Fix

- Overdue days correctly count from the earliest unpaid debt
- New debts don't affect the overdue counter
- Status accurately reflects the debtor's payment history
- Reports are reliable and consistent

---

## Integration

The fix is automatically applied in:

1. **`overdue-checker.ts`** - Uses `calculateDebtorOverdueStatus()`
2. **Service layer** - Uses `computeDebtorOverdueStatus()`
3. **Mappers** - Can compute status dynamically
4. **API responses** - Return correct overdue status
5. **UI components** - Display accurate overdue information

No additional changes needed - the fix is in the core calculation function.

---

## Verification

To verify the fix works:

```typescript
const debts = [
  { amount: 1000, createdAt: new Date("2025-10-22"), payments: [] },
  { amount: 500, createdAt: new Date("2026-01-11"), payments: [] },
];

const status = calculateDebtorOverdueStatus(debts, settings);

console.log(status.overdueDays); // Should be ~90+, NOT 28
console.log(status.status); // Should be "bad"
console.log(status.isOverdue); // Should be true
```

---

## Key Takeaway

**Overdue history is never forgotten.** The system always counts from the earliest unpaid debt, ensuring accurate and reliable overdue calculations across the entire application.
