import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
    build: {
        lib: {
            entry: 'src/main.ts',
            name: 'toypad-js',
            fileName: 'toypad-js',
        }
    },
    plugins: [dts({ rollupTypes: true})],
});