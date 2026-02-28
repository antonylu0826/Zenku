import { Component, type ReactNode } from "react";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: { componentStack: string }) {
        console.error("[ErrorBoundary] Caught error:", error, info);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return (
                <div className="min-h-screen flex items-center justify-center">
                    <div className="max-w-md w-full p-6 border rounded-lg bg-card">
                        <h2 className="text-lg font-semibold text-destructive mb-2">
                            Something went wrong
                        </h2>
                        <p className="text-sm text-muted-foreground mb-4">
                            {this.state.error?.message ?? "An unexpected error occurred."}
                        </p>
                        <button
                            className="text-sm underline text-primary"
                            onClick={() => this.setState({ hasError: false, error: null })}
                        >
                            Try again
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
