# Airline Risk Intelligence MVP

A comprehensive risk assessment platform for aircraft lessors, built with Next.js, TypeScript, and PostgreSQL.

## Features

- **Airline Risk Scoring**: Multi-dimensional risk assessment (country, activity, size, status)
- **Portfolio Management**: Track lease exposures and portfolio-level risk metrics
- **Real-time Data**: Integration with free aviation and country data APIs
- **Extensible Architecture**: Easily add new risk dimensions (news, financial data)

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL with Prisma ORM
- **Data Sources**:
  - Aviation APIs (AviationStack/similar)
  - REST Countries API
  - OpenSky Network API

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Lessee-Risk-Intelligence
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and configure your database connection:
```
DATABASE_URL="postgresql://user:password@localhost:5432/airline_risk_db?schema=public"
```

4. Initialize the database:
```bash
npm run db:push
npm run db:generate
```

5. Run the development server:
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

1. **Country Risk** (35% weight)
   - Regional risk assessment
   - Economic stability indicators (Gini coefficient)

2. **Activity Risk** (25% weight)
   - Flight operations in last 24 hours
   - Operational activity level

3. **Size & Status Risk** (40% weight)
   - Fleet size
   - Active/inactive status

### Risk Scoring

- **0-30**: Low Risk (Green)
- **31-60**: Medium Risk (Yellow)
- **61-100**: High Risk (Red)

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
