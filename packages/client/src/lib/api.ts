// Structured API error class for client-side error handling
export class ApiError extends Error {
    constructor(
        public code: string,
        message: string,
        public statusCode: number,
        public details?: unknown,
    ) {
        super(message);
        this.name = "ApiError";
    }
}

const BASE_URL = "/api";

// Module-level token store — NOT in localStorage, not accessible to other scripts
let _accessToken: string | null = null;

// Single in-flight refresh promise — prevents concurrent refresh stampedes on 401
let _refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null): void {
    _accessToken = token;
}

export function clearAccessToken(): void {
    _accessToken = null;
}

export function getAccessToken(): string | null {
    return _accessToken;
}

async function refreshAccessToken(): Promise<string | null> {
    if (_refreshPromise) {
        return _refreshPromise;
    }

    _refreshPromise = (async () => {
        try {
            console.debug("🔄 Attempting silent refresh...");
            const res = await fetch(`${BASE_URL}/auth/refresh`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: "{}", // Providing an empty body for better compatibility
            });

            if (!res.ok) {
                _accessToken = null;
                return null;
            }

            const data = (await res.json()) as { token: string };
            _accessToken = data.token;
            return data.token;
        } catch (err) {
            console.error("🚨 Network error during refresh:", err);
            _accessToken = null;
            return null;
        } finally {
            _refreshPromise = null;
        }
    })();

    return _refreshPromise;
}

async function request<T>(
    path: string,
    options: RequestInit = {},
    isRetry = false,
): Promise<T> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(_accessToken ? { Authorization: `Bearer ${_accessToken}` } : {}),
        ...(options.headers as Record<string, string>),
    };

    // If we don't have a token, and this is not a retry, and this is not an auth request,
    // try to get a token via silent refresh BEFORE making the first request.
    // This avoids a 401 in the console when the user refreshes the page.
    const isAuthPath = path.startsWith("/auth/login") || path.startsWith("/auth/refresh");
    if (!_accessToken && !isRetry && !isAuthPath) {
        await refreshAccessToken();
        if (_accessToken) {
            headers["Authorization"] = `Bearer ${_accessToken}`;
        }
    }

    const res = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers,
        credentials: "include",
    });

    if (res.status === 401 && !isRetry) {
        const newToken = await refreshAccessToken();
        if (newToken) {
            return request<T>(
                path,
                {
                    ...options,
                    headers: {
                        ...options.headers,
                        Authorization: `Bearer ${newToken}`,
                    },
                },
                true,
            );
        }
    }

    if (!res.ok) {
        let errorBody: any = {};
        try {
            errorBody = await res.json();
        } catch {
            // Non-JSON response
        }

        const errData = errorBody?.error ?? {};
        throw new ApiError(
            errData.code ?? "UNKNOWN_ERROR",
            errData.message ?? `HTTP ${res.status}`,
            res.status,
            errData.details,
        );
    }

    // Handle empty responses (e.g. 204 No Content)
    const text = await res.text();
    return text ? JSON.parse(text) : ({} as T);
}

export const api = {
    get: <T>(path: string) => request<T>(path),
    post: <T>(path: string, data: unknown) =>
        request<T>(path, { method: "POST", body: JSON.stringify(data) }),
    put: <T>(path: string, data: unknown) =>
        request<T>(path, { method: "PUT", body: JSON.stringify(data) }),
    patch: <T>(path: string, data: unknown) =>
        request<T>(path, { method: "PATCH", body: JSON.stringify(data) }),
    delete: <T>(path: string, data?: unknown) =>
        request<T>(path, {
            method: "DELETE",
            ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
        }),
};
