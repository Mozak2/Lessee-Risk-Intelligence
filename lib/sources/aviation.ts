// Aviation API wrapper (using AviationStack or similar free API)

export interface AirlineData {
  icao: string;
  iata?: string;
  name: string;
  country: string;
  active: boolean;
  fleetSize?: number;
}

/**
 * Fetch airline data by ICAO code
 * Uses AviationStack API (free tier) - replace with your preferred aviation API
 */
export async function getAirlineByIcao(icao: string): Promise<AirlineData | null> {
  const apiKey = process.env.AVIATION_API_KEY;
  
  if (!apiKey) {
    console.warn('AVIATION_API_KEY not set, using mock data');
    return getMockAirlineData(icao);
  }
  
  try {
    // AviationStack example endpoint
    const response = await fetch(
      `http://api.aviationstack.com/v1/airlines?access_key=${apiKey}&search=${icao}`,
      {
        next: { revalidate: 86400 }, // Cache for 24 hours
      }
    );
    
    if (!response.ok) {
      throw new Error(`Aviation API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      return null;
    }
    
    const airline = data.data[0];
    
    return {
      icao: airline.icao_code || icao.toUpperCase(),
      iata: airline.iata_code || undefined,
      name: airline.airline_name,
      country: airline.country_name,
      active: airline.status === 'active',
      fleetSize: airline.fleet_size || undefined,
    };
  } catch (error) {
    console.error('Error fetching airline data:', error);
    return getMockAirlineData(icao);
  }
}

/**
 * Mock data for development/testing
 */
function getMockAirlineData(icao: string): AirlineData | null {
  const mockData: { [key: string]: AirlineData } = {
    // Major US carriers
    'AAL': {
      icao: 'AAL',
      iata: 'AA',
      name: 'American Airlines',
      country: 'United States',
      active: true,
      fleetSize: 865,
    },
    'UAL': {
      icao: 'UAL',
      iata: 'UA',
      name: 'United Airlines',
      country: 'United States',
      active: true,
      fleetSize: 840,
    },
    'DAL': {
      icao: 'DAL',
      iata: 'DL',
      name: 'Delta Air Lines',
      country: 'United States',
      active: true,
      fleetSize: 920,
    },
    'SWA': {
      icao: 'SWA',
      iata: 'WN',
      name: 'Southwest Airlines',
      country: 'United States',
      active: true,
      fleetSize: 750,
    },
    'JBU': {
      icao: 'JBU',
      iata: 'B6',
      name: 'JetBlue Airways',
      country: 'United States',
      active: true,
      fleetSize: 280,
    },
    
    // European carriers
    'AFR': {
      icao: 'AFR',
      iata: 'AF',
      name: 'Air France',
      country: 'France',
      active: true,
      fleetSize: 220,
    },
    'BAW': {
      icao: 'BAW',
      iata: 'BA',
      name: 'British Airways',
      country: 'United Kingdom',
      active: true,
      fleetSize: 250,
    },
    'DLH': {
      icao: 'DLH',
      iata: 'LH',
      name: 'Lufthansa',
      country: 'Germany',
      active: true,
      fleetSize: 280,
    },
    'KLM': {
      icao: 'KLM',
      iata: 'KL',
      name: 'KLM Royal Dutch Airlines',
      country: 'Netherlands',
      active: true,
      fleetSize: 110,
    },
    'RYR': {
      icao: 'RYR',
      iata: 'FR',
      name: 'Ryanair',
      country: 'Ireland',
      active: true,
      fleetSize: 470,
    },
    'EZY': {
      icao: 'EZY',
      iata: 'U2',
      name: 'EasyJet',
      country: 'United Kingdom',
      active: true,
      fleetSize: 320,
    },
    
    // Middle East carriers
    'UAE': {
      icao: 'UAE',
      iata: 'EK',
      name: 'Emirates',
      country: 'United Arab Emirates',
      active: true,
      fleetSize: 260,
    },
    'QTR': {
      icao: 'QTR',
      iata: 'QR',
      name: 'Qatar Airways',
      country: 'Qatar',
      active: true,
      fleetSize: 200,
    },
    'ETD': {
      icao: 'ETD',
      iata: 'EY',
      name: 'Etihad Airways',
      country: 'United Arab Emirates',
      active: true,
      fleetSize: 90,
    },
    
    // Asian carriers
    'SIA': {
      icao: 'SIA',
      iata: 'SQ',
      name: 'Singapore Airlines',
      country: 'Singapore',
      active: true,
      fleetSize: 180,
    },
    'CPA': {
      icao: 'CPA',
      iata: 'CX',
      name: 'Cathay Pacific',
      country: 'Hong Kong',
      active: true,
      fleetSize: 150,
    },
    'JAL': {
      icao: 'JAL',
      iata: 'JL',
      name: 'Japan Airlines',
      country: 'Japan',
      active: true,
      fleetSize: 165,
    },
    'ANA': {
      icao: 'ANA',
      iata: 'NH',
      name: 'All Nippon Airways',
      country: 'Japan',
      active: true,
      fleetSize: 220,
    },
    
    // Other notable carriers
    'ACA': {
      icao: 'ACA',
      iata: 'AC',
      name: 'Air Canada',
      country: 'Canada',
      active: true,
      fleetSize: 190,
    },
    'QFA': {
      icao: 'QFA',
      iata: 'QF',
      name: 'Qantas',
      country: 'Australia',
      active: true,
      fleetSize: 130,
    },
  };
  
  return mockData[icao.toUpperCase()] || null;
}

/**
 * Search airlines by name or code
 */
export async function searchAirlines(query: string): Promise<AirlineData[]> {
  const apiKey = process.env.AVIATION_API_KEY;
  
  if (!apiKey) {
    console.warn('AVIATION_API_KEY not set, using mock data');
    return Object.values(getMockSearchResults()).filter(
      airline => 
        airline.name.toLowerCase().includes(query.toLowerCase()) ||
        airline.icao.toLowerCase().includes(query.toLowerCase()) ||
        airline.iata?.toLowerCase().includes(query.toLowerCase())
    );
  }
  
  try {
    const response = await fetch(
      `http://api.aviationstack.com/v1/airlines?access_key=${apiKey}&search=${query}&limit=10`,
      {
        next: { revalidate: 3600 }, // Cache for 1 hour
      }
    );
    
    if (!response.ok) {
      throw new Error(`Aviation API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return (data.data || []).map((airline: any) => ({
      icao: airline.icao_code,
      iata: airline.iata_code || undefined,
      name: airline.airline_name,
      country: airline.country_name,
      active: airline.status === 'active',
      fleetSize: airline.fleet_size || undefined,
    }));
  } catch (error) {
    console.error('Error searching airlines:', error);
    return [];
  }
}

function getMockSearchResults(): { [key: string]: AirlineData } {
  // Return all mock data for search functionality
  const allMockData: { [key: string]: AirlineData } = {};
  
  // Get data from getMockAirlineData for all known airlines
  const knownIcaos = [
    'AAL', 'UAL', 'DAL', 'SWA', 'JBU',
    'AFR', 'BAW', 'DLH', 'KLM', 'RYR', 'EZY',
    'UAE', 'QTR', 'ETD',
    'SIA', 'CPA', 'JAL', 'ANA',
    'ACA', 'QFA'
  ];
  
  knownIcaos.forEach(icao => {
    const airlineData = getMockAirlineData(icao);
    if (airlineData) {
      allMockData[icao] = airlineData;
    }
  });
  
  return allMockData;
}
