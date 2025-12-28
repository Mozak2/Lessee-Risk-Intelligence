# Multi-Currency Portfolio Support

## Summary
Implemented multi-currency portfolio risk calculations without FX conversion. Each currency group is analyzed independently with its own risk metrics and concentration penalties.

## Changes Made

### 1. Portfolio Risk Engine (`lib/portfolio-risk.ts`)
- **New Interface**: `CurrencyRiskResult` - Contains risk metrics for a single currency
- **Updated Interface**: `PortfolioRiskResult` - Now includes `perCurrency` map and `currencies` array
- **Risk Calculation**: Groups exposures by currency and calculates separately:
  - Total exposure per currency
  - Base risk (weighted average within currency)
  - Concentration penalty (calculated within each currency, not across)
  - Adjusted risk (base + penalty, capped at 100)
  - Bucket totals (low/medium/high) per currency
  - Sorted exposure rows per currency

### 2. Portfolio Page UI (`app/portfolios/[id]/page.tsx`)
- **Multi-Currency Layout**: When portfolio has multiple currencies, displays:
  - Separate sections for each currency with currency badge
  - Risk metrics per currency (base, adjusted, bucket)
  - Concentration warnings per currency
  - Exposure buckets per currency
  - Note: "Exposure is shown by currency. FX conversion is not applied in this MVP."

- **Single-Currency Layout**: Preserved compact layout when portfolio has only one currency
  - Maintains existing UI appearance for backwards compatibility

### 3. Test Suite (`lib/__tests__/portfolio-risk-multicurrency.test.ts`)
Created tests covering:
- Separate total calculations for USD and EUR
- Concentration penalty per currency (not mixed)
- Single-currency portfolio detection
- Bucket grouping per currency

## Features

### Multi-Currency Display
- **Currency Badge**: Each currency section has a colored badge (USD, EUR, GBP, etc.)
- **Independent Metrics**: Risk scores calculated separately per currency
- **Concentration Analysis**: Concentration penalty applies within each currency group
- **No FX Conversion**: Values displayed in original currency - no conversion applied

### Backward Compatibility
- Legacy fields maintained in `PortfolioRiskResult` for existing code
- Single-currency portfolios render with original compact layout
- API structure unchanged (enhanced, not replaced)

## User Experience

### Single Currency Portfolio
```
Total Exposure: $10.5M USD
Base Risk: 45 | Adjusted Risk: 50 | Risk Bucket: Medium
Airlines: 5

[Buckets: Low/Medium/High with percentages]
```

### Multi-Currency Portfolio
```
USD - $10.5M Total
  Base Risk: 45 | Adjusted Risk: 50 | Risk Bucket: Medium
  Airlines: 3
  Concentration Risk: 60% exposure to single airline (+5 penalty)
  [Buckets: Low/Medium/High for USD]

EUR - €8.2M Total
  Base Risk: 38 | Adjusted Risk: 38 | Risk Bucket: Low
  Airlines: 2
  [Buckets: Low/Medium/High for EUR]

Note: Exposure is shown by currency. FX conversion is not applied in this MVP.
```

## Technical Notes

### Currency Detection
- Each exposure has a `currency` field (USD, EUR, GBP, etc.)
- Exposures automatically grouped by currency code
- Currencies sorted alphabetically in display

### Concentration Penalty Logic
Applied **per currency**:
- >70% in single airline: +10 penalty
- >50% in single airline: +5 penalty
- ≤50%: No penalty

### Risk Bucket Thresholds
Same for all currencies:
- Low: < 40
- Medium: 40-69
- High: ≥ 70

## Future Enhancements (Not in MVP)
- FX conversion with live exchange rates
- Base currency selection
- Currency hedging analysis
- Historical FX impact analysis
