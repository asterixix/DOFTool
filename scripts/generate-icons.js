const path = require('path');
const fs = require('fs');
const icongen = require('icon-gen');

const publicDir = path.join(__dirname, '../public');
const buildDir = path.join(__dirname, '../build');
const iconsDir = path.join(buildDir, 'icons');
const sourceIcon = path.join(publicDir, 'icon.svg');

// Icon sizes needed for Linux
const LINUX_ICON_SIZES = [16, 32, 48, 64, 72, 96, 128, 256, 512];

// Ensure output directories exist
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Check if source icon exists
if (!fs.existsSync(sourceIcon)) {
  console.error('❌ Source icon not found:', sourceIcon);
  console.error('   Please ensure public/icon.svg exists');
  process.exit(1);
}

console.log('🎨 Generating icons from:', sourceIcon);

// Generate icons for different platforms
const options = {
  // macOS .icns
  icns: {
    name: 'icon',
    sizes: [16, 32, 64, 128, 256, 512, 1024]
  },
  // Windows .ico
  ico: {
    name: 'icon',
    sizes: [16, 24, 32, 48, 64, 128, 256]
  },
  // Favicon .ico (smaller sizes)
  favicon: {
    name: 'favicon',
    pngSizes: [32, 57, 72, 96, 120, 128, 144, 152, 195, 228],
    icoSizes: [16, 24, 32, 48, 64]
  },
  // Report generation progress
  report: true
};

async function generateIcons() {
  try {
    // Generate .icns and .ico files
    console.log('📦 Generating .icns and .ico files...');
    await icongen(sourceIcon, publicDir, options);
    
    // Generate Linux PNG icons with proper naming
    console.log('🐧 Generating Linux PNG icons...');
    // Generate all sizes at once using a temporary directory
    const tempDir = path.join(iconsDir, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    await icongen(sourceIcon, tempDir, {
      ico: false,
      icns: false,
      favicon: {
        name: 'icon',
        pngSizes: LINUX_ICON_SIZES,
        icoSizes: []
      },
      report: false
    });
    
    // Rename and move files to correct location
    const tempFiles = fs.readdirSync(tempDir);
    for (const size of LINUX_ICON_SIZES) {
      const sourceFile = path.join(tempDir, `icon${size}.png`);
      const targetFile = path.join(iconsDir, `${size}x${size}.png`);
      
      if (fs.existsSync(sourceFile)) {
        fs.renameSync(sourceFile, targetFile);
        console.log(`   ✓ ${size}x${size}.png`);
      }
    }
    
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
    
        
    console.log('✅ All icons generated successfully!');
    console.log('   📁 Output directories:');
    console.log(`      - ${publicDir} (icon.icns, icon.ico, favicon.ico)`);
    console.log(`      - ${iconsDir} (Linux PNG icons)`);
  } catch (err) {
    console.error('❌ Error generating icons:', err);
    process.exit(1);
  }
}

generateIcons();
