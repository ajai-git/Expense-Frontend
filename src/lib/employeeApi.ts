import { Employee } from '../types';

const EMPLOYEE_API_URL =
  'https://yenerp.com/fluttertestapi/employees/';

const CACHE_TTL_MS = 5 * 60 * 1000;

interface EmployeeApiResponse {
  employeeId: string;
  employeeNumber: string;
  firstName: string;
  lastname: string | null;
  position: string | null;
  status: string | null;
}

let cachedEmployees: Employee[] | null = null;
let cacheExpiresAt = 0;
let pendingRequest: Promise<Employee[]> | null = null;

export async function getEmployees(
  forceRefresh = false,
): Promise<Employee[]> {
  const now = Date.now();

  if (
    !forceRefresh &&
    cachedEmployees &&
    now < cacheExpiresAt
  ) {
    return cachedEmployees;
  }

  if (pendingRequest) {
    return pendingRequest;
  }

  pendingRequest = fetch(EMPLOYEE_API_URL)
    .then(async response => {
      if (!response.ok) {
        throw new Error('Failed to fetch employees');
      }

      const data: EmployeeApiResponse[] = await response.json();

      cachedEmployees = data
        .filter(emp => !emp.status || emp.status.toLowerCase() === 'active')
        .map(emp => ({
          id: emp.employeeId,
          name: `${emp.firstName}${emp.lastname ? ` ${emp.lastname}` : ''}`,
          department: emp.position ?? '',
        }));

      cacheExpiresAt = Date.now() + CACHE_TTL_MS;
      return cachedEmployees;
    })
    .finally(() => {
      pendingRequest = null;
    });

  return pendingRequest;
}

export function clearEmployeesCache(): void {
  cachedEmployees = null;
  cacheExpiresAt = 0;
}