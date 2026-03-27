export interface BookingFacilityLike {
  id: string;
  name: string;
  type: string;
  facilityType: string;
  city: string;
  address: string;
}

export interface SessionSite {
  id: string;
  siteName: string;
  siteCode: string;
  address: string;
}

export interface DaySlot {
  date: Date;
  available: boolean;
  time: string;
  capacity: number;
  booked: number;
}

export function generateSessionSites(facility: BookingFacilityLike): SessionSite[] {
  return [
    {
      id: 's1',
      siteName: `SESSION SITE : HRA ${facility.name.slice(0, 25).toUpperCase()}`,
      siteCode: 'GOVT',
      address: facility.address,
    },
    {
      id: 's2',
      siteName: `SESSION SITE : ${facility.facilityType.toUpperCase()} - WING A`,
      siteCode: 'GOVT',
      address: `${facility.address} - Wing A`,
    },
    {
      id: 's3',
      siteName: `SESSION SITE : MOBILE OUTREACH - ${facility.city.toUpperCase()}`,
      siteCode: 'GOVT',
      address: `Outreach Camp, ${facility.city}`,
    },
  ];
}

export function generateDaySlots(facilityId: string, siteId: string): Record<string, DaySlot> {
  const slots: Record<string, DaySlot> = {};
  const today = new Date();
  const hash = (facilityId + siteId).split('').reduce((total, part) => total + part.charCodeAt(0), 0);
  const times = ['09:00 AM - 01:00 PM', '09:00 AM - 03:00 PM', '10:00 AM - 02:00 PM', '02:00 PM - 05:00 PM'];

  for (let index = 0; index < 7; index += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    const key = date.toDateString();
    const pseudoRandom = (hash + index * 37) % 10;
    const available = pseudoRandom < 7;
    const capacity = 20 + ((hash + index) % 11);
    const booked = available ? Math.floor(capacity * (pseudoRandom / 10)) : capacity;
    slots[key] = {
      date,
      available: available && booked < capacity,
      time: times[(hash + index) % times.length],
      capacity,
      booked,
    };
  }

  return slots;
}

export function findFirstAvailableSlot(facility: BookingFacilityLike) {
  const sessionSites = generateSessionSites(facility);
  const slotsPerSite = Object.fromEntries(
    sessionSites.map((site) => [site.id, generateDaySlots(facility.id, site.id)]),
  );

  for (const site of sessionSites) {
    const siteSlots = slotsPerSite[site.id];
    for (const slot of Object.values(siteSlots)) {
      if (slot.available) {
        return {
          site,
          slot,
        };
      }
    }
  }

  return null;
}

