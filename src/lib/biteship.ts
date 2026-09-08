/**
 * Shared Biteship API Helper
 * Single source of truth for API key, URL, and store locations.
 */

// Store locations with full addresses, exact coordinates, and postal codes
export const STORE_LOCATIONS: Record<string, { name: string; address: string; postalCode: number; latitude: number; longitude: number }> = {
  // Condet
  'IDNP6IDNC149IDND851': {
    name: 'Condet',
    address: 'Jl. Raya Condet No.1, RT.1/RW.15, Cililitan, Kec. Kramat jati, Kota Jakarta Timur, Daerah Khusus Ibukota Jakarta 13640',
    postalCode: 13640,
    latitude: -6.263281646322936,
    longitude: 106.86484090895478
  },
  // Rawa Belong
  'IDNP6IDNC146IDND825': {
    name: 'Rawa Belong',
    address: 'Jl. Raya Kb. Jeruk No.57B, RT.8/RW.15, Palmerah, Kec. Palmerah, Kota Jakarta Barat, Daerah Khusus Ibukota Jakarta 11530',
    postalCode: 11530,
    latitude: -6.202968871424059,
    longitude: 106.78298439693361
  },
  // Tangerang
  'IDNP3IDNC446IDND5630': {
    name: 'Tangerang',
    address: 'Jl. Pd. Kacang No.36, RT.002/RW.005, Parung Serab, Kec. Ciledug, Kota Tangerang, Banten 15226',
    postalCode: 15226,
    latitude: -6.244325229406331,
    longitude: 106.69862467974234
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
 * Parse courier string like "JNE - REG", "JNE - Yakin Esok Sampai (YES)", "J&T - EZ"
 * or extract from order notes (CourierCompany / CourierService)
 * into valid Biteship { company, type } codes.
 */
export function parseCourier(courierString: string, notes?: string): { company: string; type: string } {
  // 1. First priority: Check explicit metadata in notes
  if (notes) {
    const compMatch = notes.match(/CourierCompany:\s*([^|]+)/i);
    const serviceMatch = notes.match(/CourierService:\s*([^|]+)/i);
    let comp = compMatch ? compMatch[1].trim().toLowerCase() : '';
    let typ = serviceMatch ? serviceMatch[1].trim().toLowerCase() : '';
    if (comp === 'j&t' || comp === 'j & t') comp = 'jnt';
    if (comp && typ) {
      return { company: comp, type: typ };
    }
  }

  // 2. Parse from courier string (e.g. "JNE - Yakin Esok Sampai (YES)")
  const raw = (courierString || '').trim();
  const parts = raw.split('-');
  const rawCompany = (parts[0] || '').trim().toLowerCase();
  const rawService = (parts.slice(1).join('-') || '').trim().toLowerCase();

  // Normalize company
  let company = 'jne';
  if (rawCompany.includes('j&t') || rawCompany.includes('jnt') || rawCompany.includes('j & t')) company = 'jnt';
  else if (rawCompany.includes('jne')) company = 'jne';
  else if (rawCompany.includes('sicepat')) company = 'sicepat';
  else if (rawCompany.includes('anteraja')) company = 'anteraja';
  else if (rawCompany.includes('ninja')) company = 'ninja';
  else if (rawCompany.includes('wahana')) company = 'wahana';
  else if (rawCompany.includes('tiki')) company = 'tiki';
  else if (rawCompany.includes('pos')) company = 'pos';
  else if (rawCompany.includes('lion')) company = 'lion';
  else if (rawCompany.includes('gojek') || rawCompany.includes('gosend')) company = 'gojek';
  else if (rawCompany.includes('grab')) company = 'grab';
  else if (rawCompany.includes('lalamove')) company = 'lalamove';
  else if (rawCompany.includes('id express') || rawCompany.includes('idx')) company = 'ide';
  else company = rawCompany || 'jne';

  // Check code inside parenthesis, e.g. "Yakin Esok Sampai (YES)" -> "yes"
  const parenMatch = rawService.match(/\(([^)]+)\)/);
  const codeInParen = parenMatch ? parenMatch[1].trim().toLowerCase() : '';

  let type = 'reg';
  if (company === 'jne') {
    if (codeInParen === 'yes' || rawService.includes('yes') || rawService.includes('yakin esok')) type = 'yes';
    else if (codeInParen === 'oke' || rawService.includes('oke') || rawService.includes('ekonomis')) type = 'oke';
    else if (codeInParen === 'jtr' || rawService.includes('jtr') || rawService.includes('trucking')) type = 'jtr';
    else if (codeInParen === 'sps' || rawService.includes('sps') || rawService.includes('super speed')) type = 'sps';
    else if (rawService.includes('ctcyes') || rawService.includes('ctc yes')) type = 'ctcyes';
    else if (rawService.includes('ctc')) type = 'ctc';
    else type = 'reg';
  } else if (company === 'jnt') {
    if (codeInParen === 'ez' || rawService.includes('ez')) type = 'ez';
    else if (rawService.includes('super')) type = 'super';
    else if (rawService.includes('jemari')) type = 'jemari';
    else if (rawService.includes('cargo') || rawService.includes('kargo')) type = 'jnt_cargo';
    else type = 'ez';
  } else if (company === 'sicepat') {
    if (rawService.includes('best')) type = 'best';
    else if (rawService.includes('gokil') || rawService.includes('cargo') || rawService.includes('kargo')) type = 'gokil';
    else if (rawService.includes('halu')) type = 'halu';
    else if (rawService.includes('siuntung')) type = 'siuntung';
    else type = 'reg';
  } else if (company === 'anteraja') {
    if (rawService.includes('same day') || rawService.includes('sameday')) type = 'same_day';
    else if (rawService.includes('next day') || rawService.includes('nextday')) type = 'next_day';
    else if (rawService.includes('cargo') || rawService.includes('kargo')) type = 'cargo';
    else type = 'reg';
  } else if (company === 'ninja') {
    if (rawService.includes('next day') || rawService.includes('nextday')) type = 'next_day';
    else type = 'standard';
  } else if (company === 'wahana') {
    if (rawService.includes('next day') || rawService.includes('nextday')) type = 'next_day';
    else if (rawService.includes('cargo') || rawService.includes('kargo')) type = 'kargo';
    else type = 'normal';
  } else if (company === 'tiki') {
    if (rawService.includes('ons')) type = 'ons';
    else if (rawService.includes('eco')) type = 'eco';
    else if (rawService.includes('sds')) type = 'sds';
    else type = 'reg';
  } else if (company === 'pos') {
    if (rawService.includes('next day') || rawService.includes('nextday')) type = 'pos_next_day';
    else type = 'pos_reguler';
  } else if (company === 'lion') {
    if (rawService.includes('onepack') || rawService.includes('one pack')) type = 'onepack';
    else if (rawService.includes('jagopack') || rawService.includes('jago pack')) type = 'jagopack';
    else if (rawService.includes('landpack') || rawService.includes('land pack')) type = 'landpack';
    else type = 'regpack';
  } else if (company === 'gojek') {
    if (rawService.includes('same day') || rawService.includes('sameday')) type = 'same_day';
    else type = 'instant';
  } else if (company === 'grab') {
    if (rawService.includes('same day') || rawService.includes('sameday')) type = 'same_day';
    else type = 'instant';
  } else if (company === 'lalamove') {
    if (rawService.includes('car') || rawService.includes('mobil')) type = 'car';
    else if (rawService.includes('sedan')) type = 'sedan';
    else if (rawService.includes('van')) type = 'van';
    else if (rawService.includes('pickup') || rawService.includes('bak')) type = 'pickup';
    else type = 'motorcycle';
  } else {
    if (codeInParen) type = codeInParen;
    else if (rawService.includes('reg')) type = 'reg';
    else if (rawService.includes('instant')) type = 'instant';
    else if (rawService.includes('same')) type = 'same_day';
    else type = rawService.replace(/\s+/g, '_') || 'reg';
  }

  return { company, type };
}
