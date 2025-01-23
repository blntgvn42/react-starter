#!/usr/bin/env node
import chalk from "chalk";
import { execSync } from "child_process";
import fs from "fs-extra";
import prompts from "prompts";

interface ProjectOptions {
  router: boolean;
  query: boolean;
  tailwind: boolean;
  projectName: string;
}

function generateViteConfig(options: { tailwind: boolean }) {
  const plugins = options.tailwind
    ? `import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],`
    : `export default defineConfig({
  plugins: [react()],`;

  const viteConfig = `
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'
${options.tailwind ? "import tailwindcss from '@tailwindcss/vite'" : ""}

${plugins}
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@routes': path.resolve(__dirname, './src/routes'),
      '@lib': path.resolve(__dirname, './src/lib')
    }
  },
  server: {
    port: 3000,
    open: true,
    strictPort: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor'
          }
        }
      }
    }
  }
})`.trim();

  return viteConfig;
}

async function createReactApp() {
  const response = await prompts([
    {
      type: "text",
      name: "projectName",
      message: "Project name?",
      initial: "my-react-app",
    },
    {
      type: "multiselect",
      name: "features",
      message: "Select features",
      choices: [
        { title: "Tanstack Router", value: "router" },
        { title: "Tanstack Query", value: "query" },
        { title: "Tailwind CSS", value: "tailwind" },
      ],
      min: 0,
    },
  ]);

  const projectOptions: ProjectOptions = {
    projectName: response.projectName,
    router: response.features.includes("router"),
    query: response.features.includes("query"),
    tailwind: response.features.includes("tailwind"),
  };

  console.log(chalk.blue("🚀 Creating React project..."));

  // Create project with Vite
  execSync(
    `pnpm create vite ${projectOptions.projectName} --template react-ts`,
    { stdio: "inherit" }
  );
  process.chdir(projectOptions.projectName);

  // Write custom Vite config
  const viteConfigContent = generateViteConfig({
    tailwind: projectOptions.tailwind,
  });
  fs.writeFileSync("vite.config.ts", viteConfigContent);

  // Install base dependencies
  const baseDeps = ["react-router-dom", "@types/react-router-dom"];

  const devDeps = ["prettier", "eslint"];

  // Conditional dependencies
  if (projectOptions.router) {
    baseDeps.push("@tanstack/react-router", "@tanstack/react-router-devtools");
  }

  if (projectOptions.query) {
    baseDeps.push("@tanstack/react-query", "@tanstack/react-query-devtools");
  }

  if (projectOptions.tailwind) {
    baseDeps.push("tailwindcss", "@tailwindcss/vite");
  }

  // Install dependencies
  execSync(`pnpm add ${baseDeps.join(" ")}`, { stdio: "inherit" });
  execSync(`pnpm add -D ${devDeps.join(" ")}`, { stdio: "inherit" });

  // Configure Tailwind if selected
  if (projectOptions.tailwind) {
    execSync("pnpm tailwindcss init -p", { stdio: "inherit" });

    // Update tailwind.config.js
    const tailwindConfig = `
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
    `.trim();

    fs.writeFileSync("tailwind.config.js", tailwindConfig);

    // Add Tailwind directives
    const cssContent = `
@import "tailwindcss";
    `.trim();

    fs.writeFileSync("src/index.css", cssContent);
  }

  console.log(chalk.green("✅ Project setup complete!"));
  console.log(
    chalk.yellow(`
Next steps:
- cd ${projectOptions.projectName}
- pnpm dev
  `)
  );
}

createReactApp().catch(console.error);
