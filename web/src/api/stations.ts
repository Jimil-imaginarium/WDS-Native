import { api } from "./client";
import type { Station, StationCreate } from "./types";

export const stationsApi = {
  list: async (): Promise<Station[]> => {
    const { data } = await api.get<Station[]>("/api/stations");
    return data;
  },

  get: async (id: string): Promise<Station> => {
    const { data } = await api.get<Station>(`/api/stations/${id}`);
    return data;
  },

  create: async (payload: StationCreate): Promise<Station> => {
    const { data } = await api.post<Station>("/api/stations", payload);
    return data;
  },

  update: async (id: string, payload: Partial<StationCreate>): Promise<Station> => {
    const { data } = await api.patch<Station>(`/api/stations/${id}`, payload);
    return data;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/api/stations/${id}`);
  },
};
