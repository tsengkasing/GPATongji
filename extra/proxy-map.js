const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, 'proxy.log')).toString();
let IPList = content.split('\r\n').map(ip => `http://${ip}`);

console.log(IPList);

fs.writeFileSync(path.join(__dirname, 'proxy.json'), JSON.stringify(IPList), {flag: 'w'});
