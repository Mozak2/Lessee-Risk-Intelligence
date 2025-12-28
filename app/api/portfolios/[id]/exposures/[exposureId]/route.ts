// API routes for individual exposure operations

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// PUT /api/portfolios/[id]/exposures/[exposureId] - Update exposure
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; exposureId: string } }
) {
  try {
    const body = await request.json();
    const { exposureAmount, currency, numAircraft } = body;

    // Validation
    if (!exposureAmount || exposureAmount <= 0) {
      return NextResponse.json(
        { error: 'Exposure amount must be greater than 0' },
        { status: 400 }
      );
    }

    if (!currency || currency.trim() === '') {
      return NextResponse.json(
        { error: 'Currency is required' },
        { status: 400 }
      );
    }

    // Check if exposure exists and belongs to this portfolio
    const existingExposure = await prisma.leaseExposure.findUnique({
      where: { id: params.exposureId },
    });

    if (!existingExposure) {
      return NextResponse.json(
        { error: 'Exposure not found' },
        { status: 404 }
      );
    }

    if (existingExposure.portfolioId !== params.id) {
      return NextResponse.json(
        { error: 'Exposure does not belong to this portfolio' },
        { status: 403 }
      );
    }

    // Update exposure
    const updatedExposure = await prisma.leaseExposure.update({
      where: { id: params.exposureId },
      data: {
        exposureAmount: parseFloat(exposureAmount.toString()),
        currency: currency.trim().toUpperCase(),
        numAircraft: numAircraft ? parseInt(numAircraft.toString()) : null,
      },
    });

    return NextResponse.json(updatedExposure);
  } catch (error) {
    console.error('Error updating exposure:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/portfolios/[id]/exposures/[exposureId] - Delete exposure
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; exposureId: string } }
) {
  try {
    // Check if exposure exists and belongs to this portfolio
    const existingExposure = await prisma.leaseExposure.findUnique({
      where: { id: params.exposureId },
    });

    if (!existingExposure) {
      return NextResponse.json(
        { error: 'Exposure not found' },
        { status: 404 }
      );
    }

    if (existingExposure.portfolioId !== params.id) {
      return NextResponse.json(
        { error: 'Exposure does not belong to this portfolio' },
        { status: 403 }
      );
    }

    // Delete exposure
    await prisma.leaseExposure.delete({
      where: { id: params.exposureId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting exposure:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
