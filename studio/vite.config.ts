import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {resolve} from 'node:path';
export default defineConfig(({mode})=>({plugins:[react()],base:'./',build:{outDir:mode==='proof'?'../temp/studio-proof-dist':'dist',emptyOutDir:true,rollupOptions:{input:mode==='proof'?{main:resolve('index.html'),proof:resolve('tests/contract.html')}:resolve('index.html')}}}));
