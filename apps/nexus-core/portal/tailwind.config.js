const preset = require("@nexus/config/tailwind");

module.exports = {
  presets: [preset],
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    // apps/nexus-core/portal → ../../../packages/ui/src
    "../../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
};