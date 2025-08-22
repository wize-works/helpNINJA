// scripts/generate-favicon.mjs
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file's directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateFavicon() {
  try {
    console.log('Generating favicon.ico from SVG...');
    
    const svgPath = path.resolve(__dirname, '../public/logo.svg');
    const icoPath = path.resolve(__dirname, '../public/favicon.ico');
    
    // Read the SVG file
    const svgBuffer = fs.readFileSync(svgPath);
    
    // Generate a PNG buffer from the SVG
    const pngBuffer = await sharp(svgBuffer)
      .resize(32, 32)  // Standard favicon size
      .png()
      .toBuffer();
      
    // Convert PNG to ICO (Sharp doesn't directly support ICO, so we'll just output PNG with .ico extension)
    await sharp(pngBuffer)
      .toFile(icoPath);
      
    console.log('Favicon generated successfully at public/favicon.ico');
  } catch (err) {
    console.error('Error generating favicon:', err);
  }
}

generateFavicon();
