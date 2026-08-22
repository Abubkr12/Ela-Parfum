const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'app', 'api', 'webhooks', 'mayar', 'route.ts');
let content = fs.readFileSync(file, 'utf8');

const regex = /const \{ data: items \} = await supabaseAdmin[\s\S]*?const courierParts = order\.courier_name\.split/m;

const replacement = `const { data: items } = await supabaseAdmin
            .from('order_items')
            .select('*')
            .eq('order_id', order.id);
            
          let mappedItems: any[] = [];
          const isCustomOrder = order.notes?.includes('[Custom Refill]');
          
          const { data: currentItems } = await supabaseAdmin
            .from('order_items')
            .select('*')
            .eq('order_id', order.id);

          const allItems = currentItems && currentItems.length > 0 ? currentItems : (items || []);
          
          if (isCustomOrder) {
            let totalBottleSize = 50;
            let totalValue = 0;
            let ingredientNames: string[] = [];
            
            allItems.forEach((i: any) => {
               totalValue += i.subtotal || (i.price * i.quantity);
               if (i.perfume_name) {
                 ingredientNames.push(\`\${i.perfume_name} (\${i.size_label})\`);
               }
               if (i.perfume_name?.toLowerCase().includes('botol')) {
                 const match = (i.size_label || i.perfume_name || "").match(/(\\d+)\\s*ml/i);
                 if (match && match[1]) {
                   totalBottleSize = parseInt(match[1], 10);
                 }
               }
            });
            
            const detailDescription = ingredientNames.join(", ");
            
            mappedItems.push({
              name: \`Custom Refill (\${orderCode})\`,
              description: \`Racikan \${totalBottleSize}ml: \${detailDescription}\`,
              value: Math.max(1, totalValue),
              quantity: 1,
              weight: calcPackageWeight(totalBottleSize),
              ...DEFAULT_DIMENSIONS
            });
          } else {
            mappedItems = allItems.map((i: any) => {
              const sizeStr = (i.size_label || order.notes || "").toLowerCase();
              let bottleSize = 50;
              const match = sizeStr.match(/(\\d+)\\s*ml/);
              if (match && match[1]) {
                bottleSize = parseInt(match[1], 10);
              }
              
              return {
                name: i.perfume_name,
                description: i.size_label || "-",
                value: Math.max(1, i.price || 0),
                quantity: i.quantity,
                weight: calcPackageWeight(bottleSize),
                ...DEFAULT_DIMENSIONS
              };
            });
          }
          
          // Parse courier details
          // courierInfo pattern: "JNE - REG"
          const courierParts = order.courier_name.split`;

content = content.replace(regex, replacement);
fs.writeFileSync(file, content);
console.log("Done");
