// API routes for specific portfolio operations

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { calculatePortfolioRisk } from '@/lib/portfolio-risk';

// GET /api/portfolios/[id] - Get portfolio details with risk
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const portfolio = await prisma.portfolio.findUnique({
      where: { id: params.id },
      include: {
        exposures: {
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
        },
      },
    });
    
    if (!portfolio) {
      return NextResponse.json(
        { error: 'Portfolio not found' },
        { status: 404 }
      );
    }
    
    // Calculate portfolio-level risk
    const portfolioRisk = await calculatePortfolioRisk(params.id);
    
    return NextResponse.json({
      portfolio,
      risk: portfolioRisk,
    });
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/portfolios/[id] - Update portfolio
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, description } = body;

    // Validation
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Portfolio name is required' },
        { status: 400 }
      );
    }

    // Check if portfolio exists
    const existingPortfolio = await prisma.portfolio.findUnique({
      where: { id: params.id },
    });

    if (!existingPortfolio) {
      return NextResponse.json(
        { error: 'Portfolio not found' },
        { status: 404 }
      );
    }

    // Update portfolio
    const updatedPortfolio = await prisma.portfolio.update({
      where: { id: params.id },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
      },
    });

    return NextResponse.json(updatedPortfolio);
  } catch (error) {
    console.error('Error updating portfolio:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/portfolios/[id] - Delete portfolio
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.portfolio.delete({
      where: { id: params.id },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting portfolio:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
