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

    // On mount: attempt to recover session.
    // The centralized api.ts logic handles the 401 -> refresh flow automatically.
    useEffect(() => {
        const initAuth = async () => {
            try {
                const res = await api.get<{ user: User }>("/auth/me");
                setUser(res.user);
            } catch (err) {
                // Initial session recovery failed - user stays null
            } finally {
                setIsLoading(false);
            }
        };
        initAuth();
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
