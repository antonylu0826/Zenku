import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    type ReactNode,
} from "react";
import { createElement } from "react";
import { api, setAccessToken, clearAccessToken } from "../lib/api";

interface User {
    id: string;
    email: string;
    name: string;
    role: string;
}

interface AuthState {
    user: User | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // On mount: attempt silent refresh using the HttpOnly cookie.
    // If the cookie exists and is valid, we get a new access token + user data.
    // If not (no cookie, expired, invalid), stay logged out.
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/api/auth/refresh", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                });

                if (res.ok) {
                    const data = (await res.json()) as {
                        token: string;
                        user: User;
                    };
                    setAccessToken(data.token);
                    setUser(data.user);
                }
            } catch {
                // Network error on startup — stay logged out
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        const res = await api.post<{ token: string; user: User }>("/auth/login", {
            email,
            password,
        });
        setAccessToken(res.token);
        setUser(res.user);
    }, []);

    const logout = useCallback(async () => {
        try {
            await api.post("/auth/logout", {});
        } catch {
            // Logout should always succeed client-side even if server call fails
        } finally {
            clearAccessToken();
            setUser(null);
        }
    }, []);

    return createElement(
        AuthContext.Provider,
        { value: { user, isLoading, login, logout } },
        children,
    );
}

export function useAuth(): AuthState {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
