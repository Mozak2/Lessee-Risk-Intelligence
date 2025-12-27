// API routes for portfolio management

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { calculatePortfolioRisk } from '@/lib/risk-aggregator';

// GET /api/portfolios - List all portfolios
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    
    const portfolios = await prisma.portfolio.findMany({
      where: userId ? { userId } : undefined,
      include: {
        exposures: {
          include: {
            airline: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    return NextResponse.json({ portfolios });
  } catch (error) {
    console.error('Error fetching portfolios:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/portfolios - Create new portfolio
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, userId } = body;
    
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Portfolio name is required' },
        { status: 400 }
      );
    }
    
    const portfolio = await prisma.portfolio.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        userId: userId || 'demo-user', // Default for MVP
      },
    });
    
    console.log('Portfolio created successfully:', portfolio.id);
    return NextResponse.json({ portfolio }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating portfolio:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create portfolio',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}
