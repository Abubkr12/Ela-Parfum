const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir(path.join(__dirname, 'src'), function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Fix 1: padding: "40px , -> padding: "40px",
    content = content.replace(/padding:\s*"40px\s*,/g, 'padding: "40px",');

    // Fix 2: display: ""flex" -> display: "flex"
    content = content.replace(/display:\s*""flex"/g, 'display: "flex"');

    // Fix 3: padding: "40px 20px"" -> padding: "40px 20px"
    // And any padding: "..."' or padding: '...""'
    content = content.replace(/padding:\s*"([^"]+)"['"]/g, 'padding: "$1"');
    content = content.replace(/padding:\s*'([^']+)'['"]/g, 'padding: "$1"');

    // Fix padding: "40px 32px"', -> padding: "40px 32px",
    content = content.replace(/padding:\s*"([^"]+)"',\s*/g, 'padding: "$1", ');

    // Just in case: padding: "40px"' -> padding: "40px"
    content = content.replace(/padding:\s*"([^"]+)"'/g, 'padding: "$1"');

    // Fix 4: Any rogue `padding: "40px 20px""`
    content = content.replace(/padding:\s*"([^"]+)""/g, 'padding: "$1"');

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Cleaned', filePath);
    }
  }
});
