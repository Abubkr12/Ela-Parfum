const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'app', 'api', 'shipping', 'rates', 'route.ts');
let content = fs.readFileSync(file, 'utf8');

// 1. Update the couriers string
content = content.replace(/"couriers": "gojek,grab,lalamove,jnt,jne,ninja,wahana,jnt_cargo"/, `"couriers": "gojek,grab,lalamove,jnt,jne,ninja,idx"`);

// 2. Update the bestRatesMap logic and filter
const regex = /for \(const rate of rates\) \{\s*const key = rate\.courier_service_code;\s*if \(\!bestRatesMap\.has\(key\) \|\| rate\.price < bestRatesMap\.get\(key\)\.price\) \{\s*bestRatesMap\.set\(key, rate\);\s*\}\s*\}/m;

const replacement = `for (const rate of rates) {
                // Filter out cars, vans, trucks because perfumes are small packages
                const serviceLower = (rate.courier_service_code || '').toLowerCase();
                const nameLower = (rate.courier_name || '').toLowerCase();
                if (serviceLower.includes('car') || serviceLower.includes('van') || serviceLower.includes('truck') || nameLower.includes('car') || nameLower.includes('van') || nameLower.includes('truck')) {
                    continue;
                }

                // Use company + service code as key to prevent Grab Instant from overwriting Gojek Instant
                const key = \`\${rate.courier_company}_\${rate.courier_service_code}\`;
                
                if (!bestRatesMap.has(key) || rate.price < bestRatesMap.get(key).price) {
                    bestRatesMap.set(key, rate);
                }
            }`;

content = content.replace(regex, replacement);
fs.writeFileSync(file, content);
console.log("Done");
