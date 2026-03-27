import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API_KEY = '579b464db66ec23bdd0000019fc84f43ca52437351b43702f5998234';
const RESOURCE_ID = '98fa254e-c5f8-4910-a19b-4828939b477d';
const LIMIT = 1000;
const NATIONWIDE_FACILITY_CSV_URL = 'https://gist.githubusercontent.com/devdattaT/fd048577acc2f15b2ae210c17004f2eb/raw/vaccination.csv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outputPath = path.join(rootDir, 'public', 'health-facilities.json');

const VACCINES_AVAILABLE = [
  'BCG',
  'OPV',
  'Pentavalent',
  'Rotavirus',
  'PCV',
  'MR',
];

const GOVERNMENT_KEYWORDS = [
  /\bpublic\/\s*government\b/i,
  /\bgovernment\b/i,
  /\bgovt\b/i,
  /\bdistrict hospital\b/i,
  /\bsub[\s-]*district hospital\b/i,
  /\bcivil hospital\b/i,
  /\bcommunity health cent(?:re|er)\b/i,
  /\bprimary health cent(?:re|er)\b/i,
  /\burban primary health cent(?:re|er)\b/i,
  /\bpublic health cent(?:re|er)\b/i,
  /\bphc\b/i,
  /\buphc\b/i,
  /\bchc\b/i,
  /\buchc\b/i,
  /\bsub[\s-]*cent(?:re|er)\b/i,
  /\bhealth (?:sub )?cent(?:re|er)\b/i,
  /\brural hospital\b/i,
  /\btaluk hospital\b/i,
  /\barea hospital\b/i,
  /\bgeneral hospital\b/i,
  /\bmedical college\b/i,
  /\bdispensary\b/i,
  /\bayush\b/i,
  /\bbasti dawakhana\b/i,
  /\bdawakhana\b/i,
  /\baiims\b/i,
  /\besic\b/i,
  /\bcghs\b/i,
  /\binhs\b/i,
  /\brailway hospital\b/i,
  /\bcantonment hospital\b/i,
];

const STRONG_GOVERNMENT_KEYWORDS = [
  /\bpublic\/\s*government\b/i,
  /\bgovernment\b/i,
  /\bgovt\b/i,
  /\bdistrict hospital\b/i,
  /\bcivil hospital\b/i,
  /\bcommunity health cent(?:re|er)\b/i,
  /\bprimary health cent(?:re|er)\b/i,
  /\bphc\b/i,
  /\bchc\b/i,
  /\baiims\b/i,
  /\besic\b/i,
  /\bcghs\b/i,
  /\binhs\b/i,
  /\brailway hospital\b/i,
];

const PRIVATE_KEYWORDS = [
  /\bprivate\b/i,
  /\bpvt\b/i,
  /\blimited\b/i,
  /\bfertility\b/i,
  /\bivf\b/i,
  /\bdiagnostic\b/i,
  /\bnursing home\b/i,
  /\bmultispecial/i,
  /\bspeciality\b/i,
  /\bspecialty\b/i,
  /\bsuperspecial/i,
];

const PUBLIC_DIRECTORY_KEYWORDS = [
  /\bhospital\b/i,
  /\bhealth cent(?:re|er)\b/i,
  /\bdispensary\b/i,
  /\bmedical college\b/i,
  /\bwellness cent(?:re|er)\b/i,
  /\bsub[\s-]*cent(?:re|er)\b/i,
  /\bayush\b/i,
];

const HOSPITAL_PATTERN = /\bhospital\b|\bmedical college\b|\baiims\b|\bcivil hospital\b|\bdistrict hospital\b|\bgeneral hospital\b|\bsub[\s-]*district hospital\b|\barea hospital\b|\brailway hospital\b|\besic\b|\binhs\b|\bmch\b/i;
const PHC_PATTERN = /\buphc\b|\bphc\b|\bprimary health cent(?:re|er)\b|\burban primary health cent(?:re|er)\b|\bhealth and wellness cent(?:re|er)\b|\bhwc\b/i;
const CHC_PATTERN = /\buchc\b|\bchc\b|\bcommunity health cent(?:re|er)\b|\burban community health cent(?:re|er)\b|\bsub[\s-]*cent(?:re|er)\b/i;
const CLINIC_PATTERN = /\bdispensary\b|\bdawakhana\b|\bclinic\b|\bpolyclinic\b|\bayush\b/i;

const STATE_NAME_MAP = new Map([
  ['ANDAMAN & NICOBAR', 'Andaman and Nicobar Islands'],
  ['ANDAMAN AND NICOBAR', 'Andaman and Nicobar Islands'],
  ['ANDAMAN AND NICOBAR ISLANDS', 'Andaman and Nicobar Islands'],
  ['ANDHRA PRADESH', 'Andhra Pradesh'],
  ['ARUNACHAL PRADESH', 'Arunachal Pradesh'],
  ['ASSAM', 'Assam'],
  ['BIHAR', 'Bihar'],
  ['CHANDIGARH', 'Chandigarh'],
  ['CHHATTISGARH', 'Chhattisgarh'],
  ['DADAR & NAGAR HAVELI', 'Dadra and Nagar Haveli'],
  ['DADRA & NAGAR HAVELI', 'Dadra and Nagar Haveli'],
  ['DADRA AND NAGAR HAVELI', 'Dadra and Nagar Haveli'],
  ['DADRA AND NAGAR HAVELI AND DAMAN AND DIU', 'Dadra and Nagar Haveli and Daman and Diu'],
  ['DAMAN & DIU', 'Daman and Diu'],
  ['DAMAN AND DIU', 'Daman and Diu'],
  ['DELHI', 'Delhi'],
  ['GOA', 'Goa'],
  ['GUJARAT', 'Gujarat'],
  ['HARYANA', 'Haryana'],
  ['HIMACHAL PRADESH', 'Himachal Pradesh'],
  ['JAMMU AND KASHMIR', 'Jammu and Kashmir'],
  ['JHARKHAND', 'Jharkhand'],
  ['KARNATAKA', 'Karnataka'],
  ['KERALA', 'Kerala'],
  ['LADAKH', 'Ladakh'],
  ['LAKSHADWEEP', 'Lakshadweep'],
  ['MADHYA PRADESH', 'Madhya Pradesh'],
  ['MAHARASHTRA', 'Maharashtra'],
  ['MANIPUR', 'Manipur'],
  ['MEGHALAYA', 'Meghalaya'],
  ['MIZORAM', 'Mizoram'],
  ['NAGALAND', 'Nagaland'],
  ['ODISHA', 'Odisha'],
  ['ORISSA', 'Odisha'],
  ['PUDUCHERRY', 'Puducherry'],
  ['PONDICHERRY', 'Puducherry'],
  ['PUNJAB', 'Punjab'],
  ['RAJASTHAN', 'Rajasthan'],
  ['SIKKIM', 'Sikkim'],
  ['TAMIL NADU', 'Tamil Nadu'],
  ['TELANGANA', 'Telangana'],
  ['TRIPURA', 'Tripura'],
  ['UTTAR PRADESH', 'Uttar Pradesh'],
  ['UTTARAKHAND', 'Uttarakhand'],
  ['UTTARANCHAL', 'Uttarakhand'],
  ['WEST BENGAL', 'West Bengal'],
]);

function normalize(value) {
  return String(value || '').trim();
}

function titleCase(value) {
  return normalize(value)
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeStateName(value) {
  const normalized = normalize(value).replace(/\s+/g, ' ').toUpperCase();
  return STATE_NAME_MAP.get(normalized) || titleCase(normalized);
}

function uniqueValues(values) {
  const seen = new Set();
  return values.filter((value) => {
    const normalized = normalize(value);
    if (!normalized) return false;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseCoordinates(value) {
  const [latRaw, lngRaw] = String(value || '')
    .split(',')
    .map((part) => part.trim());
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  if (lat < 6 || lat > 38 || lng < 68 || lng > 98) {
    return null;
  }
  return { lat, lng };
}

function parseFlatCoordinates(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  if (lat < 6 || lat > 38 || lng < 68 || lng > 98) {
    return null;
  }
  return { lat, lng };
}

function getFacilityTypeFromText(text) {
  if (/\burban primary health cent(?:re|er)\b|\buphc\b/.test(text)) return 'uphc';
  if (/\burban community health cent(?:re|er)\b|\buchc\b/.test(text)) return 'uchc';
  if (/\bprimary health cent(?:re|er)\b|\bphc\b|\bhealth and wellness cent(?:re|er)\b|\bhwc\b/.test(text)) return 'phc';
  if (/\bcommunity health cent(?:re|er)\b|\bchc\b|\bsub[\s-]*cent(?:re|er)\b/.test(text)) return 'chc';
  if (/\bdawakhana\b/.test(text)) return 'basti_dawakhana';
  if (/\bayush\b/.test(text)) return 'ayush';
  if (/\bdispensary\b|\bclinic\b|\bpolyclinic\b/.test(text)) return 'peripheral_hospital';
  return 'major_hospital';
}

function getFacilityTypeLabel(type) {
  switch (type) {
    case 'phc':
      return 'Primary Health Centre';
    case 'uphc':
      return 'Urban Primary Health Centre';
    case 'chc':
      return 'Community Health Centre';
    case 'uchc':
      return 'Urban Community Health Centre';
    case 'basti_dawakhana':
      return 'Government Dawakhana';
    case 'ayush':
      return 'Ayush Facility';
    case 'peripheral_hospital':
      return 'Government Dispensary';
    default:
      return 'Government Hospital';
  }
}

function getOpenHours(type) {
  if (type === 'major_hospital' || type === 'peripheral_hospital') {
    return '24 Hours';
  }
  return 'Government OPD Hours';
}

function sanitizePhone(...values) {
  const phone = values
    .map((value) => normalize(value))
    .find((value) => value && value !== '0' && value.toUpperCase() !== 'NA');
  return phone || undefined;
}

function looksLikeGovernmentFacility(record) {
  const category = normalize(record.hospital_category);
  const name = normalize(record.hospital_name);
  const careType = normalize(record._hospital_care_type);
  const discipline = normalize(record._discipline_systems_of_medicine);
  const combined = `${name} ${category} ${careType} ${discipline}`;

  if (/public|government|govt/i.test(category)) {
    return true;
  }

  const hasGovernmentSignal = GOVERNMENT_KEYWORDS.some((pattern) => pattern.test(combined));
  if (/private/i.test(category)) {
    return STRONG_GOVERNMENT_KEYWORDS.some((pattern) => pattern.test(combined));
  }

  if (PRIVATE_KEYWORDS.some((pattern) => pattern.test(combined))) {
    return STRONG_GOVERNMENT_KEYWORDS.some((pattern) => pattern.test(combined));
  }

  if (hasGovernmentSignal) {
    return true;
  }

  return PUBLIC_DIRECTORY_KEYWORDS.some((pattern) => pattern.test(combined));
}

function looksLikeVaccinationFacility(text) {
  return HOSPITAL_PATTERN.test(text) || PHC_PATTERN.test(text) || CHC_PATTERN.test(text) || CLINIC_PATTERN.test(text);
}

function buildDirectoryAddress(record) {
  return uniqueValues([
    record._address_original_first_line,
    record.district,
    record.state,
    record._pincode,
  ]).join(', ');
}

function buildCsvAddress(record, district, state) {
  return uniqueValues([
    record.address,
    record.block,
    record.city,
    district,
    state,
    record.pincode,
  ]).join(', ');
}

function parseCsvRow(row) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < row.length; index += 1) {
    const char = row[index];
    if (char === '"') {
      if (inQuotes && row[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

async function fetchPage(offset) {
  const url = new URL(`https://api.data.gov.in/resource/${RESOURCE_ID}`);
  url.searchParams.set('api-key', API_KEY);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', String(LIMIT));
  url.searchParams.set('offset', String(offset));

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch data.gov.in hospitals (${response.status})`);
  }
  return response.json();
}

async function loadAllDirectoryRecords() {
  const firstPage = await fetchPage(0);
  const total = Number(firstPage.total || 0);
  const records = [...(firstPage.records || [])];

  for (let offset = LIMIT; offset < total; offset += LIMIT) {
    const page = await fetchPage(offset);
    records.push(...(page.records || []));
    process.stdout.write(`Fetched official directory ${Math.min(offset + LIMIT, total)} / ${total}\r`);
  }

  process.stdout.write('\n');
  return records;
}

async function loadNationwideCsvRows() {
  const response = await fetch(NATIONWIDE_FACILITY_CSV_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch nationwide facilities CSV (${response.status})`);
  }

  const csv = await response.text();
  const lines = csv.split(/\r?\n/).filter(Boolean);
  if (lines.length <= 1) return [];

  const header = parseCsvRow(lines[0]);
  const indexByKey = Object.fromEntries(header.map((key, index) => [key, index]));

  return lines.slice(1).map((line) => {
    const values = parseCsvRow(line);
    return Object.fromEntries(header.map((key, index) => [key, values[index] || '']));
  }).filter((row) => normalize(row.categoryname) === 'Health Facilities All States');
}

function dedupeKey(name, lat, lng) {
  return `${normalize(name).toLowerCase()}|${lat.toFixed(5)}|${lng.toFixed(5)}`;
}

function transformDirectoryRecords(records) {
  const facilities = [];
  const seen = new Set();

  for (const record of records) {
    const coordinates = parseCoordinates(record._location_coordinates);
    if (!coordinates) continue;
    if (!looksLikeGovernmentFacility(record)) continue;

    const idBase = normalize(record._sr_no) || `${normalize(record.hospital_name)}-${coordinates.lat}-${coordinates.lng}`;
    const name = normalize(record.hospital_name);
    if (!name) continue;

    const key = dedupeKey(name, coordinates.lat, coordinates.lng);
    if (seen.has(key)) continue;
    seen.add(key);

    const type = getFacilityTypeFromText(`${normalize(record.hospital_name)} ${normalize(record._hospital_care_type)} ${normalize(record._discipline_systems_of_medicine)}`.toLowerCase());
    const district = titleCase(record.district);
    const state = normalizeStateName(record.state);

    facilities.push({
      id: `govdir-${idBase}`,
      name,
      type,
      facilityType: getFacilityTypeLabel(type),
      city: district || state || 'India',
      district: district || undefined,
      state: state || undefined,
      address: buildDirectoryAddress(record),
      lat: coordinates.lat,
      lng: coordinates.lng,
      isFree: true,
      openHours: getOpenHours(type),
      vaccinesAvailable: VACCINES_AVAILABLE,
      phone: sanitizePhone(record.telephone, record.mobile_number, record.emergency_num),
      pincode: normalize(record._pincode) || undefined,
      source: 'data.gov.in',
    });
  }

  return { facilities, seen };
}

function transformCsvRows(rows, seen) {
  const facilities = [];

  for (const row of rows) {
    const coordinates = parseFlatCoordinates(row.latitude, row.longitude);
    if (!coordinates) continue;

    const name = normalize(row.name);
    if (!name) continue;

    const signalText = `${name} ${normalize(row.address)} ${normalize(row.block)} ${normalize(row.city)}`;
    if (!looksLikeVaccinationFacility(signalText)) continue;

    const district = titleCase(row.district);
    const state = normalizeStateName(row.state);
    const key = dedupeKey(name, coordinates.lat, coordinates.lng);
    if (seen.has(key)) continue;
    seen.add(key);

    const type = getFacilityTypeFromText(signalText.toLowerCase());
    const city = titleCase(row.city) || titleCase(row.block) || district || state || 'India';

    facilities.push({
      id: `csv-${district.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'facility'}-${coordinates.lat.toFixed(5)}-${coordinates.lng.toFixed(5)}`,
      name: titleCase(name),
      type,
      facilityType: getFacilityTypeLabel(type),
      city,
      district: district || undefined,
      state: state || undefined,
      address: buildCsvAddress(row, district, state),
      lat: coordinates.lat,
      lng: coordinates.lng,
      isFree: true,
      openHours: getOpenHours(type),
      vaccinesAvailable: VACCINES_AVAILABLE,
      phone: sanitizePhone(row.mobile, row.contact),
      pincode: normalize(row.pincode) || undefined,
      source: 'nationwide-health-facilities-csv',
    });
  }

  return facilities;
}

function sortFacilities(facilities) {
  facilities.sort((left, right) =>
    `${left.state || ''}|${left.district || ''}|${left.name}`.localeCompare(
      `${right.state || ''}|${right.district || ''}|${right.name}`,
      'en'
    )
  );

  return facilities;
}

async function main() {
  console.log('Fetching official government hospital directory...');
  const directoryRecords = await loadAllDirectoryRecords();

  console.log('Fetching nationwide public health facilities...');
  const nationwideRows = await loadNationwideCsvRows();

  const { facilities: officialFacilities, seen } = transformDirectoryRecords(directoryRecords);
  const nationwideFacilities = transformCsvRows(nationwideRows, seen);
  const facilities = sortFacilities([...officialFacilities, ...nationwideFacilities]);

  await fs.writeFile(outputPath, JSON.stringify(facilities, null, 2), 'utf8');
  console.log(`Saved ${facilities.length} facilities to ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
