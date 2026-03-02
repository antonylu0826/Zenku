import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { PaginatedResponse } from "@zenku/core";

interface ListParams {
  page?: number;
  pageSize?: number;
  sort?: string;
  sortDir?: "asc" | "desc";
  search?: string;
  [key: string]: string | number | undefined;
}

function buildQuery(params: ListParams): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== "",
  );
  if (entries.length === 0) return "";
  return "?" + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

export function useEntityList(entityPath: string, params: ListParams = {}, options?: { enabled?: boolean }) {
  const query = buildQuery(params);
  return useQuery({
    queryKey: ["entity", entityPath, params],
    queryFn: () => api.get<PaginatedResponse<Record<string, unknown>>>(`/${entityPath}${query}`),
    enabled: options?.enabled,
  });
}

export function useEntityDetail(entityPath: string, id: string, options?: { include?: string }) {
  const include = options?.include;
  const query = include ? `?include=${encodeURIComponent(include)}` : "";
  return useQuery({
    queryKey: ["entity", entityPath, id, include],
    queryFn: () => api.get<Record<string, unknown>>(`/${entityPath}/${id}${query}`),
    enabled: !!id,
  });
}

export function useEntityCreate(entityPath: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.post<Record<string, unknown>>(`/${entityPath}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["entity", entityPath] });
    },
  });
}

export function useEntityUpdate(entityPath: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.put<Record<string, unknown>>(`/${entityPath}/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["entity", entityPath] });
    },
  });
}

export function useEntityDelete(entityPath: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/${entityPath}/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["entity", entityPath] });
    },
  });
}

export function useEntityBatchDelete(entityPath: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) =>
      api.delete(`/${entityPath}/batch`, { ids }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["entity", entityPath] });
    },
  });
}

export function useEntityBatchUpdate(entityPath: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      ids,
      data,
    }: {
      ids: string[];
      data: Record<string, unknown>;
    }) => api.patch(`/${entityPath}/batch`, { ids, data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["entity", entityPath] });
    },
  });
}
