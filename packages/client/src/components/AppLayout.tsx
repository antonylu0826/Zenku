import { useState } from "react";
import { useSchema } from "../hooks/useSchema";
import { useAuth } from "../hooks/useAuth";
import type { ReactNode } from "react";
import type { MenuGroupDefinition, ExtendedModelMeta } from "@zenku/core";
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
  ChevronDown,
  LogOut,
  User,
  ChevronLeft,
  Languages,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveIcon } from "@/lib/icon-resolver";
import { useTranslation } from "react-i18next";
import { useEntityTranslation } from "@/hooks/useEntityTranslation";

interface Props {
  children: ReactNode;
  currentEntity?: string;
  onNavigate: (path: string) => void;
}

export default function AppLayout({ children, currentEntity, onNavigate }: Props) {
  const { data: schema } = useSchema();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const { t, i18n } = useTranslation();
  const { tEntityPlural } = useEntityTranslation();

  const currentModel = schema?.models.find((m) => m.name === currentEntity);
  const menu = schema?.menu;
  const appInfo = schema?.appInfo;
  const appName = appInfo?.i18n?.[i18n.language]?.name ?? appInfo?.name ?? "Zenku";

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const getMenuGroupLabel = (group: MenuGroupDefinition) => {
    return group.i18n?.[i18n.language] ?? group.i18n?.en ?? group.label;
  };

  /** Render a single entity nav item */
  const renderEntityItem = (model: ExtendedModelMeta, nested = false) => {
    const path = model.name.charAt(0).toLowerCase() + model.name.slice(1);
    const isActive = currentEntity === model.name;
    return (
      <Button
        key={model.name}
        variant={isActive ? "secondary" : "ghost"}
        size="sm"
        className={cn(
          "w-full justify-start gap-2 font-normal",
          collapsed && "justify-center px-0",
          nested && !collapsed && "pl-8",
          isActive && "font-medium"
        )}
        onClick={() => onNavigate(`/${path}`)}
        title={collapsed ? tEntityPlural(model) : undefined}
      >
        {(() => {
          const Icon = resolveIcon(model.ui?.icon);
          return <Icon className="h-4 w-4 shrink-0" />;
        })()}
        {!collapsed && (
          <span className="truncate">{tEntityPlural(model)}</span>
        )}
      </Button>
    );
  };

  /** Render nav — grouped (P12 menu.ts) or flat (legacy) */
  const renderNav = () => {
    if (menu && menu.length > 0) {
      // P12: menu groups with sub-items
      return menu.map((group) => {
        // Role-based access
        if (group.roles && user?.role && !group.roles.includes(user.role)) {
          return null;
        }

        const groupEntities = group.items
          .map((item) => {
            if (item.entity) {
              return schema?.models.find((m) => m.name === item.entity);
            }
            return null;
          })
          .filter(Boolean) as ExtendedModelMeta[];

        if (groupEntities.length === 0) return null;

        const isExpanded = expandedGroups.has(group.label);
        const hasActiveChild = groupEntities.some((m) => m.name === currentEntity);

        // Auto-expand group containing active entity
        const shouldShow = isExpanded || hasActiveChild;

        if (collapsed) {
          // In collapsed mode, show only entity items (no groups)
          return groupEntities.map((model) => renderEntityItem(model));
        }

        const GroupIcon = resolveIcon(group.icon);

        return (
          <div key={group.label} className="space-y-0.5">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 font-normal text-muted-foreground hover:text-foreground"
              onClick={() => toggleGroup(group.label)}
            >
              <GroupIcon className="h-4 w-4 shrink-0" />
              <span className="truncate text-xs font-medium uppercase tracking-wider">
                {getMenuGroupLabel(group)}
              </span>
              {shouldShow ? (
                <ChevronDown className="h-3 w-3 ml-auto shrink-0" />
              ) : (
                <ChevronRight className="h-3 w-3 ml-auto shrink-0" />
              )}
            </Button>
            {shouldShow &&
              groupEntities.map((model) => renderEntityItem(model, true))}
          </div>
        );
      });
    }

    // Legacy: flat list of all models
    return schema?.models.map((model) => renderEntityItem(model));
  };

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
            <span className="font-semibold text-sm tracking-tight">{appName}</span>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {renderNav()}
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
                  {(appInfo?.availableLanguages ?? ["en", "zh-TW"]).map((lang) => (
                    <DropdownMenuItem
                      key={lang}
                      onClick={() => i18n.changeLanguage(lang)}
                      className={cn(i18n.language === lang && "font-semibold")}
                    >
                      {t(`language.${lang === "zh-TW" ? "zhTW" : lang}`)}
                    </DropdownMenuItem>
                  ))}
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
              {t("common.home")}
            </span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground font-medium">
              {currentModel ? tEntityPlural(currentModel) : currentEntity}
            </span>
          </header>
        )}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
