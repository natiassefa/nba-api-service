/**
 * API Type Definitions
 * 
 * TypeScript interfaces for API request/response types and error handling.
 */

/**
 * Standard API error response format
 */
export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

/**
 * Paginated response wrapper
 * 
 * @template T - Type of items in the paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  page?: number;
  pageSize?: number;
  total?: number;
}

