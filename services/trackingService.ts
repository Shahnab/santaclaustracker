
import { TrackingLocation } from '../types';

// Ordered from West to East (-11 to +14) following Christmas as midnight arrives
// Santa follows the midnight line as it moves westward around Earth
export const TRACKING_STATIONS: TrackingLocation[] = [
  { name: 'MIDWAY', offset: -11, region: 'PACIFIC', coordinates: [28.2072, -177.3735] },
  { name: 'HONOLULU', offset: -10, region: 'PACIFIC', coordinates: [21.3069, -157.8583] },
  { name: 'ANCHORAGE', offset: -9, region: 'N. AMERICA', coordinates: [61.2181, -149.9003] },
  { name: 'LOS ANGELES', offset: -8, region: 'N. AMERICA', coordinates: [34.0522, -118.2437] },
  { name: 'DENVER', offset: -7, region: 'N. AMERICA', coordinates: [39.7392, -104.9903] },
  { name: 'CHICAGO', offset: -6, region: 'N. AMERICA', coordinates: [41.8781, -87.6298] },
  { name: 'NEW YORK', offset: -5, region: 'N. AMERICA', coordinates: [40.7128, -74.0060] },
  { name: 'CARACAS', offset: -4, region: 'S. AMERICA', coordinates: [10.4806, -66.9036] },
  { name: 'RIO DE JANEIRO', offset: -3, region: 'S. AMERICA', coordinates: [-22.9068, -43.1729] },
  { name: 'CAPE VERDE', offset: -1, region: 'ATLANTIC', coordinates: [14.9330, -23.5133] },
  { name: 'LONDON', offset: 0, region: 'EUROPE', coordinates: [51.5074, -0.1278] },
  { name: 'PARIS', offset: 1, region: 'EUROPE', coordinates: [48.8566, 2.3522] },
  { name: 'CAIRO', offset: 2, region: 'AFRICA', coordinates: [30.0444, 31.2357] },
  { name: 'MOSCOW', offset: 3, region: 'RUSSIA', coordinates: [55.7558, 37.6173] },
  { name: 'NAIROBI', offset: 3, region: 'AFRICA', coordinates: [-1.2864, 36.8172] },
  { name: 'DUBAI', offset: 4, region: 'MIDDLE EAST', coordinates: [25.2048, 55.2708] },
  { name: 'TEHRAN', offset: 3.5, region: 'MIDDLE EAST', coordinates: [35.6892, 51.3890] },
  { name: 'MUMBAI', offset: 5.5, region: 'ASIA', coordinates: [19.0760, 72.8777] },
  { name: 'NEW DELHI', offset: 5.5, region: 'ASIA', coordinates: [28.6139, 77.2090] },
  { name: 'DHAKA', offset: 6, region: 'ASIA', coordinates: [23.8103, 90.4125] },
  { name: 'BANGKOK', offset: 7, region: 'ASIA', coordinates: [13.7563, 100.5018] },
  { name: 'JAKARTA', offset: 7, region: 'ASIA', coordinates: [-6.2088, 106.8456] },
  { name: 'BEIJING', offset: 8, region: 'ASIA', coordinates: [39.9042, 116.4074] },
  { name: 'TOKYO', offset: 9, region: 'ASIA', coordinates: [35.6762, 139.6503] },
  { name: 'GUAM', offset: 10, region: 'PACIFIC', coordinates: [13.4443, 144.7937] },
  { name: 'SYDNEY', offset: 11, region: 'AUSTRALIA', coordinates: [-33.8688, 151.2093] },
  { name: 'KAMCHATKA', offset: 12, region: 'RUSSIA', coordinates: [56.1327, 159.5314] },
  { name: 'AUCKLAND', offset: 13, region: 'NEW ZEALAND', coordinates: [-36.8509, 174.7645] },
  { name: 'KIRITIMATI', offset: 14, region: 'PACIFIC', coordinates: [1.8709, -157.4014] },
];

const NORTH_POLE_COORDS: [number, number] = [90, 0];

export const getSantaLocation = (): { 
    location: TrackingLocation, 
    localTime: string, 
    isChristmas: boolean,
    visitedLocations: [number, number][],
    plannedRoute: [number, number][]
} => {
  const now = new Date();
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  const utcDecimalHours = utcHours + (utcMinutes / 60);
  
  // Mission Logic:
  // Santa follows Christmas westward as midnight Dec 26 progresses around the world
  // He stays at a location WHILE it's December 25th there (00:00 Dec 25 to 23:59 Dec 25)
  // He moves to the next timezone westward when Dec 26 00:00 arrives in current location
  
  let currentStation: TrackingLocation;
  let visited: [number, number][] = [];
  
  // Sort stations from East to West (highest offset to lowest)
  const stationsByTimezone = [...TRACKING_STATIONS].sort((a, b) => b.offset - a.offset);
  
  // Find the station where Christmas is closest to ending (closest to Dec 26 00:01 AM local time)
  let currentStationIndex = -1;
  let smallestTimeToMidnight = Infinity;
  
  for (let i = 0; i < stationsByTimezone.length; i++) {
    const station = stationsByTimezone[i];
    
    // Calculate the actual local time in this timezone
    const localTime = new Date(now.getTime() + station.offset * 60 * 60 * 1000);
    const localMonth = localTime.getUTCMonth();
    const localDate = localTime.getUTCDate();
    const localHours = localTime.getUTCHours();
    const localMinutes = localTime.getUTCMinutes();
    
    // Check if it's December 25th in this timezone
    if (localMonth === 11 && localDate === 25) {
      // Calculate minutes until Dec 26 00:01 AM
      const minutesUntilMidnight = (24 - localHours) * 60 - localMinutes + 1;
      
      // Find the location where Christmas is ending soonest (smallest time to midnight)
      if (minutesUntilMidnight < smallestTimeToMidnight) {
        smallestTimeToMidnight = minutesUntilMidnight;
        currentStationIndex = i;
      }
    }
  }
  
  // Pre-launch: Before Christmas starts anywhere (before Dec 24 10:00 UTC when UTC+14 hits midnight)
  // Calculate if Christmas has started in the first timezone (UTC+14)
  const firstStation = stationsByTimezone[0]; // UTC+14
  const firstStationLocalTime = new Date(now.getTime() + firstStation.offset * 60 * 60 * 1000);
  const christmasNotStarted = firstStationLocalTime.getUTCMonth() === 11 && firstStationLocalTime.getUTCDate() < 25;
  
  if (christmasNotStarted) {
    // Still at North Pole, Christmas hasn't started anywhere yet
    currentStation = { 
      name: 'NORTH POLE', 
      region: 'ARCTIC', 
      offset: 0, 
      coordinates: NORTH_POLE_COORDS 
    };
    visited = [NORTH_POLE_COORDS];
  }
  // Active mission: Christmas is happening in at least one timezone
  else if (currentStationIndex >= 0) {
    currentStation = stationsByTimezone[currentStationIndex];
    
    // Build visited list: North Pole + all stations where Christmas has ended (indices 0 to currentIndex)
    visited = [NORTH_POLE_COORDS];
    for (let i = 0; i <= currentStationIndex; i++) {
      visited.push(stationsByTimezone[i].coordinates);
    }
  }
  // Mission complete: Christmas has ended everywhere
  else {
    currentStation = { 
      name: 'NORTH POLE', 
      region: 'ARCTIC', 
      offset: 0, 
      coordinates: NORTH_POLE_COORDS 
    };
    visited = [NORTH_POLE_COORDS];
    for (let i = 0; i < stationsByTimezone.length; i++) {
      visited.push(stationsByTimezone[i].coordinates);
    }
    visited.push(NORTH_POLE_COORDS);
  }

  // Calculate local time for display
  const totalMinutes = (utcHours * 60) + utcMinutes + (currentStation.offset * 60);
  const localH = Math.floor((totalMinutes / 60) % 24 + 24) % 24;
  const localM = Math.floor(totalMinutes % 60);
  const localTimeString = `${localH.toString().padStart(2, '0')}:${localM.toString().padStart(2, '0')}`;

  // Build full planned route (East to West using sorted stations)
  const fullRoute: [number, number][] = [NORTH_POLE_COORDS];
  for (let i = 0; i < stationsByTimezone.length; i++) {
      fullRoute.push(stationsByTimezone[i].coordinates);
  }
  fullRoute.push(NORTH_POLE_COORDS); // Return home

  return {
    location: currentStation,
    localTime: localTimeString,
    isChristmas: now.getDate() === 25 && now.getMonth() === 11,
    visitedLocations: visited,
    plannedRoute: fullRoute
  };
};

export const calculateGifts = (): number => {
    const now = new Date();
    return 4500000000 + (now.getTime() % 10000000) * 15;
};

// --- LOGIC DRIVEN INTEL ---

const REGION_LOGS: Record<string, string[]> = {
  'PACIFIC': ['PACIFIC COMMAND: RADAR CONTACT CONFIRMED', 'OCEANIC SENSORS DETECT SLEIGH WAKE', 'US NAVY FLEET REPORTS VISUAL', 'TROPICAL WEATHER SYSTEMS: CLEAR'],
  'NEW ZEALAND': ['KIWI SECTOR: AIRSPACE CLEAR', 'SOUTHERN CROSS VISUAL CONFIRMED', 'WELLINGTON CONTROL: GREETINGS'],
  'AUSTRALIA': ['RAAF INTERCEPTORS SCRAMBLED FOR ESCORT', 'OUTBACK SENSORS ONLINE', 'OPERATING IN SOUTHERN HEMISPHERE'],
  'ASIA': ['HIGH DENSITY POPULATION SECTOR', 'MANEUVERING AROUND SKYSCRAPERS', 'ORIENTAL AIR DEFENSE: FRIENDLY', 'SPEED INCREASED FOR DENSITY'],
  'RUSSIA': ['ENTERING RUSSIAN FEDERATION AIRSPACE', 'SIBERIAN THERMAL ANOMALY DETECTED', 'COSMODROME TRACKING ACTIVE'],
  'EUROPE': ['NATO EYES ONLY: TARGET TRACKING ACTIVE', 'ALPINE RADAR ECHOES', 'EU AIR TRAFFIC CONTROL: PRIORITY CLEARANCE'],
  'AFRICA': ['SAHARA THERMAL PLUME STABLE', 'EQUATORIAL CROSSING CONFIRMED', 'CONTINENTAL SCANS: GREEN'],
  'ATLANTIC': ['MID-ATLANTIC RIDGE SENSORS ACTIVE', 'CARRIER GROUP REPORTS FLYBY', 'METEOROLOGICAL DATA: HEADWINDS'],
  'N. AMERICA': ['NORAD MAIN SENSORS: 100% CONFIDENCE', 'EAST COAST DEFENSE GRID: GREEN', 'CANADIAN NORAD REGION: CONTACT', 'FIGHTER WING DEPLOYED AS HONOR GUARD'],
  'S. AMERICA': ['SOUTHERN CONE RADAR: ACTIVE', 'AMAZON BASIN THERMAL SCAN: CLEAR'],
  'MIDDLE EAST': ['DESERT SENSORS ONLINE', 'AIRSPACE CORRIDOR SECURED'],
  'ARCTIC': ['POLAR VORTEX NAVIGATION ENGAGED', 'HOME BASE TELEMETRY LINKED', 'AURORA BOREALIS INTERFERENCE: NEGLIGIBLE']
};

const ACTION_LOGS = [
    "TARGET LOCKED: %LOC%",
    "INITIATING DELIVERY SEQUENCE: %LOC%",
    "THERMAL SPIKE DETECTED OVER %LOC%",
    "DROPPING TO ROOFTOP ALTITUDE: %LOC%",
    "SONIC BOOM REPORTED NEAR %LOC%",
    "LOCAL AUTHORITIES IN %LOC% NOTIFIED",
    "HYPER-SPEED JUMP TO %LOC% COMPLETE",
    "MAGIC DUST LEVELS: NOMINAL",
    "TIME DILATION FIELD: ACTIVE",
    "CHIMNEY ENTRY PROTOCOL: INITIATED"
];

const GENERIC_LOGS = [
    "RADAR CONTACT: CONFIRMED // ID: RED SLED",
    "THERMAL SIGNATURE STABLE // EGT NORMAL",
    "AIRSPACE CLEARED FOR TRANSIT",
    "GROUND SENSORS DETECT HIGH VELOCITY OBJECT",
    "COMM CHATTER: 'MERRY CHRISTMAS' DETECTED",
    "REINDEER PROPULSION SYSTEMS NOMINAL",
    "CLOAKING DEVICE: DISENGAGED FOR LANDING",
    "INTERCEPT SQUADRON RTB // TARGET FRIENDLY",
    "ATMOSPHERIC ENTRY DETECTED // SHIELDS HOLDING",
    "TRAJECTORY ALIGNMENT: OPTIMAL",
    "VISIBILITY: UNLIMITED // CEILING: 50,000 FT"
];

export const generateIntelMessage = (locationName: string, region: string, speed: number, delivered: number): string => {
    // 1. Special Handling for North Pole (Start/End)
    if (locationName === 'NORTH POLE') {
        const templates = [
            "MISSION STATUS: STANDBY / DEBRIEF",
            "ELVES LOADING FINAL PAYLOAD MANIFEST",
            "PRE-FLIGHT DIAGNOSTICS: ALL GREEN",
            "AWAITING LAUNCH WINDOW // UTC 10:00",
            "MAINTENANCE CREWS ATTENDING RED SLED",
            "REINDEER FEEDING IN PROGRESS"
        ];
        return templates[Math.floor(Math.random() * templates.length)];
    }

    const rand = Math.random();

    // 2. High Probability: Location Specific Action (40%)
    if (rand < 0.4) {
        const tmpl = ACTION_LOGS[Math.floor(Math.random() * ACTION_LOGS.length)];
        return tmpl.replace('%LOC%', locationName);
    }

    // 3. Medium Probability: Region Specific Chatter (30%)
    if (rand < 0.7 && REGION_LOGS[region]) {
        const regionLogs = REGION_LOGS[region];
        return regionLogs[Math.floor(Math.random() * regionLogs.length)];
    }

    // 4. Low Probability: Stats (15%)
    if (rand < 0.85) {
        if (Math.random() > 0.5) {
             return `CURRENT VELOCITY: MACH ${speed.toFixed(2)} // HULL INTEGRITY 100%`;
        } else {
             return `PAYLOAD UPDATE: ${(delivered / 1000000000).toFixed(3)}B UNITS CONFIRMED`;
        }
    }
    
    // 5. Fallback: Generic (15%)
    return GENERIC_LOGS[Math.floor(Math.random() * GENERIC_LOGS.length)];
}
