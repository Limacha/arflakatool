import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
    // Path matching your compiled test files (adjust 'out' to 'dist' if applicable)
    files: 'out/test/**/*.test.js',

    // Optional parameters
    version: 'stable',
    workspaceFolder: './',
});