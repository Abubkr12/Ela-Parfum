const fs = require('fs');
const p = 'src/app/globals.css';
let css = fs.readFileSync(p, 'utf8');

const newCss = `
.cart-item-grid { display: grid; grid-template-columns: 60px 1fr auto auto auto; }
@media (max-width: 768px) {
  .cart-item-grid {
    grid-template-columns: 60px 1fr !important;
    gap: 12px !important;
  }
  .cart-item-grid > *:nth-child(3),
  .cart-item-grid > *:nth-child(4),
  .cart-item-grid > *:nth-child(5) {
    grid-column: span 2;
  }
}
`;

if (!css.includes('.cart-item-grid')) {
  css = css + '\n' + newCss;
  fs.writeFileSync(p, css);
}
console.log('globals.css cart-item-grid added');
