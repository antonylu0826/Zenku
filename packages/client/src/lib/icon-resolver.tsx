import {
    Database,
    Tag,
    Package,
    ShoppingCart,
    Users,
    FileText,
    Settings,
    BarChart,
    Folder,
    Box,
    Layers,
    Star,
    Globe,
    Mail,
    Calendar,
    type LucideProps,
} from "lucide-react";
import type { ComponentType } from "react";

/**
 * Maps UiConfig icon name strings to Lucide React components.
 * Add more icons here as needed.
 */
const ICON_MAP: Record<string, ComponentType<LucideProps>> = {
    Tag,
    Package,
    ShoppingCart,
    Users,
    FileText,
    Settings,
    BarChart,
    Folder,
    Box,
    Layers,
    Star,
    Globe,
    Mail,
    Calendar,
    Database, // fallback
};

/**
 * Resolves a Lucide icon name to its React component.
 * Falls back to Database icon if the name is not found.
 */
export function resolveIcon(name?: string): ComponentType<LucideProps> {
    if (!name) return Database;
    return ICON_MAP[name] ?? Database;
}
