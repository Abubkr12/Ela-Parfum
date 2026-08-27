const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'app', 'admin', '(dashboard)', 'pesanan', '[id]', 'page.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace('order.notes?.match(/CustomRequestID:\\s*(\\d+)/i)', 'order.notes?.match(/CustomRequestID:\\s*([a-f0-9\\-]+)/i)');
content = content.replace('eq("id", parseInt(customMatch[1], 10))', 'eq("id", customMatch[1])');

fs.writeFileSync(file, content);
console.log("Done");
