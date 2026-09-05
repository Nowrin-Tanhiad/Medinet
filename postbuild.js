import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcAssets = path.join(__dirname, 'dist', 'assets');
const destAssets = path.join(__dirname, 'assets');
const distHtml = path.join(__dirname, 'dist', 'index.html');
const indexPhp = path.join(__dirname, 'index.php');

// Create root assets folder if it doesn't exist
if (!fs.existsSync(destAssets)) {
  fs.mkdirSync(destAssets, { recursive: true });
}

// Copy dist/assets/* to root assets/
if (fs.existsSync(srcAssets)) {
  const files = fs.readdirSync(srcAssets);
  for (const file of files) {
    fs.copyFileSync(path.join(srcAssets, file), path.join(destAssets, file));
  }
  console.log('✓ Successfully copied dist/assets/* to root /assets/ for direct XAMPP Apache serving!');
}

// Copy public assets like dashboard_bg.png to root directory
const publicBg = path.join(__dirname, 'public', 'dashboard_bg.png');
const rootBg = path.join(__dirname, 'dashboard_bg.png');
if (fs.existsSync(publicBg)) {
  fs.copyFileSync(publicBg, rootBg);
  console.log('✓ Successfully copied dashboard_bg.png to root Medinet directory!');
}

// Copy dist/index.html to index.php so Apache serves the compiled React app
if (fs.existsSync(distHtml)) {
  let content = fs.readFileSync(distHtml, 'utf-8');
  const cacheBust = Date.now();
  let updatedContent = content
    .replace('./assets/app.js', `./assets/app.js?v=${cacheBust}`)
    .replace('./assets/app.css', `./assets/app.css?v=${cacheBust}`);
  const phpHeaders = `<?php
header("Cache-Control: no-cache, no-store, must-revalidate");
header("Pragma: no-cache");
header("Expires: 0");
?>\n`;
  fs.writeFileSync(indexPhp, phpHeaders + updatedContent, 'utf-8');
  console.log('✓ Successfully updated root index.php with cache-busted production compiled React app!');
}
