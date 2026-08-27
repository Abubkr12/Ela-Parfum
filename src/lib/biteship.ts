/**
 * Shared Biteship API Helper
 * Single source of truth for API key, URL, and store locations.
 */

// Store locations with full addresses and postal codes
export const STORE_LOCATIONS: Record<string, { name: string; address: string; postalCode: number; latitude: number; longitude: number }> = {
  // Condet
  'IDNP6IDNC149IDND851': {
    name: 'Condet',
    address: 'Jl. Raya Condet No.1, RT.1/RW.15, Cililitan, Kec. Kramat Jati, Kota Jakarta Timur, DKI Jakarta',
    postalCode: 13640,
    latitude: -6.273614,
    longitude: 106.864353
  },
  'IDNP6IDNC146IDND825': {
    name: 'Rawa Belong',
    address: 'Jl. Raya Kb. Jeruk No.57B, RT.8/RW.15, Palmerah, Kec. Palmerah, Kota Jakarta Barat, DKI Jakarta',
    postalCode: 11530,
    latitude: -6.203143062983029,
    longitude: 106.7829087161463
  },
  'IDNP3IDNC445IDND5590': {
    name: 'Tangerang',
    address: 'Jl. Pd. Kacang No.36, RT.002/RW.005, Parung Serab, Kec. Ciledug, Kota Tangerang, Banten',
    postalCode: 15226,
    latitude: -6.241334,
    longitude: 106.702758
  }
};

/**
 * Returns the correct API key based on BITESHIP_IS_SANDBOX env var.
 * Sandbox uses biteship_test.* key, production uses biteship_live.* key.
 */
export function getBiteshipKey(): string {
  const isSandbox = process.env.BITESHIP_IS_SANDBOX === 'true';
  return (isSandbox ? process.env.BITESHIP_SANDBOX_API_KEY : process.env.BITESHIP_API_KEY) || '';
}

/**
 * Biteship uses the SAME URL for both sandbox and production.
 * Environment is determined solely by the API key prefix.
 */
export const BITESHIP_API_URL = 'https://api.biteship.com';

/**
 * Default package dimensions and weight calculation.
 * Weight = product volume (ml) + 500g base (packaging + bubble wrap).
 * Dimensions = 25x25x12 cm (standard box).
 */
export function calcPackageWeight(volumeMl: number, quantity: number = 1): number {
  return (volumeMl + 500) * quantity;
}

export const DEFAULT_DIMENSIONS = {
  length: 25,
  width: 25,
  height: 12
};

/**
 * Extract 5-digit postal code from an Indonesian address string.
 */
export function extractPostalCode(address: string): number | undefined {
  const match = address.match(/\b(\d{5})\b/);
  return match ? parseInt(match[1], 10) : undefined;
}

/**
 * Parse courier string like "JNE - REG" or "Grab - Same Day" into company + type.
 */
export function parseCourier(courierString: string): { company: string; type: string } {
  const parts = courierString.split('-');
  let company = (parts[0]?.trim() || 'jne').toLowerCase();
  let type = (parts[1]?.trim() || 'reg').toLowerCase();
  
  // Normalize courier names to Biteship codes
  if (company === 'j&t') company = 'jnt';
  if (company === 'j & t') company = 'jnt';
  
  // Map service names to codes
  const typeMap: Record<string, string> = {
    'same day': 'same_day',
    'sameday': 'same_day',
    'instant': 'instant',
    'reguler': 'reg',
    'regular': 'reg',
    'economy': 'eco',
    'express': 'exp',
    'motorcycle': 'motorcycle',
  };
  type = typeMap[type] || type;
  
  return { company, type };
}
