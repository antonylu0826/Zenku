import { useState } from "react";
import { useSchema } from "../hooks/useSchema";
import { useAuth } from "../hooks/useAuth";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Zap,
  ChevronRight,
  LogOut,
  User,
  ChevronLeft,
  Languages,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveIcon } from "@/lib/icon-resolver";
import { useTranslation } from "react-i18next";

interface Props {
  children: ReactNode;
  currentEntity?: string;
  onNavigate: (path: string) => void;
}

export default function AppLayout({ children, currentEntity, onNavigate }: Props) {
  const { data: schema } = useSchema();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const { t, i18n } = useTranslation();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          "relative flex flex-col border-r bg-card transition-all duration-200",
          collapsed ? "w-14" : "w-56"
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-4 border-b cursor-pointer",
            collapsed && "justify-center"
          )}
          onClick={() => onNavigate("/")}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
            <Zap className="h-4 w-4" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-sm tracking-tight">Zenku</span>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {schema?.models.map((model) => {
            const path =
              model.name.charAt(0).toLowerCase() + model.name.slice(1);
            const isActive = currentEntity === model.name;
            return (
              <Button
                key={model.name}
                variant={isActive ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "w-full justify-start gap-2 font-normal",
                  collapsed && "justify-center px-0",
                  isActive && "font-medium"
                )}
                onClick={() => onNavigate(`/${path}`)}
                title={collapsed ? model.plural : undefined}
              >
                {(() => {
                  const Icon = resolveIcon(model.ui?.icon);
                  return <Icon className="h-4 w-4 shrink-0" />;
                })()}
                {!collapsed && (
                  <span className="truncate">{model.plural}</span>
                )}
              </Button>
            );
          })}
        </nav>

        <Separator />

        {/* User area */}
        <div className={cn("p-2", collapsed && "flex justify-center")}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "w-full justify-start gap-2 font-normal",
                  collapsed && "w-10 px-0 justify-center"
                )}
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-secondary-foreground text-xs font-semibold shrink-0">
                  {user?.name?.charAt(0).toUpperCase() ?? "U"}
                </div>
                {!collapsed && (
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-xs font-medium truncate">
                      {user?.name}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {user?.email}
                    </div>
                  </div>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="right" className="w-52">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled className="gap-2">
                <User className="h-4 w-4" />
                <span>{t("auth.profile")}</span>
                <Badge variant="secondary" className="ml-auto text-[10px]">
                  {user?.role}
                </Badge>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {/* Language switcher */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="gap-2">
                  <Languages className="h-4 w-4" />
                  <span>{t("language.label")}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem
                    onClick={() => i18n.changeLanguage("en")}
                    className={cn(i18n.language === "en" && "font-semibold")}
                  >
                    {t("language.en")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => i18n.changeLanguage("zh-TW")}
                    className={cn(i18n.language === "zh-TW" && "font-semibold")}
                  >
                    {t("language.zhTW")}
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={logout}
                className="gap-2 text-destructive focus:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                <span>{t("auth.logout")}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Collapse toggle */}
        <Button
          variant="outline"
          size="icon"
          className="absolute -right-3 top-16 h-6 w-6 rounded-full border shadow-sm bg-background"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </Button>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        {currentEntity && (
          <header className="flex items-center gap-2 border-b px-6 py-3 text-sm text-muted-foreground bg-card">
            <span
              className="cursor-pointer hover:text-foreground"
              onClick={() => onNavigate("/")}
            >
              Home
            </span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground font-medium">{currentEntity}</span>
          </header>
        )}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
