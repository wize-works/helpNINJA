/**
 * Utility for handling API requests with automatic retry logic for 409 conflicts
 * and other transient errors
 */

export type RetryOptions = {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    retryCondition?: (response: Response, error?: Error) => boolean;
};

export type Site = {
    id: string;
    domain: string;
    name: string;
    status: 'active' | 'paused' | 'pending';
    verified: boolean;
    verification_token?: string;
    created_at: string;
    updated_at: string;
};

export type ApiError = Error & {
    status?: number;
    response?: Response;
};

const DEFAULT_OPTIONS: Required<RetryOptions> = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    retryCondition: (response, error) => {
        // Retry on 409 conflicts, 429 rate limiting, and 5xx server errors
        if (!response.ok) {
            return response.status === 409 || response.status === 429 || response.status >= 500;
        }
        // Retry on network errors
        return !!error;
    }
};

/**
 * Enhanced fetch with automatic retry logic for handling conflicts and transient errors
 */
export async function fetchWithRetry(
    url: string,
    init?: RequestInit,
    options: RetryOptions = {}
): Promise<Response> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
        try {
            const response = await fetch(url, init);

            // If successful or shouldn't retry, return the response
            if (response.ok || !opts.retryCondition(response)) {
                return response;
            }

            // Log retry attempt for conflicts and server errors
            if (response.status === 409) {
                console.warn(`[fetchWithRetry] Conflict detected (attempt ${attempt + 1}/${opts.maxRetries + 1}): ${url}`);
            } else if (response.status >= 500) {
                console.warn(`[fetchWithRetry] Server error ${response.status} (attempt ${attempt + 1}/${opts.maxRetries + 1}): ${url}`);
            }

            // If this is the last attempt, return the response without retrying
            if (attempt === opts.maxRetries) {
                return response;
            }

            // Calculate delay with exponential backoff and jitter
            const delay = Math.min(
                opts.baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
                opts.maxDelay
            );

            await new Promise(resolve => setTimeout(resolve, delay));

        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            // If this is the last attempt or error shouldn't be retried, throw
            if (attempt === opts.maxRetries || !opts.retryCondition(new Response(), lastError)) {
                throw lastError;
            }

            console.warn(`[fetchWithRetry] Network error (attempt ${attempt + 1}/${opts.maxRetries + 1}): ${url}`, lastError.message);

            // Calculate delay for network errors
            const delay = Math.min(
                opts.baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
                opts.maxDelay
            );

            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    // This should never be reached, but just in case...
    throw lastError || new Error(`Failed to fetch ${url} after ${opts.maxRetries + 1} attempts`);
}

/**
 * Higher-level API request utility with JSON parsing and error handling
 */
export async function apiRequest<T = unknown>(
    url: string,
    init?: RequestInit,
    retryOptions?: RetryOptions
): Promise<{ data: T; response: Response }> {
    const response = await fetchWithRetry(url, init, retryOptions);

    if (!response.ok) {
        let errorMessage = `API request failed: ${response.status} ${response.statusText}`;

        try {
            const errorData = await response.json();
            if (errorData.error) {
                errorMessage = errorData.error;
            }
        } catch {
            // If we can't parse the error response, use the default message
        }

        const error: ApiError = new Error(errorMessage);
        error.status = response.status;
        error.response = response;
        throw error;
    }

    let data: T;
    try {
        data = await response.json();
    } catch (error) {
        throw new Error(`Failed to parse JSON response: ${error instanceof Error ? error.message : String(error)}`);
    }

    return { data, response };
}

/**
 * Specialized site API functions with built-in retry logic
 */
export const siteApi = {
    async list() {
        return apiRequest<Site[]>('/api/sites');
    },

    async get(id: string) {
        return apiRequest<Site>(`/api/sites/${id}`);
    },

    async create(data: { domain: string; name: string; status?: string }) {
        return apiRequest<Site>('/api/sites', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(data)
        });
    },

    async update(id: string, data: { domain?: string; name?: string; status?: string }) {
        return apiRequest<Site>(`/api/sites/${id}`, {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(data)
        });
    },

    async delete(id: string) {
        return apiRequest<{ ok: boolean }>(`/api/sites/${id}`, {
            method: 'DELETE'
        });
    }
};