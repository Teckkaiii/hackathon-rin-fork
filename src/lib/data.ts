import opportunitiesData from '../data/opportunities.json';
import productsData from '../data/products.json';
import type { Opportunity, Product } from '../types';

export const OPPS = opportunitiesData as Opportunity[];
export const PRODUCTS = productsData as Record<string, Product>;
