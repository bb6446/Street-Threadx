import fs from 'fs';
import path from 'path';

async function testUpload() {
  try {
    const formData = new FormData();
    const filePath = path.resolve(process.cwd(), 'package.json');
    const fileBuffer = fs.readFileSync(filePath);
    const blob = new Blob([fileBuffer], { type: 'application/json' });
    formData.append('file', blob, 'package.json');

    const res = await fetch('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData,
    });
    
    if (res.ok) {
      console.log('Upload successful:', await res.json());
    } else {
      console.log('Upload failed:', res.status, await res.text());
    }
  } catch (error) {
    console.error('Test script error:', error);
  }
}

testUpload();
