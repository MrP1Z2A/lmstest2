
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'node:process';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
      // Also define the whole process.env object to avoid "process is not defined" errors
      'process.env': env
    },
    server: {
      port: 5173,
      open: true,
    }
  };
});
