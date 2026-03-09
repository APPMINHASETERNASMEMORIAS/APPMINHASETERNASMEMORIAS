import fs from 'fs';
fetch('http://127.0.0.1:3000/api/payments/webhook-logs')
  .then(r => r.json())
  .then(data => fs.writeFileSync('logs.json', JSON.stringify(data, null, 2)));
