const jwt = require('jsonwebtoken');
const token = jwt.sign({id:'test',role:'ADMIN'}, 'your-secret-key-change-this');

fetch('http://localhost:5000/api/master-data', {
  headers: { 'Authorization': 'Bearer ' + token }
})
.then(res => res.json())
.then(data => console.log(JSON.stringify(Object.keys(data[0] || {}))))
.catch(console.error);
