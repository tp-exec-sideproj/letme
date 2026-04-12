import { resolve } from 'path'
import { readFileSync } from 'fs'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

// Parse .env file and inject into main process bundle at build time
function loadEnvFile(): Record<string, string> {
  try {
    const content = readFileSync(resolve(__dirname, '.env'), 'utf-8')
    const result: Record<string, string> = {}
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      result[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
    }
    return result
  } catch {
    return {}
  }
}

const env = loadEnvFile()

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    define: {
      'process.env.AI_ENDPOINT': JSON.stringify(env.AI_ENDPOINT || ''),
      'process.env.AI_KEY': JSON.stringify(env.AI_KEY || ''),
      'process.env.AI_MODEL': JSON.stringify(env.AI_MODEL || 'gpt-4o'),
      'process.env.AZURE_SPEECH_KEY': JSON.stringify(env.AZURE_SPEECH_KEY || ''),
      'process.env.AZURE_SPEECH_REGION': JSON.stringify(env.AZURE_SPEECH_REGION || 'southeastasia'),
      'process.env.BING_SEARCH_KEY': JSON.stringify(env.BING_SEARCH_KEY || '')
    },
    build: {
      outDir: 'dist-electron/main',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts')
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist-electron/preload',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts')
        }
      }
    }
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    plugins: [react()],
    build: {
      outDir: resolve(__dirname, 'dist'),
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html')
        }
      }
    }
  }
})
