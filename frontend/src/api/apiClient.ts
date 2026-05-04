import type { ApiError } from '../types/api';

const BASE_URL = 'http://localhost:3000';
const TOKEN_KEY = 'quickinvoice_token';

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function buildHeaders(body?: unknown): HeadersInit {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}

function handle401(): never {
  localStorage.removeItem(TOKEN_KEY);
  window.location.href = '/login';
  // Throw so callers don't continue processing after redirect
  throw new Error('Session expired. Redirecting to login.');
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    handle401();
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const body = (await response.json()) as ApiError;
      if (body?.error?.message) {
        message = body.error.message;
      }
    } catch {
      // Response body wasn't valid JSON — use the default message
    }
    throw new Error(message);
  }

  // 204 No Content — nothing to parse
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: buildHeaders(body),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Unable to reach the server. Please check your connection and try again.');
  }
  return handleResponse<T>(response);
}

export function get<T>(path: string): Promise<T> {
  return request<T>('GET', path);
}

export function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>('POST', path, body);
}

export function put<T>(path: string, body: unknown): Promise<T> {
  return request<T>('PUT', path, body);
}

export function del<T>(path: string): Promise<T> {
  return request<T>('DELETE', path);
}

/**
 * Fetch a binary blob (e.g. PDF) and extract the filename from the
 * Content-Disposition header.
 */
export async function getBlob(path: string): Promise<{ blob: Blob; filename: string }> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: 'GET',
      headers: buildHeaders(),
    });
  } catch {
    throw new Error('Unable to reach the server. Please check your connection and try again.');
  }

  if (response.status === 401) {
    handle401();
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const body = (await response.json()) as ApiError;
      if (body?.error?.message) {
        message = body.error.message;
      }
    } catch {
      // Not JSON — use default message
    }
    throw new Error(message);
  }

  const blob = await response.blob();

  // Try to extract filename from Content-Disposition header
  let filename = 'download';
  const disposition = response.headers.get('Content-Disposition');
  if (disposition) {
    const match = disposition.match(/filename="?([^";\n]+)"?/);
    if (match?.[1]) {
      filename = match[1];
    }
  }

  return { blob, filename };
}
