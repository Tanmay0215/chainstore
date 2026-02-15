import { supabaseClient } from "./supabase/client";

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  tag: string;
};

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .order("price", { ascending: true }); // consistent ordering

  if (error) {
    console.error("Error fetching products:", error);
    return [];
  }

  return (data as Product[]) || [];
}
