import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import * as obfuscatorPlugin from 'rollup-plugin-obfuscator'

const obfuscator = (obfuscatorPlugin as any).default || obfuscatorPlugin;

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      plugins: [
        obfuscator({
          global: false,
          exclude: [/node_modules/],
          options: {
            compact: true,
            controlFlowFlattening: true,
            deadCodeInjection: true,
            debugProtection: true,
            disableConsoleOutput: true,
            identifierNamesGenerator: 'hexadecimal',
            selfDefending: true,
            stringArray: true,
            stringArrayEncoding: ['base64'],
          }
        })
      ]
    }
  }
})
