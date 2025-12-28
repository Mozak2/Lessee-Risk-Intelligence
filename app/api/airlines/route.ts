import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// GET /api/airlines - Get all airlines
export async function GET() {
  try {
    const airlines = await prisma.airline.findMany({
      where: {
        active: true,
      },
      select: {
        icao: true,
        name: true,
        country: true,
      },
      orderBy: {
        icao: 'asc',
      },
    });

    return NextResponse.json({ airlines });
  } catch (error) {
    console.error('Error fetching airlines:', error);
    return NextResponse.json(
      { error: 'Failed to fetch airlines' },
      { status: 500 }
    );
  }
}
