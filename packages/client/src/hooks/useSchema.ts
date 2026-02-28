import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { SchemaResponse, ModelMeta } from "@zenku/core";

export function useSchema() {
  return useQuery({
    queryKey: ["schema"],
    queryFn: () => api.get<SchemaResponse>("/schema"),
    staleTime: 1000 * 60 * 5,
  });
}

export function useModelMeta(modelName: string): ModelMeta | undefined {
  const { data } = useSchema();
  return data?.models.find((m) => m.name === modelName);
}
