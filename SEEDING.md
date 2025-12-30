# Database Seeding

This project includes seed data to quickly populate the database with demo content.

## What Gets Seeded

The seed script creates:

- **4 Airlines**: American Airlines, British Airways, Lufthansa, Delta Air Lines
- **4 Risk Snapshots**: One current risk assessment per airline
- **1 Sample Portfolio**: "Sample Leasing Portfolio"
- **4 Lease Exposures**: Multi-currency exposures across the airlines

Total demo exposure: ~$160M equivalent across USD, EUR, and GBP

## Running the Seed

### First Time Setup

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Run seed
npm run db:seed
```

### Re-seeding

The seed script is **idempotent** - you can run it multiple times safely:

```bash
npm run db:seed
```

This will:
1. Delete existing demo data (if any)
2. Create fresh seed data

## Automatic Seeding

The seed script will also run automatically when you run:

```bash
npx prisma db push --accept-data-loss
```

Or:

```bash
npx prisma migrate reset
```

## Seed Data Details

### Airlines Created

| Airline | ICAO | IATA | Country | Fleet Size | Risk Score |
|---------|------|------|---------|------------|------------|
| American Airlines | AAL | AA | United States | 840 | 28.5 (Low) |
| British Airways | BAW | BA | United Kingdom | 275 | 32.8 (Low) |
| Lufthansa | DLH | LH | Germany | 270 | 35.2 (Medium) |
| Delta Air Lines | DAL | DL | United States | 900 | 26.3 (Low) |

### Portfolio Exposures

| Airline | Amount | Currency | Aircraft |
|---------|--------|----------|----------|
| American Airlines | $45M | USD | 12 |
| British Airways | £28M | GBP | 8 |
| Lufthansa | €35M | EUR | 10 |
| Delta Air Lines | $52M | USD | 15 |

## Modifying Seed Data

Edit `prisma/seed.ts` to customize:
- Airline details
- Risk scores
- Portfolio composition
- Exposure amounts

After changes, run:

```bash
npm run db:seed
```
