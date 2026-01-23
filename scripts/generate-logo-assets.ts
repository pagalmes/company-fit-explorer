/**
 * Logo Asset Generator
 *
 * Generates all PNG assets from SVG source files for favicons, PWA icons,
 * social media, and app store icons.
 *
 * Usage:
 *   npx tsx scripts/generate-logo-assets.ts
 *
 * Prerequisites:
 *   npm install sharp --save-dev
 */

import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const LOGO_DIR = path.join(PUBLIC_DIR, 'logo');

// Ensure output directory exists
if (!fs.existsSync(LOGO_DIR)) {
  fs.mkdirSync(LOGO_DIR, { recursive: true });
}

interface IconConfig {
  name: string;
  source: string;
  width: number;
  height: number;
  outputDir?: string; // defaults to LOGO_DIR
}

const ICONS: IconConfig[] = [
  // Favicons
  { name: 'favicon-16x16.png', source: 'favicon.svg', width: 16, height: 16 },
  { name: 'favicon-32x32.png', source: 'favicon.svg', width: 32, height: 32 },
  { name: 'favicon-48x48.png', source: 'favicon.svg', width: 48, height: 48 },

  // Apple Touch Icons (sun fills most of the space)
  { name: 'apple-touch-icon.png', source: 'cosmos-sun-apple.svg', width: 180, height: 180, outputDir: PUBLIC_DIR },
  { name: 'apple-touch-icon-precomposed.png', source: 'cosmos-sun-apple.svg', width: 180, height: 180 },
  { name: 'apple-touch-icon-120x120.png', source: 'cosmos-sun-apple.svg', width: 120, height: 120 },
  { name: 'apple-touch-icon-152x152.png', source: 'cosmos-sun-apple.svg', width: 152, height: 152 },
  { name: 'apple-touch-icon-167x167.png', source: 'cosmos-sun-apple.svg', width: 167, height: 167 },

  // PWA Icons (standard)
  { name: 'icon-192.png', source: 'cosmos-sun-maskable.svg', width: 192, height: 192, outputDir: PUBLIC_DIR },
  { name: 'icon-512.png', source: 'cosmos-sun-maskable.svg', width: 512, height: 512, outputDir: PUBLIC_DIR },

  // PWA Maskable Icons
  { name: 'icon-maskable-192.png', source: 'cosmos-sun-maskable.svg', width: 192, height: 192 },
  { name: 'icon-maskable-512.png', source: 'cosmos-sun-maskable.svg', width: 512, height: 512 },

  // Social Media Profile Icons
  { name: 'youtube-channel-icon.png', source: 'cosmos-sun-maskable.svg', width: 800, height: 800 },
  { name: 'twitter-profile.png', source: 'cosmos-sun-maskable.svg', width: 400, height: 400 },
  { name: 'linkedin-profile.png', source: 'cosmos-sun-maskable.svg', width: 400, height: 400 },
  { name: 'discord-server-icon.png', source: 'cosmos-sun-maskable.svg', width: 512, height: 512 },

  // Open Graph / Social Cards
  { name: 'og-image.png', source: 'og-image.svg', width: 1200, height: 630 },
  { name: 'twitter-card.png', source: 'og-image.svg', width: 1200, height: 600 },

  // General purpose logos
  { name: 'logo-64.png', source: 'cosmos-sun.svg', width: 64, height: 64 },
  { name: 'logo-128.png', source: 'cosmos-sun.svg', width: 128, height: 128 },
  { name: 'logo-256.png', source: 'cosmos-sun.svg', width: 256, height: 256 },
  { name: 'logo-512.png', source: 'cosmos-sun.svg', width: 512, height: 512 },
  { name: 'logo-1024.png', source: 'cosmos-sun.svg', width: 1024, height: 1024 },
];

async function generateIcon(config: IconConfig): Promise<void> {
  const sourcePath = path.join(LOGO_DIR, config.source);
  const outputDir = config.outputDir || LOGO_DIR;
  const outputPath = path.join(outputDir, config.name);

  if (!fs.existsSync(sourcePath)) {
    console.error(`  ✗ Source not found: ${config.source}`);
    return;
  }

  try {
    await sharp(sourcePath)
      .resize(config.width, config.height, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(outputPath);

    console.log(`  ✓ Generated ${config.name} (${config.width}x${config.height})`);
  } catch (error) {
    console.error(`  ✗ Failed to generate ${config.name}:`, error);
  }
}

async function generateFavicon(): Promise<void> {
  // Note: For .ico files, you may want to use a dedicated tool like 'png-to-ico'
  // or an online converter, as sharp doesn't natively support .ico output
  console.log('\n  ℹ  For favicon.ico, use an online converter or png-to-ico package');
  console.log('     Combine: favicon-16x16.png, favicon-32x32.png, favicon-48x48.png');
}

async function main(): Promise<void> {
  console.log('🎨 Generating logo assets...\n');
  console.log('Source directory:', LOGO_DIR);
  console.log('Output directory:', PUBLIC_DIR);
  console.log('');

  // Check for required source files
  const requiredSources = ['cosmos-sun.svg', 'cosmos-sun-maskable.svg', 'cosmos-sun-apple.svg', 'favicon.svg', 'og-image.svg'];
  const missingSources = requiredSources.filter(src => !fs.existsSync(path.join(LOGO_DIR, src)));

  if (missingSources.length > 0) {
    console.error('❌ Missing source files:');
    missingSources.forEach(src => console.error(`   - ${src}`));
    process.exit(1);
  }

  console.log('📁 Generating icons...\n');

  for (const config of ICONS) {
    await generateIcon(config);
  }

  await generateFavicon();

  console.log('\n✅ Asset generation complete!\n');
  console.log('Next steps:');
  console.log('  1. Generate favicon.ico from the PNG files');
  console.log('  2. Update public/favicon.svg with the new design');
  console.log('  3. Verify manifest.json references the correct icons');
}

main().catch(console.error);
