// API route for airline risk data

import { NextRequest, NextResponse } from 'next/server';
import { getAirlineRisk } from '@/lib/risk-aggregator';
import prisma from '@/lib/db';
import { getAirlineByIcao } from '@/lib/sources/aviation';

export async function GET(
  request: NextRequest,
  { params }: { params: { icao: string } }
) {
  try {
    const icao = params.icao.toUpperCase();
    const forceRefresh = request.nextUrl.searchParams.get('refresh') === 'true';
    
    // Check if airline exists in database
    let airline = await prisma.airline.findUnique({
      where: { icao },
    });
    
    // If not in database, fetch from API and create
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
    
    // Get risk assessment
    const riskResult = await getAirlineRisk(icao, forceRefresh);
    
    if (!riskResult) {
      return NextResponse.json(
        { error: 'Unable to calculate risk' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      airline: {
        id: airline.id,
        icao: airline.icao,
        iata: airline.iata,
        name: airline.name,
        country: airline.country,
        active: airline.active,
        fleetSize: airline.fleetSize,
      },
      risk: {
        overallScore: riskResult.overallScore,
        riskBucket: riskResult.riskBucket,
        components: riskResult.components,
        breakdown: riskResult.breakdown,
        calculatedAt: riskResult.calculatedAt,
        expiresAt: riskResult.expiresAt,
      },
      context: riskResult.context,
    });
  } catch (error) {
    console.error('Error in airline API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
