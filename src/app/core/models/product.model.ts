export type ProductCategory =
  | 'sim-cards'
  | 'gadgets'
  | 'accessories'
  | 'vouchers';

export interface Product {
  id: string;
  sku: string;
  name: string;
  tagline: string;
  description: string;
  category: ProductCategory;
  price: number;
  currency: string;
  taxInclusive: boolean;
  imageUrl: string;
  badge?: string;
  slotCode: string;
  /** Physical machine coil/selection number for MQTT dispense commands */
  mqttSelection?: number;
  stockAvailable: number;
  featured?: boolean;
  features: string[];
  includes: string[];
}

export interface CategoryInfo {
  id: ProductCategory;
  label: string;
  icon: string;
  description: string;
}
