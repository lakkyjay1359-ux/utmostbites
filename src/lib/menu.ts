import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Variant = { label: string; price: number };
export type Product = {
  id: string; category_id: string | null; name: string; description: string;
  price: number; variants: Variant[] | null; image_key: string | null; available: boolean; sort: number;
};
export type Category = { id: string; slug: string; name: string; sort: number };
export type Combo = {
  id: string; name: string; tagline: string; items: string[]; price: number;
  image_key: string | null; accent: string; available: boolean; sort: number;
};

export const menuQuery = queryOptions({
  queryKey: ["menu"],
  queryFn: async () => {
    const [c, p] = await Promise.all([
      supabase.from("categories").select("*").order("sort"),
      supabase.from("products").select("*").order("sort"),
    ]);
    if (c.error) throw c.error;
    if (p.error) throw p.error;
    return { categories: c.data as Category[], products: p.data as unknown as Product[] };
  },
});

export const combosQuery = queryOptions({
  queryKey: ["combos"],
  queryFn: async () => {
    const { data, error } = await supabase.from("combos").select("*").order("sort");
    if (error) throw error;
    return data as Combo[];
  },
});

export const hoursQuery = queryOptions({
  queryKey: ["settings", "opening_hours"],
  queryFn: async () => {
    const { data } = await supabase.from("settings").select("value").eq("key", "opening_hours").maybeSingle();
    return data?.value ?? "";
  },
});
