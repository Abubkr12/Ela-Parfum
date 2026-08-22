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

    // Pattern 1: padding: "40px", /* reduced on mobile */ 32px'  -> padding: '40px 32px'
    // Let's just catch all variations of this mistake.
    // The mistake was replacing `padding: '40px` or `padding: "40px` or `padding: 40px` with `padding: "40px", /* reduced on mobile */`
    
    // Let's replace the exact string `padding: "40px", /* reduced on mobile */` with `padding: "40px"` if it's inside an object. 
    // Actually, if it's followed by ` 32px'` it should be `padding: "40px 32px"`.
    
    // First, let's fix the broken string concatenations:
    // Case A: `padding: "40px", /* reduced on mobile */ 32px'` -> `padding: "40px 32px"`
    content = content.replace(/padding:\s*"40px",\s*\/\* reduced on mobile \*\/\s*([^"']+)(["'])/g, 'padding: "40px $1"$2');
    
    // Case B: `padding: "40px", /* reduced on mobile */` where it was just `padding: '40px'` originally
    // If it is followed by a comma or closing brace, it's fine.
    // If it has a dangling quote like `padding: "40px", /* reduced on mobile */'` it means the original was `padding: '40px'`.
    content = content.replace(/padding:\s*"40px",\s*\/\* reduced on mobile \*\/(['"])/g, 'padding: "40px", /* reduced on mobile */');

    // Case C: The regex `padding: "120px 24px" /* mobile-pad-y-reduce applied via wrapper */`
    // Let's check if it broke anything. 
    // Wait, the error message said:
    // `padding: "40px", /* reduced on mobile */ 32px'`
    
    // Let's just remove the `, /* reduced on mobile */` entirely everywhere and put it back to normal `padding: "40px"` but we have to handle the quote mismatch.
    
    // Let's do this: 
    // Find: `padding: "40px", /\* reduced on mobile \*/([^,'"}]+)?`
    // We can just use a replacer function to fix it manually.
    content = content.replace(/padding:\s*"40px",\s*\/\* reduced on mobile \*\/([^,}\n]*)/g, (match, p1) => {
      let remainder = p1.trim();
      if (remainder.startsWith("'") || remainder.startsWith('"')) {
         // It was something like `padding: '40px'`
         return `padding: "40px"`;
      } else if (remainder.length > 0) {
         // It was something like ` 32px'`
         // Remove the trailing quote from remainder if any
         let clean = remainder.replace(/['"]$/, '');
         return `padding: "40px ${clean}"`;
      } else {
         return `padding: "40px"`;
      }
    });

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Fixed', filePath);
    }
  }
});
