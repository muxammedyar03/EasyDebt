import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "EasyDebt Desktop",
  version: packageJson.version,
  copyright: `© ${currentYear}, EasyDebt.`,
  meta: {
    title: "EasyDebt Desktop",
    description: "Offline-First Debt Management System with Tauri v2 Desktop & Cloud Sync",
  },
};
