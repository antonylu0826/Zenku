import { useState, useEffect, useCallback, type ComponentType } from "react";
import { useAuth, AuthProvider } from "./hooks/useAuth";
import { useSchema } from "./hooks/useSchema";
import AppLayout from "./components/AppLayout";
import LoginPage from "./pages/LoginPage";
import GenericEntityListPage from "./pages/GenericEntityListPage";
import GenericEntityFormPage from "./pages/GenericEntityFormPage";
import GenericEntityDetailPage from "./pages/GenericEntityDetailPage";

// Detect ejected pages via Vite's import.meta.glob (eager)
const ejectedModules = import.meta.glob<{
  default: ComponentType<any>;
}>("./pages/ejected/*.tsx", { eager: true });

// Build lookup: { "ProductListPage": Component, ... }
const ejectedPages: Record<string, ComponentType<any>> = {};
for (const [path, mod] of Object.entries(ejectedModules)) {
  const match = path.match(/\/([^/]+)\.tsx$/);
  if (match) {
    ejectedPages[match[1]] = mod.default;
  }
}

function getEjectedPage(
  entityName: string,
  pageType: "list" | "form" | "detail",
): ComponentType<any> | undefined {
  const suffix = pageType === "list" ? "ListPage" : pageType === "form" ? "FormPage" : "DetailPage";
  return ejectedPages[`${entityName}${suffix}`];
}

function useHashRouter() {
  const [path, setPath] = useState(() => window.location.hash.slice(1) || "/");

  useEffect(() => {
    const handler = () => setPath(window.location.hash.slice(1) || "/");
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  const navigate = useCallback((to: string) => {
    window.location.hash = to;
  }, []);

  return { path, navigate };
}

function parseRoute(path: string, models: string[]) {
  const parts = path.split("/").filter(Boolean);

  if (parts.length === 0) return { page: "home" as const };

  const entityPath = parts[0];
  const entityName = models.find(
    (m) => m.charAt(0).toLowerCase() + m.slice(1) === entityPath,
  );

  if (!entityName) return { page: "notfound" as const };

  if (parts.length === 1) {
    return { page: "list" as const, entityName };
  }

  if (parts[1] === "new") {
    return { page: "form" as const, entityName };
  }

  if (parts.length === 3 && parts[2] === "edit") {
    return { page: "form" as const, entityName, entityId: parts[1] };
  }

  return { page: "detail" as const, entityName, entityId: parts[1] };
}

function AppContent() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: schema, isLoading: schemaLoading } = useSchema();
  const { path, navigate } = useHashRouter();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  if (schemaLoading || !schema) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading schema...</div>
      </div>
    );
  }

  const modelNames = schema.models.map((m) => m.name);
  const route = parseRoute(path, modelNames);

  let content: React.ReactNode;

  switch (route.page) {
    case "home":
      content = (
        <div className="p-6">
          <h2 className="text-xl font-bold mb-2">Welcome to Zenku</h2>
          <p className="text-gray-500">
            Select an entity from the sidebar to get started.
          </p>
        </div>
      );
      break;

    case "list": {
      const Ejected = getEjectedPage(route.entityName, "list");
      content = Ejected ? (
        <Ejected onNavigate={navigate} />
      ) : (
        <GenericEntityListPage entityName={route.entityName} onNavigate={navigate} />
      );
      break;
    }

    case "form": {
      const Ejected = getEjectedPage(route.entityName, "form");
      content = Ejected ? (
        <Ejected entityId={route.entityId} onNavigate={navigate} />
      ) : (
        <GenericEntityFormPage entityName={route.entityName} entityId={route.entityId} onNavigate={navigate} />
      );
      break;
    }

    case "detail": {
      const Ejected = getEjectedPage(route.entityName, "detail");
      content = Ejected ? (
        <Ejected entityId={route.entityId!} onNavigate={navigate} />
      ) : (
        <GenericEntityDetailPage entityName={route.entityName} entityId={route.entityId!} onNavigate={navigate} />
      );
      break;
    }

    default:
      content = (
        <div className="p-6">
          <h2 className="text-xl font-bold">Not Found</h2>
          <p className="text-gray-500">The page you're looking for doesn't exist.</p>
        </div>
      );
  }

  return (
    <AppLayout
      currentEntity={route.page !== "home" && route.page !== "notfound" ? route.entityName : undefined}
      onNavigate={navigate}
    >
      {content}
    </AppLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
