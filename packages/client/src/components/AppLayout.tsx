import { useSchema } from "../hooks/useSchema";
import { useAuth } from "../hooks/useAuth";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  currentEntity?: string;
  onNavigate: (path: string) => void;
}

export default function AppLayout({ children, currentEntity, onNavigate }: Props) {
  const { data: schema } = useSchema();
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r flex flex-col">
        <div className="p-4 border-b">
          <h1
            className="text-lg font-bold cursor-pointer"
            onClick={() => onNavigate("/")}
          >
            Zenku
          </h1>
        </div>

        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {schema?.models.map((model) => {
            const path = model.name.charAt(0).toLowerCase() + model.name.slice(1);
            const isActive = currentEntity === model.name;
            return (
              <button
                key={model.name}
                onClick={() => onNavigate(`/${path}`)}
                className={`w-full text-left px-3 py-2 rounded text-sm ${
                  isActive
                    ? "bg-gray-100 font-medium text-gray-900"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {model.plural}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t text-xs text-gray-500">
          <div className="font-medium text-gray-700">{user?.name}</div>
          <div>{user?.email}</div>
          <div className="text-[10px] text-gray-400 mb-2">{user?.role}</div>
          <button
            onClick={logout}
            className="text-red-500 hover:text-red-700"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
