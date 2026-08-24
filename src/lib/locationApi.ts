import { getAuthToken } from './api';

const LOCATION_API_URL =
  'https://yenerp.com/masteradminapi';

export interface LocationApiItem {
  locationId?: string;
  location_id?: string;
  branchName?: string;
  branch_name?: string;
  aliasName?: string;
  alias_name?: string;
  name?: string;
  status?: string;
  type?: string;
  [key: string]: unknown;
}

let locationsCache: LocationApiItem[] | null = null;
let locationsPromise: Promise<LocationApiItem[]> | null = null;

const CACHE_TIME = 10 * 60 * 1000; // 10 minutes

let locationsCacheTime = 0;

export async function getLocations(
  forceRefresh = false
): Promise<LocationApiItem[]> {

  // Return cached locations if still valid
  if (
    !forceRefresh &&
    locationsCache &&
    Date.now() - locationsCacheTime < CACHE_TIME
  ) {
    return locationsCache;
  }

  // If a request is already running, reuse it
  if (!forceRefresh && locationsPromise) {
    return locationsPromise;
  }

  const token = getAuthToken();

  locationsPromise = fetch(
    `${LOCATION_API_URL}/locations/`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...(token
          ? { Authorization: `Bearer ${token}` }
          : {}),
      },
    }
  )
    .then(async res => {
      const json = await res.json();

      if (!res.ok) {
        throw new Error(
          json?.detail ||
          json?.message ||
          `Failed to load locations: ${res.status}`
        );
      }

      let locations: LocationApiItem[] = [];

      if (Array.isArray(json)) {
        locations = json;
      } else if (Array.isArray(json?.data)) {
        locations = json.data;
      } else if (Array.isArray(json?.locations)) {
        locations = json.locations;
      } else if (Array.isArray(json?.data?.locations)) {
        locations = json.data.locations;
      }

      locationsCache = locations;
      locationsCacheTime = Date.now();

      return locations;
    })
    .finally(() => {
      locationsPromise = null;
    });

  return locationsPromise;
}

export function clearLocationsCache() {
  locationsCache = null;
  locationsCacheTime = 0;
}