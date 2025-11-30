// API routes for managing exposures within a portfolio

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAirlineByIcao } from '@/lib/sources/aviation';

// POST /api/portfolios/[id]/exposures - Add exposure to portfolio
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { icao, exposureAmount, currency, numAircraft, notes } = body;
    
    if (!icao || !exposureAmount) {
      return NextResponse.json(
        { error: 'ICAO code and exposure amount are required' },
        { status: 400 }
      );
    }
    
    // Check if airline exists, if not create it
    let airline = await prisma.airline.findUnique({
      where: { icao: icao.toUpperCase() },
    });
    
    if (!airline) {
      const airlineData = await getAirlineByIcao(icao);
      
      if (!airlineData) {
        return NextResponse.json(
          { error: 'Airline not found' },
          { status: 404 }
        );
      }
      
      airline = await prisma.airline.create({
        data: {
          icao: airlineData.icao,
          iata: airlineData.iata,
          name: airlineData.name,
          country: airlineData.country,
          active: airlineData.active,
          fleetSize: airlineData.fleetSize,
        },
      });
    }
    
    // Create exposure
    const exposure = await prisma.leaseExposure.create({
      data: {
        portfolioId: params.id,
        airlineId: airline.id,
        exposureAmount,
        currency: currency || 'USD',
        numAircraft,
        notes,
      },
      include: {
        airline: true,
      },
    });
    
    return NextResponse.json({ exposure }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating exposure:', error);
    
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'This airline is already in the portfolio' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/portfolios/[id]/exposures - List all exposures in portfolio
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const exposures = await prisma.leaseExposure.findMany({
      where: { portfolioId: params.id },
      include: {
        airline: {
          include: {
            riskSnapshots: {
              orderBy: { calculatedAt: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: { exposureAmount: 'desc' },
    });
    
    return NextResponse.json({ exposures });
  } catch (error) {
    console.error('Error fetching exposures:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
