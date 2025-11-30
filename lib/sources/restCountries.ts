// REST Countries API wrapper

export interface CountryInfo {
  name: string;
  region?: string;
  subregion?: string;
  population?: number;
  gini?: number; // Gini coefficient (inequality index)
  capitalInfo?: {
    latlng?: number[];
  };
}

/**
 * Fetch country information
 */
export async function getCountryInfo(countryName: string): Promise<CountryInfo | undefined> {
  try {
    // REST Countries API is free and doesn't require an API key
    const response = await fetch(
      `https://restcountries.com/v3.1/name/${encodeURIComponent(countryName)}?fullText=false`,
      {
        next: { revalidate: 604800 }, // Cache for 7 days (country data rarely changes)
      }
    );
    
    if (!response.ok) {
      console.warn(`REST Countries API error for ${countryName}: ${response.status}`);
      return undefined;
    }
    
    const data = await response.json();
    
    if (!data || data.length === 0) {
      return undefined;
    }
    
    const country = data[0];
    
    // Get the most recent Gini coefficient (if available)
    let gini: number | undefined;
    if (country.gini && typeof country.gini === 'object') {
      const years = Object.keys(country.gini);
      if (years.length > 0) {
        const latestYear = years.sort().reverse()[0];
        gini = country.gini[latestYear];
      }
    }
    
    return {
      name: country.name.common,
      region: country.region,
      subregion: country.subregion,
      population: country.population,
      gini,
      capitalInfo: country.capitalInfo,
    };
  } catch (error) {
    console.error(`Error fetching country info for ${countryName}:`, error);
    return undefined;
  }
}

/**
 * Get country info by ISO code
 */
export async function getCountryInfoByCode(code: string): Promise<CountryInfo | undefined> {
  try {
    const response = await fetch(
      `https://restcountries.com/v3.1/alpha/${code}`,
      {
        next: { revalidate: 604800 }, // Cache for 7 days
      }
    );
    
    if (!response.ok) {
      return undefined;
    }
    
    const data = await response.json();
    
    if (!data || data.length === 0) {
      return undefined;
    }
    
    const country = data[0];
    
    let gini: number | undefined;
    if (country.gini && typeof country.gini === 'object') {
      const years = Object.keys(country.gini);
      if (years.length > 0) {
        const latestYear = years.sort().reverse()[0];
        gini = country.gini[latestYear];
      }
    }
    
    return {
      name: country.name.common,
      region: country.region,
      subregion: country.subregion,
      population: country.population,
      gini,
      capitalInfo: country.capitalInfo,
    };
  } catch (error) {
    console.error(`Error fetching country info by code ${code}:`, error);
    return undefined;
  }
}
