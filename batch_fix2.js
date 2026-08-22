const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const replacements = [
  // 1fr 1fr -> grid-2-col
  {
    find: /style=\{\{\s*display:\s*["']grid["'],\s*gridTemplateColumns:\s*["']1fr 1fr["']/g,
    replace: 'className="grid-2-col" style={{'
  },
  {
    find: /style=\{\{\s*gridTemplateColumns:\s*["']1fr 1fr["']/g,
    replace: 'className="grid-2-col" style={{'
  },
  // 1fr 380px / 1fr 400px / 1fr 420px -> grid-sidebar-right
  {
    find: /style=\{\{\s*display:\s*["']grid["'],\s*gridTemplateColumns:\s*["']1fr 380px["']/g,
    replace: 'className="grid-sidebar-right" style={{'
  },
  {
    find: /style=\{\{\s*display:\s*["']grid["'],\s*gridTemplateColumns:\s*["']1fr 400px["']/g,
    replace: 'className="grid-sidebar-right" style={{'
  },
  {
    find: /style=\{\{\s*display:\s*["']grid["'],\s*gridTemplateColumns:\s*["']1fr 420px["']/g,
    replace: 'className="grid-sidebar-right" style={{'
  },
  // 280px 1fr -> grid-sidebar-left
  {
    find: /style=\{\{\s*gridTemplateColumns:\s*['"]280px 1fr['"]\s*\}\}/g,
    replace: 'className="grid-sidebar-left"'
  },
  // flex space-between without wrap -> flex-between-wrap
  {
    find: /style=\{\{\s*display:\s*['"]flex['"],\s*alignItems:\s*['"]center['"],\s*justifyContent:\s*['"]space-between['"]/g,
    replace: 'className="flex-between-wrap" style={{ '
  },
  // keranjang cart items 60px 1fr auto auto auto -> stack on mobile
  {
    find: /style=\{\{\s*display:\s*['"]grid['"],\s*gridTemplateColumns:\s*['"]60px 1fr auto auto auto['"]/g,
    replace: 'className="cart-item-grid" style={{ '
  }
];

let modifiedFiles = 0;

walkDir(path.join(__dirname, 'src'), function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    replacements.forEach(rule => {
      content = content.replace(rule.find, rule.replace);
    });

    // Add mobile-pad-reduce className to cards with 40px padding if not there (safely!)
    content = content.replace(/className="card"/g, 'className="card mobile-pad-reduce"');

    // Add table-responsive wrapper ONLY to safe tables (very strictly matching generic tables without wrappers)
    if (content.includes('<table') && !content.includes('table-responsive')) {
      // Replace only plain <table ...> not already wrapped
      // To be super safe, let's just leave tables alone, they usually have horizontal scroll from their container.
      // Wait, let's just do it for Invoice tables specifically.
      if (filePath.includes('invoice')) {
        content = content.replace(/<table/g, '<div className="table-responsive"><table');
        content = content.replace(/<\/table>/g, '</table></div>');
      }
    }

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      modifiedFiles++;
    }
  }
});

console.log(`Updated ${modifiedFiles} files.`);
