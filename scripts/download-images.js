const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { JSDOM } = require('jsdom');

// Configuration
const FRONTEND_DIR = path.join(__dirname, '../../frontend');
const BACKEND_UPLOADS_DIR = path.join(__dirname, '../uploads');
const IMAGE_CATEGORIES = {
  avatars: 'avatars',
  properties: 'properties',
  services: 'services',
  backgrounds: 'backgrounds'
};

// Ensure directories exist
function ensureDirectories() {
  Object.values(IMAGE_CATEGORIES).forEach(category => {
    const dir = path.join(BACKEND_UPLOADS_DIR, category);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  });
}

// Extract image URLs from JavaScript/JSX files
function extractImageUrlsFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const urls = [];

  // Special handling for PropertiesPage.jsx template literals
  if (filePath.includes('PropertiesPage.jsx')) {
    // Hardcoded image IDs from the PropertiesPage template literal
    const propertyImageIds = [1396122, 2121121, 2102587, 2343468, 2462015, 3555615, 2102586, 3288103, 3288100, 2462016, 2121120, 2343469];

    propertyImageIds.forEach(id => {
      const url = `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=800`;
      urls.push({
        url,
        filePath,
        context: 'PropertiesPage',
        category: 'properties'
      });
    });
  }

  // Handle regular image URLs (Unsplash, etc.)
  const urlRegex = /https:\/\/images\.(?:unsplash|pexels)\.com\/[^"'\s)]+/g;
  const matches = content.match(urlRegex);

  if (matches) {
    matches.forEach(url => {
      // Skip if already handled by template literal parsing
      if (urls.some(u => u.url === url)) return;

      // Clean up URL (remove query params for uniqueness)
      const cleanUrl = url.split('?')[0];
      urls.push({
        url: cleanUrl,
        filePath,
        context: path.basename(filePath),
        category: categorizeImage(cleanUrl, path.basename(filePath))
      });
    });
  }

  return urls;
}

// Find all JS/JSX files in frontend
function findJsxFiles(dir) {
  const files = [];

  function scanDirectory(currentDir) {
    const items = fs.readdirSync(currentDir);

    items.forEach(item => {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        scanDirectory(fullPath);
      } else if (stat.isFile() && (item.endsWith('.js') || item.endsWith('.jsx'))) {
        files.push(fullPath);
      }
    });
  }

  scanDirectory(dir);
  return files;
}

// Download image with retry logic and rate limiting
async function downloadImage(url, filepath, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Downloading: ${url}`);
      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'stream',
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://www.pexels.com/'
        }
      });

      // Check if response is valid
      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const writer = fs.createWriteStream(filepath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });
    } catch (error) {
      console.log(`Attempt ${i + 1} failed for ${url}: ${error.message}`);
      if (i === retries - 1) throw error;

      // Longer delay for rate limiting
      const delay = (i + 1) * 2000 + Math.random() * 1000; // 2-3s, 4-5s, 6-7s
      console.log(`Waiting ${Math.round(delay/1000)}s before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Generate filename from URL
function generateFilename(url, index, category) {
  const extension = path.extname(url.split('?')[0]) || '.jpg';
  return `${category}_${index + 1}${extension}`;
}

// Categorize images based on context
function categorizeImage(url, context) {
  if (context.includes('avatar') || context.includes('Auth') || context.includes('user')) {
    return 'avatars';
  } else if (context.includes('property') || context.includes('Properties')) {
    return 'properties';
  } else if (context.includes('service') || context.includes('Services')) {
    return 'services';
  } else if (context.includes('Home') || context.includes('hero') || context.includes('background')) {
    return 'backgrounds';
  }
  return 'misc';
}

// Update frontend files to use local paths
function updateFrontendFiles(imageMap) {
  const jsxFiles = findJsxFiles(FRONTEND_DIR);

  jsxFiles.forEach(filePath => {
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;

    // Replace image URLs
    Object.entries(imageMap).forEach(([originalUrl, localPath]) => {
      if (content.includes(originalUrl)) {
        // Convert backend path to frontend-accessible URL
        const frontendUrl = localPath.replace('/uploads/', '/api/uploads/');
        content = content.replace(new RegExp(originalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), frontendUrl);
        updated = true;
      }
    });

    if (updated) {
      fs.writeFileSync(filePath, content);
      console.log(`Updated: ${path.relative(FRONTEND_DIR, filePath)}`);
    }
  });
}

// Main execution
async function main() {
  console.log('🚀 Starting image download and frontend update process...\n');

  // Ensure directories exist
  ensureDirectories();

  // Find all JSX files
  const jsxFiles = findJsxFiles(FRONTEND_DIR);
  console.log(`Found ${jsxFiles.length} JSX/JS files to scan\n`);

  // Extract all image URLs
  const allImages = [];
  jsxFiles.forEach(filePath => {
    const images = extractImageUrlsFromFile(filePath);
    allImages.push(...images);
  });

  // Remove duplicates
  const uniqueImages = [];
  const seen = new Set();
  allImages.forEach(img => {
    if (!seen.has(img.url)) {
      seen.add(img.url);
      uniqueImages.push(img);
    }
  });

  console.log(`Found ${uniqueImages.length} unique images to download\n`);

  // Download images
  const imageMap = {};
  const downloadedImages = [];

  for (let i = 0; i < uniqueImages.length; i++) {
    const { url, context, category } = uniqueImages[i];
    const filename = generateFilename(url, downloadedImages.filter(img => img.category === category).length, category);
    const filepath = path.join(BACKEND_UPLOADS_DIR, category, filename);

    // Skip if already downloaded
    if (fs.existsSync(filepath)) {
      console.log(`⏭️  Already exists: ${category}/${filename}`);
      imageMap[url] = `/uploads/${category}/${filename}`;
      downloadedImages.push({ category, filename, localPath: `/uploads/${category}/${filename}` });
      continue;
    }

    try {
      await downloadImage(url, filepath);
      const localPath = `/uploads/${category}/${filename}`;
      imageMap[url] = localPath;
      downloadedImages.push({ category, filename, localPath });
      console.log(`✅ Downloaded: ${category}/${filename}`);
    } catch (error) {
      console.log(`❌ Failed to download: ${url} - ${error.message}`);

      // Try alternative sources for common images
      if (url.includes('pexels.com') && error.message.includes('404')) {
        console.log(`🔄 Trying alternative source for Pexels image...`);
        // Could implement fallback to Lorem Picsum or other services
      }
    }

    // Small delay to be respectful to external services (increased)
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 seconds between downloads
  }

  console.log(`\n📊 Download Summary:`);
  console.log(`Total images found: ${uniqueImages.length}`);
  console.log(`Successfully downloaded: ${downloadedImages.length}`);
  console.log(`Failed downloads: ${uniqueImages.length - downloadedImages.length}`);

  // Update frontend files
  console.log(`\n🔄 Updating frontend files...`);
  updateFrontendFiles(imageMap);

  // Save mapping for reference
  const mappingFile = path.join(__dirname, 'image-mapping.json');
  fs.writeFileSync(mappingFile, JSON.stringify({
    downloaded: downloadedImages,
    mapping: imageMap,
    generatedAt: new Date().toISOString()
  }, null, 2));

  console.log(`\n✅ Process complete!`);
  console.log(`📁 Images saved to: ${BACKEND_UPLOADS_DIR}`);
  console.log(`📋 Mapping saved to: ${mappingFile}`);
  console.log(`🔄 Frontend files updated to use local image paths`);
}

main().catch(console.error);