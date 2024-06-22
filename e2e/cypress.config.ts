import { nxE2EPreset } from '@nx/cypress/plugins/cypress-preset';

import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    ...nxE2EPreset(__filename, {
      cypressDir: 'src',
      bundler: 'vite',
      webServerCommands: {
        default: 'nx run TestProject:serve',
        production: 'nx run TestProject:preview',
      },
      ciWebServerCommand: 'nx run TestProject:serve-static',
    }),
    baseUrl: 'http://localhost:4200',
  },
});
