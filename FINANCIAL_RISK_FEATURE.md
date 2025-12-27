# Financial Risk Dimension - Feature Documentation

## Overview

The Financial Risk dimension has been added to the modular risk assessment architecture. It evaluates airline financial health using fundamental metrics from publicly traded airlines.

## Architecture

### Modular Design

The financial risk dimension follows the existing pluggable `RiskSource` pattern:

```typescript
interface RiskSource {
  key: 'financial';
  name: 'Financial Risk';
  weight: 0.20; // 20% of overall risk score
  calculate(context: RiskContext): Promise<RiskComponents>;
}
```

### Updated Risk Weights

With the addition of financial risk (20%), the weights have been redistributed:

- **Country Risk**: 28% (was 35%)
- **Activity Risk**: 20% (was 25%)
- **Size & Status Risk**: 32% (was 40%)
- **Financial Risk**: 20% (NEW)

**Total**: 100%

## Implementation Files

### 1. `/lib/sources/financialApi.ts`

**Purpose**: Fetch and normalize financial fundamentals

**Key Functions**:
- `getFundamentalsForTicker(ticker: string)`: Fetches data from Financial Modeling Prep API or returns mock data
- `getTickerFromIcao(icao: string)`: Maps airline ICAO codes to stock tickers
- `getMockFinancialData(ticker: string)`: Provides realistic mock data for 15+ airlines

**Metrics Fetched**:
- Total Debt
- Total Equity  
- Cash & Cash Equivalents
- Revenue
- Net Income

**Computed Ratios**:
- Debt-to-Equity
- Profit Margin (%)
- Cash-to-Debt

**Data Sources**:
- Primary: Financial Modeling Prep API (free tier: 250 requests/day)
- Fallback: Mock data with realistic airline financial profiles

### 2. `/lib/sources/financial.ts`

**Purpose**: Implements the financial risk scoring algorithm

**Key Function**: `computeFinancialRisk(fundamentals: FinancialFundamentals)`

**Scoring Methodology** (0-100 scale, lower is better):

#### Component 1: Debt Risk (40% weight)
- D/E < 1: Excellent (0)
- D/E 1-2: Good (20)
- D/E 2-3: Moderate (40)
- D/E 3-5: Concerning (70)
- D/E > 5: High Risk (90+)

#### Component 2: Profitability Risk (40% weight)
- Margin < 0: High Risk (80+)
- Margin 0-2%: Moderate Risk (50-60)
- Margin 2-5%: Low-Moderate Risk (20-40)
- Margin 5-10%: Low Risk (5-20)
- Margin > 10%: Very Low Risk (0-5)

#### Component 3: Liquidity Risk (20% weight)
- Cash/Debt ≥ 1.0: Excellent (0)
- Cash/Debt 0.5-1.0: Good (20)
- Cash/Debt 0.3-0.5: Moderate (40)
- Cash/Debt 0.1-0.3: Concerning (70)
- Cash/Debt < 0.1: High Risk (90)

**Graceful Degradation**:
- Private airlines (no ticker): Returns neutral score (50) with metadata explaining unavailability
- API failures: Falls back to mock data or neutral score
- Missing metrics: Uses safe defaults

### 3. `/lib/sources/aviation.ts` (Updated)

**Changes**:
- Added `ticker?: string` field to `AirlineData` interface
- Added ticker symbols to all 20 mock airlines

**Ticker Mappings**:
- US: AAL, UAL, DAL, LUV, JBLU
- Europe: AF.PA, IAG.L, LHA.DE, RYA.L, EZJ.L
- Asia: C6L.SI, 0293.HK, 9201.T, 9202.T
- Other: AC.TO, QAN.AX
- Private airlines: `ticker: undefined`

### 4. `/lib/risk-model.ts` (Updated)

**Changes**:
- Extended `RiskContext` interface with `financialData?` field
- Updated `RiskComponents` to allow metadata objects
- Added `ticker?: string` to airline context

### 5. `/lib/sources/risk-sources.ts` (Updated)

**Changes**:
- Imported `financialRiskSource`
- Added to `enabledRiskSources` array
- Weights adjusted as documented above

### 6. `/lib/risk-aggregator.ts` (Updated)

**Changes**:
- Enhanced component merging to handle metadata
- Extracts `financialMetadata` and adds to context
- Filters out metadata keys when calculating weighted scores
- Re-exported `RiskContext` type for convenience

### 7. `/app/airlines/[icao]/page.tsx` (Updated)

**Changes**:
- Passes `ticker` in `RiskContext`
- Passes `ticker` to airline data object
- Added **Financial Health** card in metrics grid (4-column layout)
- Displays:
  - Stock ticker
  - Debt-to-Equity ratio with quality indicator
  - Profit Margin with quality indicator  
  - Cash-to-Debt ratio with quality indicator
  - Data source and fiscal year
  - Unavailability message for private airlines

### 8. `prisma/schema.prisma`

**No Changes Required**: The `financialScore` field already existed for future use.

## API Configuration

### Financial Modeling Prep (Optional)

To use real financial data instead of mock data:

1. Sign up at: https://site.financialmodelingprep.com/developer/docs/
2. Get your free API key (250 requests/day limit)
3. Add to `.env`:
   ```
   FMP_API_KEY=your_api_key_here
   ```

**Without API Key**: The system automatically uses realistic mock data for all supported airlines.

## Mock Data Coverage

The financial API includes comprehensive mock data for:

### US Airlines (5)
- American Airlines (AAL) - D/E: 5.25, Margin: 2.88%
- United Airlines (UAL) - D/E: 3.0, Margin: 5.28%
- Delta Air Lines (DAL) - D/E: 1.87, Margin: 7.93%
- Southwest Airlines (LUV) - D/E: 0.75, Margin: 1.85%
- JetBlue Airways (JBLU) - D/E: 2.0, Margin: -2.0% (loss)

### European Airlines (5)
- Air France-KLM (AF.PA) - D/E: 3.0, Margin: 2.81%
- British Airways/IAG (IAG.L) - D/E: 1.75, Margin: 7.74%
- Lufthansa (LHA.DE) - D/E: 1.6, Margin: 4.5%
- Ryanair (RYA.L) - D/E: 0.5, Margin: 14.62%
- EasyJet (EZJ.L) - D/E: 0.75, Margin: 6.67%

### Asian Airlines (4)
- Singapore Airlines (C6L.SI) - D/E: 0.6, Margin: 14.74%
- Cathay Pacific (0293.HK) - D/E: 1.6, Margin: 3.33%
- Japan Airlines (9201.T) - D/E: 0.75, Margin: 8.0%
- All Nippon Airways (9202.T) - D/E: 1.43, Margin: 4.44%

### Other Airlines (2)
- Air Canada (AC.TO) - D/E: 1.6, Margin: 6.82%
- Qantas (QAN.AX) - D/E: 0.83, Margin: 12.5%

### Private Airlines (No Financial Data)
- Emirates (UAE) - Government-owned
- Qatar Airways (QTR) - Government-owned
- Etihad Airways (ETD) - Government-owned

## UI Display

### Risk Breakdown Section
Financial risk now appears in the risk components list with its weighted contribution (20%).

### Financial Health Card
New card displaying:
- Stock ticker (monospace font)
- Debt-to-Equity with interpretation (Excellent/Good/Moderate/High)
- Profit Margin with interpretation (Excellent/Good/Moderate/Loss)
- Cash-to-Debt with interpretation (Strong/Good/Moderate/Weak)
- Data source indicator (API or Mock Data)
- Fiscal year

### Private Airlines
For government-owned airlines without public tickers:
- Shows message: "Financial data unavailable for government-owned airlines."
- Returns neutral risk score (50) to avoid penalizing

## Scalability & Extensibility

### Adding New Financial Metrics

1. **Update FinancialFundamentals interface**:
   ```typescript
   export interface FinancialFundamentals {
     // ... existing fields
     currentRatio?: number; // NEW
   }
   ```

2. **Update computeFinancialRisk() function**:
   ```typescript
   // Add new component
   const liquidityRisk = calculateLiquidityRisk(fundamentals.currentRatio);
   
   // Update weighted average
   const overallRisk = 
     debtRisk * 0.30 +        // Reduced from 0.40
     profitRisk * 0.30 +      // Reduced from 0.40
     liquidityRisk * 0.20 +   // Kept at 0.20
     currentRatioRisk * 0.20; // NEW
   ```

3. **Update UI**: Add display in Financial Health card

### Adding Alternative Data Providers

Create a new file like `/lib/sources/financialApiAlternative.ts`:

```typescript
export async function getFundamentalsFromAlphaVantage(ticker: string) {
  // Implementation for Alpha Vantage API
}
```

Update `/lib/sources/financial.ts` to use the new provider.

### Adjusting Weights

To change the financial risk weight:

1. Open `/lib/sources/financial.ts`
2. Modify `weight: 0.2` to desired value (e.g., `0.25` for 25%)
3. Adjust other source weights in `/lib/sources/risk-sources.ts` to total 1.0

## Testing Examples

### Test Cases

1. **Healthy Airline** (Delta - DAL):
   - Low D/E (1.87), Good Margin (7.93%), Good Liquidity (0.14)
   - Expected: Low financial risk score (~25-35)

2. **High-Leverage Airline** (American - AAL):
   - High D/E (5.25), Low Margin (2.88%), Moderate Liquidity (0.29)
   - Expected: High financial risk score (~60-70)

3. **Profitable Low-Cost Carrier** (Ryanair - RYR):
   - Excellent D/E (0.5), Excellent Margin (14.62%), Strong Liquidity (1.25)
   - Expected: Very low financial risk score (~5-15)

4. **Unprofitable Airline** (JetBlue - JBLU):
   - Moderate D/E (2.0), Negative Margin (-2.0%), Weak Liquidity (0.33)
   - Expected: High financial risk score (~65-75)

5. **Private Airline** (Emirates - UAE):
   - No ticker available
   - Expected: Neutral score (50), message displayed

## Performance Considerations

- **Caching**: Financial data cached for 24 hours via Next.js `revalidate`
- **Rate Limits**: FMP free tier allows 250 requests/day
- **Fallback Strategy**: Automatic fallback to mock data prevents errors
- **Parallel Fetching**: Balance sheet and income statement fetched concurrently

## Future Enhancements

1. **Additional Metrics**:
   - Current Ratio (short-term liquidity)
   - Interest Coverage Ratio (debt servicing ability)
   - Operating Cash Flow
   - Return on Assets (ROA)
   - Return on Equity (ROE)

2. **Historical Trends**:
   - Track changes in metrics over time
   - Alert on deteriorating financial health

3. **Credit Ratings Integration**:
   - Incorporate S&P, Moody's, Fitch ratings
   - Weight agency ratings in financial risk score

4. **Market Data**:
   - Stock price volatility
   - Market capitalization
   - Beta (market risk correlation)

5. **Industry Benchmarking**:
   - Compare airline metrics to industry averages
   - Peer group analysis

## Summary

The Financial Risk dimension is now fully integrated into the risk assessment system with:

✅ Modular, pluggable architecture
✅ Comprehensive financial metrics (debt, profitability, liquidity)
✅ Graceful degradation for private airlines and API failures
✅ Mock data for 15+ major airlines
✅ UI display with interpretative indicators
✅ Easy extensibility for additional metrics
✅ Proper TypeScript typing throughout
✅ Database schema ready (no migration needed)

The implementation maintains the project's core principle of modularity, allowing financial risk to be easily adjusted, disabled, or enhanced without affecting other risk dimensions.
