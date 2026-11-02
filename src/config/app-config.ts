import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "EasyDebt",
  version: packageJson.version,
  copyright: `© ${currentYear}, EasyDebt.`,
  meta: {
    title: "EasyDebt",
    description: "EasyDebt - Debt Management System",
  },
};
