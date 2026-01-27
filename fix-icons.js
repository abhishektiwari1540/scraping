const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing icon imports...');

// Find and replace DatabaseIcon with ArchiveBoxIcon in all files
function fixFilesInDir(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      fixFilesInDir(filePath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.jsx')) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Replace DatabaseIcon with ArchiveBoxIcon
      if (content.includes('DatabaseIcon')) {
        content = content.replace(/DatabaseIcon/g, 'ArchiveBoxIcon');
        content = content.replace(/import.*DatabaseIcon.*from.*@heroicons.*/g, 
          (match) => match.replace('DatabaseIcon', 'ArchiveBoxIcon'));
        fs.writeFileSync(filePath, content);
        console.log(`✅ Fixed ${filePath}`);
      }
      
      // Replace CloudDownloadIcon with CloudArrowDownIcon
      if (content.includes('CloudDownloadIcon')) {
        content = content.replace(/CloudDownloadIcon/g, 'CloudArrowDownIcon');
        content = content.replace(/import.*CloudDownloadIcon.*from.*@heroicons.*/g, 
          (match) => match.replace('CloudDownloadIcon', 'CloudArrowDownIcon'));
        fs.writeFileSync(filePath, content);
        console.log(`✅ Fixed ${filePath}`);
      }
      
      // Replace ViewGridIcon with Squares2X2Icon
      if (content.includes('ViewGridIcon')) {
        content = content.replace(/ViewGridIcon/g, 'Squares2X2Icon');
        content = content.replace(/import.*ViewGridIcon.*from.*@heroicons.*/g, 
          (match) => match.replace('ViewGridIcon', 'Squares2X2Icon'));
        fs.writeFileSync(filePath, content);
        console.log(`✅ Fixed ${filePath}`);
      }
    }
  });
}

// Start fixing from the app directory
fixFilesInDir(path.join(__dirname, 'app'));
console.log('🎉 All icon imports fixed!');