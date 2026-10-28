export interface RouterProviderInput {
  id?: string;
  name?: string;
  active?: boolean;
  status?: string;
  balance_stale?: boolean;
  balance?: number | string;
  error_rate?: number | string;
  quality_score?: number | string;
  priority?: number | string;
  weight?: number | string;
  [key: string]: unknown;
}

export declare function clamp01(n: number): number;
export declare function clamp10(n: number): number;
export declare function rankProviders(
  providers: RouterProviderInput[],
  requiredCost: number | string
): RouterProviderInput[];
