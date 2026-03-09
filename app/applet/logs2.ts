fetch('http://127.0.0.1:3000/api/payments/webhook-logs')
  .then(r => r.json())
  .then(data => console.log(JSON.stringify(data, null, 2)))
  .catch(e => console.error(e));
