import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "Easy Debt",
  version: packageJson.version,
  copyright: `© ${currentYear}, Easy Debt.`,
  meta: {
    title: "Easy Debt - Debt Management System",
    description: "Easy Debt - Debt Management System",
  },
};
