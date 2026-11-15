export type Variant = { id: string; name: string; deltaPaise: number; calories: number | null; isVeg: boolean | null };
export type ModOption = { id: string; name: string; deltaPaise: number };
export type ModGroup = { id: string; name: string; min: number; max: number; options: ModOption[] };
export type MenuItem = {
  id: string; name: string; description: string | null; basePricePaise: number;
  calories: number | null; isVeg: boolean | null; isAvailable: boolean; variants: Variant[]; groups: ModGroup[];
};
export type MenuCategory = { id: string; name: string; tagline: string | null; items: MenuItem[] };
export type TableContext = {
  restaurant: { id: string; slug: string; name: string; brandColor: string; taxRateBps: number; pricesIncludeTax: boolean; acceptingOrders: boolean };
  table: { id: string; label: string };
  categories: MenuCategory[];
};
