/**
 * Generate Installer Loading GIF
 * 
 * Creates an animated GIF for the Windows Squirrel installer using pure JavaScript.
 * No native dependencies required.
 * 
 * Run with: node scripts/generate-installer-gif.js
 */

const fs = require('fs');
const path = require('path');

// GIF dimensions (Squirrel.Windows default is 420x315)
const WIDTH = 420;
const HEIGHT = 315;

const outputPath = path.join(__dirname, '..', 'public', 'installer-loading.gif');

/**
 * Simple GIF encoder - pure JavaScript implementation
 * Creates an animated GIF with a purple gradient and animated progress
 */
class SimpleGifEncoder {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.frames = [];
    this.globalColorTable = [];
    this.delay = 10; // centiseconds (100ms)
  }

  setDelay(ms) {
    this.delay = Math.round(ms / 10);
  }

  // Create a color palette for the GIF
  createColorPalette() {
    const colors = [];
    
    // Purple gradient colors (0-31)
    for (let i = 0; i < 32; i++) {
      const t = i / 31;
      const r = Math.round(102 + (118 - 102) * t);
      const g = Math.round(126 + (75 - 126) * t);
      const b = Math.round(234 + (162 - 234) * t);
      colors.push([r, g, b]);
    }
    
    // White variations (32-47)
    for (let i = 0; i < 16; i++) {
      const alpha = Math.round(255 * (i / 15));
      colors.push([alpha, alpha, alpha]);
    }
    
    // Additional colors
    colors.push([255, 255, 255]); // 48: Pure white
    colors.push([0, 0, 0]);       // 49: Black
    colors.push([102, 126, 234]); // 50: Primary purple
    colors.push([118, 75, 162]);  // 51: Secondary purple
    
    // Pad to 64 colors (6-bit color table)
    while (colors.length < 64) {
      colors.push([0, 0, 0]);
    }
    
    this.globalColorTable = colors;
    return colors;
  }

  // Create a frame with a simple pattern
  createFrame(frameIndex, totalFrames) {
    const pixels = new Uint8Array(this.width * this.height);
    const progress = frameIndex / totalFrames;
    
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = y * this.width + x;
        
        // Gradient background based on position
        const gradientT = (x + y) / (this.width + this.height);
        let colorIndex = Math.floor(gradientT * 31);
        
        // Center circle area
        const cx = this.width / 2;
        const cy = this.height / 2 - 40;
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Draw circular progress indicator
        if (dist >= 40 && dist <= 50) {
          const angle = Math.atan2(dy, dx);
          const normalizedAngle = (angle + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2);
          const progressAngle = progress * Math.PI * 2;
          
          if (normalizedAngle <= progressAngle) {
            colorIndex = 48; // White for progress
          } else {
            colorIndex = 40; // Dim white for background
          }
        }
        
        // Progress bar area (y = 200-210, centered)
        const barY = this.height / 2 + 100;
        const barWidth = 280;
        const barX = (this.width - barWidth) / 2;
        
        if (y >= barY && y <= barY + 6 && x >= barX && x <= barX + barWidth) {
          const barProgress = (x - barX) / barWidth;
          if (barProgress <= progress) {
            colorIndex = 48; // White
          } else {
            colorIndex = 36; // Dim
          }
        }
        
        pixels[idx] = colorIndex;
      }
    }
    
    return pixels;
  }

  // LZW encode image data
  lzwEncode(pixels) {
    const minCodeSize = 6; // 64 colors = 6 bits
    const clearCode = 1 << minCodeSize;
    const eoiCode = clearCode + 1;
    
    let codeSize = minCodeSize + 1;
    let nextCode = eoiCode + 1;
    const maxCode = 4095;
    
    const dictionary = new Map();
    for (let i = 0; i < clearCode; i++) {
      dictionary.set(String.fromCharCode(i), i);
    }
    
    const output = [];
    let bitBuffer = 0;
    let bitCount = 0;
    
    const writeBits = (code, size) => {
      bitBuffer |= code << bitCount;
      bitCount += size;
      while (bitCount >= 8) {
        output.push(bitBuffer & 0xff);
        bitBuffer >>= 8;
        bitCount -= 8;
      }
    };
    
    writeBits(clearCode, codeSize);
    
    let prefix = String.fromCharCode(pixels[0]);
    
    for (let i = 1; i < pixels.length; i++) {
      const suffix = String.fromCharCode(pixels[i]);
      const combined = prefix + suffix;
      
      if (dictionary.has(combined)) {
        prefix = combined;
      } else {
        writeBits(dictionary.get(prefix), codeSize);
        
        if (nextCode <= maxCode) {
          dictionary.set(combined, nextCode++);
          if (nextCode > (1 << codeSize) && codeSize < 12) {
            codeSize++;
          }
        }
        
        prefix = suffix;
      }
    }
    
    writeBits(dictionary.get(prefix), codeSize);
    writeBits(eoiCode, codeSize);
    
    if (bitCount > 0) {
      output.push(bitBuffer & 0xff);
    }
    
    // Package into sub-blocks
    const blocks = [];
    blocks.push(minCodeSize);
    
    for (let i = 0; i < output.length; i += 255) {
      const chunk = output.slice(i, Math.min(i + 255, output.length));
      blocks.push(chunk.length);
      blocks.push(...chunk);
    }
    blocks.push(0); // Block terminator
    
    return Buffer.from(blocks);
  }

  // Generate the complete GIF
  generate(numFrames = 30) {
    this.createColorPalette();
    
    const parts = [];
    
    // GIF Header
    parts.push(Buffer.from('GIF89a'));
    
    // Logical Screen Descriptor
    const lsd = Buffer.alloc(7);
    lsd.writeUInt16LE(this.width, 0);
    lsd.writeUInt16LE(this.height, 2);
    lsd.writeUInt8(0xF5, 4); // Global color table, 6 bits (64 colors)
    lsd.writeUInt8(0, 5);    // Background color index
    lsd.writeUInt8(0, 6);    // Pixel aspect ratio
    parts.push(lsd);
    
    // Global Color Table (64 colors * 3 bytes)
    const gct = Buffer.alloc(64 * 3);
    for (let i = 0; i < 64; i++) {
      gct[i * 3] = this.globalColorTable[i][0];
      gct[i * 3 + 1] = this.globalColorTable[i][1];
      gct[i * 3 + 2] = this.globalColorTable[i][2];
    }
    parts.push(gct);
    
    // Netscape Application Extension (for looping)
    parts.push(Buffer.from([
      0x21, 0xFF, 0x0B,
      0x4E, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2E, 0x30, // "NETSCAPE2.0"
      0x03, 0x01,
      0x00, 0x00, // Loop count (0 = infinite)
      0x00
    ]));
    
    // Generate frames
    for (let f = 0; f < numFrames; f++) {
      // Graphics Control Extension
      const gce = Buffer.alloc(8);
      gce[0] = 0x21; // Extension introducer
      gce[1] = 0xF9; // Graphics control label
      gce[2] = 0x04; // Block size
      gce[3] = 0x00; // Disposal method
      gce.writeUInt16LE(this.delay, 4); // Delay time
      gce[6] = 0x00; // Transparent color index
      gce[7] = 0x00; // Block terminator
      parts.push(gce);
      
      // Image Descriptor
      const id = Buffer.alloc(10);
      id[0] = 0x2C; // Image separator
      id.writeUInt16LE(0, 1); // Left
      id.writeUInt16LE(0, 3); // Top
      id.writeUInt16LE(this.width, 5);
      id.writeUInt16LE(this.height, 7);
      id[9] = 0x00; // No local color table
      parts.push(id);
      
      // Image Data
      const pixels = this.createFrame(f, numFrames);
      const imageData = this.lzwEncode(pixels);
      parts.push(imageData);
    }
    
    // Trailer
    parts.push(Buffer.from([0x3B]));
    
    return Buffer.concat(parts);
  }
}

// Generate the GIF
console.log('Generating installer loading GIF (pure JavaScript)...');
console.log(`Dimensions: ${WIDTH}x${HEIGHT}`);

const encoder = new SimpleGifEncoder(WIDTH, HEIGHT);
encoder.setDelay(100); // 100ms per frame

try {
  const gifData = encoder.generate(30); // 30 frames = 3 second animation
  fs.writeFileSync(outputPath, gifData);
  console.log(`\n✅ Generated: ${outputPath}`);
  console.log(`   File size: ${(gifData.length / 1024).toFixed(1)} KB`);
  console.log('\nInstaller loading GIF created successfully!');
} catch (error) {
  console.error('Error generating GIF:', error);
  process.exit(1);
}
