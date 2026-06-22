/**
 * Dev mode utilities
 * Provides helpers for development-only features like custom date selection
 */

export const isDevMode = () => {
  return process.env.NODE_ENV === "development";
};

export const DEV_MODE = process.env.NODE_ENV === "development";
