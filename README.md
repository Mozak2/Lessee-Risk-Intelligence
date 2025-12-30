# Airline Risk Intelligence MVP

A comprehensive risk assessment platform for aircraft lessors, built with Next.js, TypeScript, and Supabase PostgreSQL.

## Features

- **Airline Risk Scoring**: Multi-dimensional risk assessment (jurisdiction, scale, asset liquidity, financial strength)
- **Portfolio Management**: Track lease exposures and portfolio-level risk metrics
- **Real-time Data**: Integration with free aviation and country data APIs
- **Dark Mode**: Full light/dark theme support
- **Extensible Architecture**: Easily add new risk dimensions (news, financial data)

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL) with Prisma ORM
- **Data Sources**:
  - Aviation APIs (AviationStack/similar)
  - REST Countries API
  - OpenSky Network API

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier available)

### Quick Start with Supabase

1. Clone the repository:
```bash
git clone <repository-url>
cd Lessee-Risk-Intelligence
```

2. Install dependencies:
```bash
npm install
```

3. Set up Supabase:
   - Create a free account at [supabase.com](https://supabase.com)
   - Create a new project
   - Get your connection strings from Settings > Database
   - See detailed instructions in [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

4. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your Supabase connection strings:
```env
DATABASE_URL="postgresql://postgres.xxxxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.xxxxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
```

5. Initialize the database:
```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

6. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
/app                          # Next.js App Router pages
  /airlines                   # Airline search and detail pages
  /portfolios                 # Portfolio management pages
  /api                        # API routes
/lib                          # Core business logic
  /sources                    # External API wrappers
    aviation.ts               # Aviation data API
    restCountries.ts          # Country information API
    opensky.ts                # Flight activity API
    risk-sources.ts           # Risk calculation sources
  risk-model.ts               # Risk model types and interfaces
  risk-aggregator.ts          # Risk calculation engine
  db.ts                       # Database client
/prisma
  schema.prisma               # Database schema
```

## Risk Model

The platform uses a pluggable risk model with multiple dimensions:

### Risk Components (Current)

## Risk Model

The platform uses a pluggable risk model with multiple dimensions:

### Risk Components (v2.0 - Refactored)

1. **Jurisdiction Risk (proxy)** (25% weight)
   - Regional risk assessment
   - Economic stability indicators (Gini coefficient)
   - Confidence: HIGH/MEDIUM based on data availability

2. **Scale & Network Strength** (20% weight)
   - Fleet size as primary indicator
   - Market presence and stability
   - Confidence: HIGH when fleet data available

3. **Fleet & Asset Liquidity (proxy)** (20% weight)
   - Fleet composition risk (narrowbody vs widebody)
   - Currently returns neutral score with LOW confidence
   - Placeholder for future fleet mix analysis

4. **Financial Strength** (35% weight)
   - Debt-to-Equity ratio
   - Profit margins
   - Cash-to-Debt liquidity
   - Returns null when unavailable (private airlines)
   - Confidence: HIGH for public companies with recent data

### Risk Scoring

- **0-40**: Low Risk (Green)
- **40-70**: Medium Risk (Yellow)
- **70-100**: High Risk (Red)

### Confidence Levels

Each component includes a confidence level:
- **HIGH**: Reliable data from primary sources
- **MEDIUM**: Derived or proxy data
- **LOW**: Placeholder or insufficient data

### Score Reweighting

When components are unavailable (e.g., financials for private airlines):
- Null components are excluded from calculation
- Remaining components are reweighted proportionally
- Metadata tracks missing components and reweighting status

### Extensibility

The architecture supports easy addition of new risk dimensions:

- News sentiment analysis
- Financial health metrics
- Regulatory compliance data
- Safety records

To add a new risk source:
1. Create a new file in `/lib/sources/`
2. Implement the `RiskSource` interface
3. Add to `enabledRiskSources` array

## API Routes

### Airlines
- `GET /api/airlines/[icao]` - Get airline risk assessment

### Portfolios
- `GET /api/portfolios` - List all portfolios
- `POST /api/portfolios` - Create new portfolio
- `GET /api/portfolios/[id]` - Get portfolio details with risk
- `PUT /api/portfolios/[id]` - Update portfolio
- `DELETE /api/portfolios/[id]` - Delete portfolio
- `POST /api/portfolios/[id]/exposures` - Add exposure to portfolio
- `GET /api/portfolios/[id]/exposures` - List portfolio exposures

## Database Schema

### Models

- **Airline**: Master airline data (ICAO, IATA, name, country, fleet size)
- **AirlineRiskSnapshot**: Cached risk assessments with expiration
- **Portfolio**: Portfolio metadata
- **LeaseExposure**: Links portfolios to airlines with exposure amounts

## External APIs

### Free APIs Used

1. **Aviation Data**: AviationStack (or similar)
   - Airline information, fleet size, status
   - Sign up: https://aviationstack.com/

2. **Country Data**: REST Countries API
   - No API key required
   - https://restcountries.com/

3. **Flight Activity**: OpenSky Network
   - No API key required (rate limited)
   - https://opensky-network.org/

### Mock Data

The app includes mock data for development and falls back to it when API keys are not configured.

## Development

### Database Commands

```bash
# Generate Prisma Client
npm run db:generate

# Push schema changes to database
npm run db:push

# Create and run migrations
npm run db:migrate

# Open Prisma Studio
npm run db:studio
```

### Building for Production

```bash
npm run build
npm start
```

## Future Enhancements

- [ ] User authentication (NextAuth)
- [ ] News sentiment analysis integration
- [ ] Financial data integration
- [ ] Historical risk tracking and trends
- [ ] Email alerts for risk threshold breaches
- [ ] Export functionality (PDF reports)
- [ ] Advanced portfolio analytics
- [ ] Multi-currency support

## License

MIT

## Support

For issues and questions, please open an issue in the repository.
