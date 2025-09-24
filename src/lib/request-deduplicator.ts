/**
 * Request deduplication utility to prevent multiple concurrent identical requests
 * This helps avoid race conditions that can cause 409 conflicts
 */

type PendingRequest<T = unknown> = {
    promise: Promise<T>;
    timestamp: number;
};

class RequestDeduplicator {
    private pendingRequests = new Map<string, PendingRequest<unknown>>();
    private readonly TTL = 30000; // 30 seconds

    /**
     * Create a cache key from request parameters
     */
    private createKey(url: string, method: string, body?: string): string {
        const bodyHash = body ? btoa(body).substring(0, 16) : '';
        return `${method}:${url}:${bodyHash}`;
    }

    /**
     * Clean up expired pending requests
     */
    private cleanup(): void {
        const now = Date.now();
        for (const [key, request] of this.pendingRequests.entries()) {
            if (now - request.timestamp > this.TTL) {
                this.pendingRequests.delete(key);
            }
        }
    }

    /**
     * Execute a request with deduplication
     * If an identical request is already pending, return the existing promise
     */
    async dedupe<T>(
        url: string,
        method: string,
        body: string | undefined,
        executor: () => Promise<T>
    ): Promise<T> {
        const key = this.createKey(url, method, body);

        // Clean up old requests
        this.cleanup();

        // Check if we already have a pending request for this exact operation
        const existing = this.pendingRequests.get(key);
        if (existing) {
            console.info(`[request-deduplicator] Reusing pending request: ${key}`);
            return existing.promise as Promise<T>;
        }

        // Create new request
        const promise = executor().finally(() => {
            // Remove from pending when completed (success or failure)
            this.pendingRequests.delete(key);
        });

        this.pendingRequests.set(key, {
            promise,
            timestamp: Date.now()
        });

        console.debug(`[request-deduplicator] Started new request: ${key}`);
        return promise;
    }

    /**
     * Clear all pending requests (useful for testing or when switching contexts)
     */
    clear(): void {
        this.pendingRequests.clear();
    }

    /**
     * Get stats about pending requests
     */
    getStats(): { pendingCount: number; oldestAge: number } {
        const now = Date.now();
        let oldestAge = 0;

        for (const request of this.pendingRequests.values()) {
            const age = now - request.timestamp;
            if (age > oldestAge) {
                oldestAge = age;
            }
        }

        return {
            pendingCount: this.pendingRequests.size,
            oldestAge
        };
    }
}

// Global instance for browser environment
export const requestDeduplicator = new RequestDeduplicator();

/**
 * Enhanced fetch function with automatic request deduplication
 */
export async function fetchWithDedup(
    url: string,
    init?: RequestInit
): Promise<Response> {
    const method = init?.method || 'GET';
    const body = init?.body ? String(init.body) : undefined;

    return requestDeduplicator.dedupe(url, method, body, () => fetch(url, init));
}

/**
 * Specialized deduplication for sites API calls
 */
export const dedupedSiteApi = {
    async list() {
        return requestDeduplicator.dedupe('/api/sites', 'GET', undefined, async () => {
            const response = await fetch('/api/sites');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        });
    },

    async get(id: string) {
        return requestDeduplicator.dedupe(`/api/sites/${id}`, 'GET', undefined, async () => {
            const response = await fetch(`/api/sites/${id}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        });
    },

    async update(id: string, data: { domain?: string; name?: string; status?: string }) {
        const body = JSON.stringify(data);
        return requestDeduplicator.dedupe(`/api/sites/${id}`, 'PUT', body, async () => {
            const response = await fetch(`/api/sites/${id}`, {
                method: 'PUT',
                headers: { 'content-type': 'application/json' },
                body
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        });
    },

    async create(data: { domain: string; name: string; status?: string }) {
        const body = JSON.stringify(data);
        return requestDeduplicator.dedupe('/api/sites', 'POST', body, async () => {
            const response = await fetch('/api/sites', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        });
    },

    async delete(id: string) {
        return requestDeduplicator.dedupe(`/api/sites/${id}`, 'DELETE', undefined, async () => {
            const response = await fetch(`/api/sites/${id}`, { method: 'DELETE' });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        });
    }
};