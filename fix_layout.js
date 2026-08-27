const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'app', 'admin', '(dashboard)', 'layout.tsx');
let content = fs.readFileSync(file, 'utf8');

const regex = /\{\s*name:\s*"Pesanan",\s*href:\s*"\/admin\/pesanan",\s*icon:\s*Package,\s*subItems:\s*\[\s*\{\s*name:\s*"Pesanan Reguler"[^\}]+\},\s*\{\s*name:\s*"Pesanan Kustom"[^\}]+\},\s*\]\s*\}/m;

const replacement = `{ 
      name: "Pesanan", 
      href: "/admin/pesanan", 
      icon: Package 
    }`;

content = content.replace(regex, replacement);
fs.writeFileSync(file, content);
console.log("Done");
