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

    // On mount: attempt silent refresh using the HttpOnly cookie via centralized API logic.
    useEffect(() => {
        (async () => {
            try {
                // Rely on the standard API logic to recover session
                const res = await api.get<{ user: User }>("/auth/me");
                setUser(res.user);
            } catch {
                // Not logged in or expired
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
