import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clean existing demo data to make seeding idempotent
  console.log('🧹 Cleaning existing demo data...');
  
  const demoPortfolio = await prisma.portfolio.findFirst({
    where: { name: 'Sample Leasing Portfolio' }
  });

  if (demoPortfolio) {
    await prisma.leaseExposure.deleteMany({
      where: { portfolioId: demoPortfolio.id }
    });
    await prisma.portfolio.delete({
      where: { id: demoPortfolio.id }
    });
    console.log('  ✓ Deleted existing demo portfolio');
  }

  // Delete demo airlines and their related data
  const demoICAOs = ['AAL', 'BAW', 'DLH', 'DAL'];
  await prisma.airlineRiskSnapshot.deleteMany({
    where: {
      airline: {
        icao: { in: demoICAOs }
      }
    }
  });
  await prisma.airline.deleteMany({
    where: { icao: { in: demoICAOs } }
  });
  console.log('  ✓ Deleted existing demo airlines');

  // Create Airlines
  console.log('\n✈️  Creating airlines...');
  
  const americanAirlines = await prisma.airline.create({
    data: {
      icao: 'AAL',
      iata: 'AA',
      name: 'American Airlines',
      country: 'United States',
      active: true,
      fleetSize: 840,
    },
  });
  console.log('  ✓ Created American Airlines');

  const britishAirways = await prisma.airline.create({
    data: {
      icao: 'BAW',
      iata: 'BA',
      name: 'British Airways',
      country: 'United Kingdom',
      active: true,
      fleetSize: 275,
    },
  });
  console.log('  ✓ Created British Airways');

  const lufthansa = await prisma.airline.create({
    data: {
      icao: 'DLH',
      iata: 'LH',
      name: 'Lufthansa',
      country: 'Germany',
      active: true,
      fleetSize: 270,
    },
  });
  console.log('  ✓ Created Lufthansa');

  const deltaAirLines = await prisma.airline.create({
    data: {
      icao: 'DAL',
      iata: 'DL',
      name: 'Delta Air Lines',
      country: 'United States',
      active: true,
      fleetSize: 900,
    },
  });
  console.log('  ✓ Created Delta Air Lines');

  // Create Risk Snapshots
  console.log('\n📊 Creating risk snapshots...');
  
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

  await prisma.airlineRiskSnapshot.create({
    data: {
      airlineId: americanAirlines.id,
      overallScore: 28.5,
      riskBucket: 'Low',
      jurisdictionScore: 25.0,
      jurisdictionConfidence: 'HIGH',
      scaleScore: 20.0,
      scaleConfidence: 'HIGH',
      assetLiquidityScore: 50.0,
      assetLiquidityConfidence: 'LOW',
      financialScore: 43.7,
      financialConfidence: 'HIGH',
      calculatedAt: now,
      expiresAt: expiresAt,
      dataVersion: '2.0',
      reweighted: false,
    },
  });
  console.log('  ✓ Created risk snapshot for American Airlines (Low Risk: 28.5)');

  await prisma.airlineRiskSnapshot.create({
    data: {
      airlineId: britishAirways.id,
      overallScore: 32.8,
      riskBucket: 'Low',
      jurisdictionScore: 28.0,
      jurisdictionConfidence: 'HIGH',
      scaleScore: 22.0,
      scaleConfidence: 'HIGH',
      assetLiquidityScore: 50.0,
      assetLiquidityConfidence: 'LOW',
      financialScore: 48.2,
      financialConfidence: 'HIGH',
      calculatedAt: now,
      expiresAt: expiresAt,
      dataVersion: '2.0',
      reweighted: false,
    },
  });
  console.log('  ✓ Created risk snapshot for British Airways (Low Risk: 32.8)');

  await prisma.airlineRiskSnapshot.create({
    data: {
      airlineId: lufthansa.id,
      overallScore: 35.2,
      riskBucket: 'Medium',
      jurisdictionScore: 30.0,
      jurisdictionConfidence: 'HIGH',
      scaleScore: 25.0,
      scaleConfidence: 'HIGH',
      assetLiquidityScore: 50.0,
      assetLiquidityConfidence: 'LOW',
      financialScore: 52.5,
      financialConfidence: 'HIGH',
      calculatedAt: now,
      expiresAt: expiresAt,
      dataVersion: '2.0',
      reweighted: false,
    },
  });
  console.log('  ✓ Created risk snapshot for Lufthansa (Medium Risk: 35.2)');

  await prisma.airlineRiskSnapshot.create({
    data: {
      airlineId: deltaAirLines.id,
      overallScore: 26.3,
      riskBucket: 'Low',
      jurisdictionScore: 25.0,
      jurisdictionConfidence: 'HIGH',
      scaleScore: 18.0,
      scaleConfidence: 'HIGH',
      assetLiquidityScore: 50.0,
      assetLiquidityConfidence: 'LOW',
      financialScore: 40.8,
      financialConfidence: 'HIGH',
      calculatedAt: now,
      expiresAt: expiresAt,
      dataVersion: '2.0',
      reweighted: false,
    },
  });
  console.log('  ✓ Created risk snapshot for Delta Air Lines (Low Risk: 26.3)');

  // Create Portfolio
  console.log('\n📁 Creating portfolio...');
  
  const portfolio = await prisma.portfolio.create({
    data: {
      name: 'Sample Leasing Portfolio',
      description: 'Example portfolio used for demonstration purposes. Contains a diversified mix of major carriers across multiple currencies.',
    },
  });
  console.log('  ✓ Created Sample Leasing Portfolio');

  // Create Lease Exposures
  console.log('\n💼 Creating lease exposures...');

  await prisma.leaseExposure.create({
    data: {
      portfolioId: portfolio.id,
      airlineId: americanAirlines.id,
      exposureAmount: 45000000, // $45M
      currency: 'USD',
      numAircraft: 12,
      notes: 'A320 family fleet on long-term lease',
    },
  });
  console.log('  ✓ Created exposure: American Airlines - $45M USD');

  await prisma.leaseExposure.create({
    data: {
      portfolioId: portfolio.id,
      airlineId: britishAirways.id,
      exposureAmount: 28000000, // £28M
      currency: 'GBP',
      numAircraft: 8,
      notes: 'B787 Dreamliner fleet',
    },
  });
  console.log('  ✓ Created exposure: British Airways - £28M GBP');

  await prisma.leaseExposure.create({
    data: {
      portfolioId: portfolio.id,
      airlineId: lufthansa.id,
      exposureAmount: 35000000, // €35M
      currency: 'EUR',
      numAircraft: 10,
      notes: 'A350 wide-body aircraft',
    },
  });
  console.log('  ✓ Created exposure: Lufthansa - €35M EUR');

  await prisma.leaseExposure.create({
    data: {
      portfolioId: portfolio.id,
      airlineId: deltaAirLines.id,
      exposureAmount: 52000000, // $52M
      currency: 'USD',
      numAircraft: 15,
      notes: 'Mixed narrow-body fleet',
    },
  });
  console.log('  ✓ Created exposure: Delta Air Lines - $52M USD');

  console.log('\n✅ Seeding completed successfully!');
  console.log('\n📊 Summary:');
  console.log('  • 4 airlines created');
  console.log('  • 4 risk snapshots created');
  console.log('  • 1 portfolio created');
  console.log('  • 4 lease exposures created');
  console.log('  • Total exposure value: ~$160M equivalent across USD, EUR, GBP\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
