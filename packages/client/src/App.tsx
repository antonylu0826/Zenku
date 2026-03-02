import { useState, useEffect, useCallback, type ComponentType } from "react";
import { useAuth, AuthProvider } from "./hooks/useAuth";
import { useSchema } from "./hooks/useSchema";
import AppLayout from "./components/AppLayout";
import LoginPage from "./pages/LoginPage";
import GenericEntityListPage from "./pages/GenericEntityListPage";
import GenericEntityFormPage from "./pages/GenericEntityFormPage";
import GenericEntityDetailPage from "./pages/GenericEntityDetailPage";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Toaster } from "sonner";
import { useTranslation } from "react-i18next";
import { useEntityTranslation } from "@/hooks/useEntityTranslation";

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
  return ejectedPages[`${entityName}${suffix} `];
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
  const { t } = useTranslation();
  const { user, isLoading } = useAuth();
  const { data: schema, isLoading: isSchemaLoading } = useSchema({ enabled: !isLoading });
  const { path, navigate } = useHashRouter();
  const { tEntityPlural, tEntityName } = useEntityTranslation();

  useEffect(() => {
    let title = "Zenku";
    if (isLoading || isSchemaLoading || !schema) {
      title = t("common.loading") + " | Zenku";
    } else if (!user) {
      title = t("auth.loginTitle") + " | Zenku";
    } else {
      const modelNames = schema.models.map((m) => m.name);
      const route = parseRoute(path, modelNames);
      switch (route.page) {
        case "home":
          title = t("welcome.title") + " | Zenku";
          break;
        case "list":
          const modelList = schema.models.find(m => m.name === route.entityName);
          if (modelList) {
            title = tEntityPlural(modelList) + " | Zenku";
          }
          break;
        case "form":
          const modelForm = schema.models.find(m => m.name === route.entityName);
          if (modelForm) {
            title = (route.entityId ? t("form.editTitle", { entity: tEntityName(modelForm) }) : t("form.createTitle", { entity: tEntityName(modelForm) })) + " | Zenku";
          }
          break;
        case "detail":
          const modelDetail = schema.models.find(m => m.name === route.entityName);
          if (modelDetail) {
            title = tEntityName(modelDetail) + t("common.details") + " | Zenku";
          }
          break;
        case "notfound":
          title = t("welcome.notFound") + " | Zenku";
          break;
      }
    }
    document.title = title;
  }, [path, user, isLoading, schema, isSchemaLoading, t, tEntityPlural, tEntityName]);


  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">{t("common.loading")}</div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  if (isSchemaLoading || !schema) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">{t("common.loading")}</div>
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
          <h2 className="text-xl font-bold mb-2">{t("welcome.title")}</h2>
          <p className="text-gray-500">
            {t("welcome.subtitle")}
          </p>
        </div>
      );
      break;

    case "list": {
      const Ejected = getEjectedPage(route.entityName, "list");
      content = Ejected ? (
        <Ejected key={route.entityName} onNavigate={navigate} />
      ) : (
        <GenericEntityListPage key={route.entityName} entityName={route.entityName} onNavigate={navigate} />
      );
      break;
    }

    case "form": {
      const Ejected = getEjectedPage(route.entityName, "form");
      content = Ejected ? (
        <Ejected key={route.entityName} entityId={route.entityId} onNavigate={navigate} />
      ) : (
        <GenericEntityFormPage key={route.entityName} entityName={route.entityName} entityId={route.entityId} onNavigate={navigate} />
      );
      break;
    }

    case "detail": {
      const Ejected = getEjectedPage(route.entityName, "detail");
      content = Ejected ? (
        <Ejected key={route.entityName} entityId={route.entityId!} onNavigate={navigate} />
      ) : (
        <GenericEntityDetailPage key={route.entityName} entityName={route.entityName} entityId={route.entityId!} onNavigate={navigate} />
      );
      break;
    }

    default:
      content = (
        <div className="p-6">
          <h2 className="text-xl font-bold">{t("welcome.notFound")}</h2>
          <p className="text-gray-500">{t("welcome.notFoundDesc")}</p>
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
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
        <Toaster richColors position="bottom-right" />
      </AuthProvider>
    </ErrorBoundary>
  );
}
