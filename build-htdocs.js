import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceDir = path.join(__dirname, 'dist');
const targetDir = path.join(__dirname, 'htdocs');

function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function prepareHosting() {
  console.log('📦 Preparing htdocs folder for shared hosting deployment...');
  
  if (!fs.existsSync(sourceDir)) {
    console.error('❌ Error: dist folder not found. Run npm run build first.');
    process.exit(1);
  }

  // Copy dist to htdocs
  console.log(`Copying contents from ${sourceDir} to ${targetDir}...`);
  copyDirectory(sourceDir, targetDir);

  console.log('✅ Success! Your htdocs folder is ready.');
  console.log('👉 To deploy:');
  console.log('1. Go to the AI Studio editor files sidebar.');
  console.log('2. Download the "htdocs" folder or its contents.');
  console.log('3. Upload the contents right into your cPanel / Plesk public_html or htdocs directory.');
}

prepareHosting();
