/**
 * Unit tests for portfolio risk calculation
 * 
 * Test cases:
 * 1. No exposures - should return zero values
 * 2. Diversified portfolio - no concentration penalty
 * 3. 55% concentration - should apply +5 penalty
 * 4. 75% concentration - should apply +10 penalty
 * 5. Score clamping at 100
 * 
 * Run with: npm test or npx jest
 */

import { PrismaClient } from '@prisma/client';
import { calculatePortfolioRisk } from '../portfolio-risk';

const prisma = new PrismaClient();

describe('Portfolio Risk Calculation', () => {
  let testPortfolioIds: string[] = [];

  afterAll(async () => {
    // Cleanup test data
    for (const id of testPortfolioIds) {
      await prisma.leaseExposure.deleteMany({
        where: { portfolioId: id },
      });
      await prisma.portfolio.delete({
        where: { id },
      });
    }
    await prisma.$disconnect();
  });

  test('should return zero values for empty portfolio', async () => {
    const portfolio = await prisma.portfolio.create({
      data: {
        name: 'Empty Test Portfolio',
        description: 'Test case for empty portfolio',
      },
    });
    testPortfolioIds.push(portfolio.id);

    const risk = await calculatePortfolioRisk(portfolio.id);

    expect(risk).not.toBeNull();
    expect(risk?.totalExposure).toBe(0);
    expect(risk?.baseRisk).toBe(0);
    expect(risk?.adjustedRisk).toBe(0);
    expect(risk?.concentrationPenalty).toBe(0);
    expect(risk?.maxConcentration).toBe(0);
    expect(risk?.riskBucket).toBe('Low');
  });

  test('should calculate risk for diversified portfolio with no penalty', async () => {
    // Create test airlines
    const airline1 = await prisma.airline.upsert({
      where: { icao: 'TST1' },
      update: {},
      create: {
        icao: 'TST1',
        name: 'Test Airline 1',
        country: 'US',
        iata: 'T1',
        fleetSize: 100,
        active: true,
      },
    });

    const airline2 = await prisma.airline.upsert({
      where: { icao: 'TST2' },
      update: {},
      create: {
        icao: 'TST2',
        name: 'Test Airline 2',
        country: 'US',
        iata: 'T2',
        fleetSize: 100,
        active: true,
      },
    });

    const airline3 = await prisma.airline.upsert({
      where: { icao: 'TST3' },
      update: {},
      create: {
        icao: 'TST3',
        name: 'Test Airline 3',
        country: 'US',
        iata: 'T3',
        fleetSize: 100,
        active: true,
      },
    });

    // Create risk snapshots (all with score of 50)
    await prisma.airlineRiskSnapshot.create({
      data: {
        airlineId: airline1.id,
        overallScore: 50,
        riskBucket: 'Medium',
        sourceData: JSON.stringify({}),
        calculatedAt: new Date(),
        expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
      },
    });

    await prisma.airlineRiskSnapshot.create({
      data: {
        airlineId: airline2.id,
        overallScore: 50,
        riskBucket: 'Medium',
        sourceData: JSON.stringify({}),
        calculatedAt: new Date(),
        expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
      },
    });

    await prisma.airlineRiskSnapshot.create({
      data: {
        airlineId: airline3.id,
        overallScore: 50,
        riskBucket: 'Medium',
        sourceData: JSON.stringify({}),
        calculatedAt: new Date(),
        expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
      },
    });

    // Create portfolio with equal exposures (33.3% each, no concentration)
    const portfolio = await prisma.portfolio.create({
      data: {
        name: 'Diversified Test Portfolio',
        description: 'Test case for diversified portfolio',
      },
    });
    testPortfolioIds.push(portfolio.id);

    await prisma.leaseExposure.createMany({
      data: [
        {
          portfolioId: portfolio.id,
          airlineId: airline1.id,
          exposureAmount: 1000000,
          currency: 'USD',
        },
        {
          portfolioId: portfolio.id,
          airlineId: airline2.id,
          exposureAmount: 1000000,
          currency: 'USD',
        },
        {
          portfolioId: portfolio.id,
          airlineId: airline3.id,
          exposureAmount: 1000000,
          currency: 'USD',
        },
      ],
    });

    const risk = await calculatePortfolioRisk(portfolio.id);

    expect(risk).not.toBeNull();
    expect(risk?.totalExposure).toBe(3000000);
    expect(risk?.baseRisk).toBe(50); // All airlines have score of 50
    expect(risk?.adjustedRisk).toBe(50); // No penalty
    expect(risk?.concentrationPenalty).toBe(0); // Max concentration is 33.3%
    expect(risk?.maxConcentration).toBeCloseTo(0.333, 2);
    expect(risk?.riskBucket).toBe('Medium'); // 50 is in 40-69 range
  });

  test('should apply +5 penalty for 55% concentration', async () => {
    // Create test airlines
    const airline1 = await prisma.airline.upsert({
      where: { icao: 'CNT1' },
      update: {},
      create: {
        icao: 'CNT1',
        name: 'Concentrated Airline 1',
        country: 'US',
        iata: 'C1',
        fleetSize: 100,
        active: true,
      },
    });

    const airline2 = await prisma.airline.upsert({
      where: { icao: 'CNT2' },
      update: {},
      create: {
        icao: 'CNT2',
        name: 'Concentrated Airline 2',
        country: 'US',
        iata: 'C2',
        fleetSize: 100,
        active: true,
      },
    });

    // Create risk snapshots (score of 45)
    await prisma.airlineRiskSnapshot.create({
      data: {
        airlineId: airline1.id,
        overallScore: 45,
        riskBucket: 'Medium',
        sourceData: JSON.stringify({}),
        calculatedAt: new Date(),
        expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
      },
    });

    await prisma.airlineRiskSnapshot.create({
      data: {
        airlineId: airline2.id,
        overallScore: 45,
        riskBucket: 'Medium',
        sourceData: JSON.stringify({}),
        calculatedAt: new Date(),
        expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
      },
    });

    // Create portfolio with 55% concentration
    const portfolio = await prisma.portfolio.create({
      data: {
        name: 'Concentrated Test Portfolio (55%)',
        description: 'Test case for 55% concentration',
      },
    });
    testPortfolioIds.push(portfolio.id);

    await prisma.leaseExposure.createMany({
      data: [
        {
          portfolioId: portfolio.id,
          airlineId: airline1.id,
          exposureAmount: 5500000, // 55%
          currency: 'USD',
        },
        {
          portfolioId: portfolio.id,
          airlineId: airline2.id,
          exposureAmount: 4500000, // 45%
          currency: 'USD',
        },
      ],
    });

    const risk = await calculatePortfolioRisk(portfolio.id);

    expect(risk).not.toBeNull();
    expect(risk?.totalExposure).toBe(10000000);
    expect(risk?.baseRisk).toBe(45);
    expect(risk?.adjustedRisk).toBe(50); // 45 + 5 penalty
    expect(risk?.concentrationPenalty).toBe(5);
    expect(risk?.maxConcentration).toBe(0.55);
    expect(risk?.riskBucket).toBe('Medium');
  });

  test('should apply +10 penalty for 75% concentration', async () => {
    // Create test airlines
    const airline1 = await prisma.airline.upsert({
      where: { icao: 'HCN1' },
      update: {},
      create: {
        icao: 'HCN1',
        name: 'High Concentration Airline 1',
        country: 'US',
        iata: 'H1',
        fleetSize: 100,
        active: true,
      },
    });

    const airline2 = await prisma.airline.upsert({
      where: { icao: 'HCN2' },
      update: {},
      create: {
        icao: 'HCN2',
        name: 'High Concentration Airline 2',
        country: 'US',
        iata: 'H2',
        fleetSize: 100,
        active: true,
      },
    });

    // Create risk snapshots (score of 60)
    await prisma.airlineRiskSnapshot.create({
      data: {
        airlineId: airline1.id,
        overallScore: 60,
        riskBucket: 'Medium',
        sourceData: JSON.stringify({}),
        sourceData: JSON.stringify({}),
        calculatedAt: new Date(),
        expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
      },
    });

    await prisma.airlineRiskSnapshot.create({
      data: {
        airlineId: airline2.id,
        overallScore: 60,
        riskBucket: 'Medium',
        sourceData: JSON.stringify({}),
        calculatedAt: new Date(),
        expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
      },
    });

    // Create portfolio with 75% concentration
    const portfolio = await prisma.portfolio.create({
      data: {
        name: 'High Concentration Test Portfolio (75%)',
        description: 'Test case for 75% concentration',
      },
    });
    testPortfolioIds.push(portfolio.id);

    await prisma.leaseExposure.createMany({
      data: [
        {
          portfolioId: portfolio.id,
          airlineId: airline1.id,
          exposureAmount: 7500000, // 75%
          currency: 'USD',
        },
        {
          portfolioId: portfolio.id,
          airlineId: airline2.id,
          exposureAmount: 2500000, // 25%
          currency: 'USD',
        },
      ],
    });

    const risk = await calculatePortfolioRisk(portfolio.id);

    expect(risk).not.toBeNull();
    expect(risk?.totalExposure).toBe(10000000);
    expect(risk?.baseRisk).toBe(60);
    expect(risk?.adjustedRisk).toBe(70); // 60 + 10 penalty
    expect(risk?.concentrationPenalty).toBe(10);
    expect(risk?.maxConcentration).toBe(0.75);
    expect(risk?.riskBucket).toBe('High'); // 70 is at the High threshold
  });

  test('should clamp adjusted risk at 100', async () => {
    // Create test airline
    const airline = await prisma.airline.upsert({
      where: { icao: 'CLMP' },
      update: {},
      create: {
        icao: 'CLMP',
        name: 'Clamp Test Airline',
        country: 'US',
        iata: 'CL',
        fleetSize: 100,
        active: true,
      },
    });

    // Create risk snapshot with very high score (95)
    await prisma.airlineRiskSnapshot.create({
      data: {
        airlineId: airline.id,
        overallScore: 95,
        riskBucket: 'High',
        sourceData: JSON.stringify({}),
        sourceData: JSON.stringify({}),
        calculatedAt: new Date(),
        expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
      },
    });

    // Create portfolio with 100% concentration (single airline)
    const portfolio = await prisma.portfolio.create({
      data: {
        name: 'Clamp Test Portfolio',
        description: 'Test case for score clamping at 100',
      },
    });
    testPortfolioIds.push(portfolio.id);

    await prisma.leaseExposure.create({
      data: {
        portfolioId: portfolio.id,
        airlineId: airline.id,
        exposureAmount: 10000000, // 100%
        currency: 'USD',
      },
    });

    const risk = await calculatePortfolioRisk(portfolio.id);

    expect(risk).not.toBeNull();
    expect(risk?.baseRisk).toBe(95);
    expect(risk?.concentrationPenalty).toBe(10); // 100% > 0.7
    expect(risk?.adjustedRisk).toBe(100); // Should be clamped at 100 (not 105)
    expect(risk?.maxConcentration).toBe(1.0);
    expect(risk?.riskBucket).toBe('High');
  });
});
