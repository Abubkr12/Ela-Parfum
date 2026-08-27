const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'app', 'api', 'shipping', 'rates', 'route.ts');
let content = fs.readFileSync(file, 'utf8');

const regex = /const payload = \{\s*"origin_area_id": origin\.id,\s*"destination_area_id": body\.destination_area_id,\s*"couriers": "gojek,grab,lalamove,jnt,jne,ninja,idx",\s*"items": \[/m;

const replacement = `const payload: any = {
                "origin_area_id": origin.id,
                "destination_area_id": body.destination_area_id,
                "couriers": "gojek,grab,lalamove,jnt,jne,ninja,idx",
                "items": [`;

content = content.replace(regex, replacement);

const regex2 = /\]\s*\};\s*const isSandbox = process\.env\.BITESHIP_IS_SANDBOX === 'true';/m;
const replacement2 = `]
            };
            
            if (body.destination_latitude && body.destination_longitude) {
                payload.destination_latitude = body.destination_latitude;
                payload.destination_longitude = body.destination_longitude;
            } else if (body.destination_coordinate?.latitude && body.destination_coordinate?.longitude) {
                payload.destination_latitude = body.destination_coordinate.latitude;
                payload.destination_longitude = body.destination_coordinate.longitude;
            }

            const isSandbox = process.env.BITESHIP_IS_SANDBOX === 'true';`;

content = content.replace(regex2, replacement2);
fs.writeFileSync(file, content);
console.log("Done");
