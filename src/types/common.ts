/**
 * Common Types
 * Shared type definitions used across components
 */

/**
 * User Interface
 * Represents a user with optional avatar and contact info
 */
export interface User {
  id?: string;
  name: string;
  email?: string;
  avatar?: string;
}

/**
 * Status Color Type
 * Standard color palette for status indicators
 */
export type StatusColor = 'red' | 'green' | 'orange' | 'gray' | 'yellow';

/**
 * Size Type
 * Standard size variants for components
 */
export type Size = 'xs' | 'sm' | 'md' | 'lg';
