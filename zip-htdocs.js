import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const htdocsDir = path.join(__dirname, 'htdocs');
const outputZip = path.join(__dirname, 'htdocs.zip');

if (!fs.existsSync(htdocsDir)) {
  console.error('❌ Error: htdocs folder not found. Run npm run build:hosting first.');
  process.exit(1);
}

const output = fs.createWriteStream(outputZip);
const archive = archiver('zip', {
  zlib: { level: 9 } // Sets the compression level.
});

output.on('close', function() {
  console.log(`✅ Success! Compressed ${archive.pointer()} total bytes.`);
  console.log(`\n📦 A new file named "htdocs.zip" has been created in your sidebar!`);
  console.log(`\n======================================================`);
  console.log(`💡 IMPORTANT DEPLOYMENT INSTRUCTIONS FOR INFINITYFREE:`);
  console.log(`======================================================`);
  console.log(`1. Double click and OPEN the "htdocs" folder in your File Manager.`);
  console.log(`   (You MUST be inside the /htdocs/ directory first!)`);
  console.log(`2. Upload "htdocs.zip" into that folder.`);
  console.log(`3. Right-click "htdocs.zip" and select "Extract".`);
  console.log(`   (If it asks for an extract path, just leave it as is or type '.')`);
  console.log(`4. Wait for it to finish, then delete "htdocs.zip" to save space.`);
  console.log(`======================================================\n`);
});

archive.on('error', function(err) {
  throw err;
});

archive.pipe(output);

// append files from a sub-directory, putting its contents at the root of archive
archive.directory(htdocsDir, false);

archive.finalize();
