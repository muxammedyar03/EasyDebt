/**
 * DOMAIN LAYER - Customer Rating Types
 *
 * Represents customer ratings based on payment history analysis
 */

import type { DebtorDomain } from "./debtor.domain";
import type { DebtorView } from "../view/debtor.view";
import type { PaymentDomain } from "./payment.domain";

/**
 * Customer rating based on payment behavior
 */
export type CustomerRating = "high" | "medium" | "critical";

/**
 * Customer rating with debtor and payment data
 */
export type CustomerRatingDomain = {
  debtorId: number;
  debtor: DebtorDomain;
  payments: PaymentDomain[];
  validPayments: number;
  rating: {
    score: number;
    label: CustomerRating;
    color: string;
  };
};

/**
 * Filters for customer ratings
 */
export type CustomerRatingFilters = {
  search?: string;
  rating?: CustomerRating;
};

/**
 * Customer rating with view debtor (for UI display)
 */
export type CustomerRatingView = {
  debtorId: number;
  debtor: DebtorView;
  payments: PaymentDomain[];
  validPayments: number;
  rating: {
    score: number;
    label: CustomerRating;
    color: string;
  };
};

/**
 * Paginated result for customer ratings
 */
export type PaginatedCustomerRatings = {
  data: CustomerRatingDomain[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  counts: {
    high: number;
    medium: number;
    critical: number;
  };
};

/**
 * Paginated result for customer ratings view
 */
export type PaginatedCustomerRatingsView = {
  data: CustomerRatingView[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  counts: {
    high: number;
    medium: number;
    critical: number;
  };
};
