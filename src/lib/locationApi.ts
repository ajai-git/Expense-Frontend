import { getAuthToken } from './api';

const LOCATION_API_URL =
  import.meta.env.VITE_LOCATION_API_URL ||
  'https://yenerp.com/demoapi1';

export async function getLocations() {
  const token = getAuthToken();

  const res = await fetch(
    `${LOCATION_API_URL}/locations/overall`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...(token
          ? { Authorization: `Bearer ${token}` }
          : {}),
      },
    }
  );

  const json = await res.json();

  console.log('LOCATION API STATUS:', res.status);
  console.log('LOCATION API RESPONSE:', json);

  if (!res.ok) {
    throw new Error(
      json?.detail ||
      json?.message ||
      `Failed to load locations: ${res.status}`
    );
  }

  return Array.isArray(json)
    ? json
    : json?.data ?? [];
}