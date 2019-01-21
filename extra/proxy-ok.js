const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, 'GPATongji-out.log')).toString();
let IPList = content.split('\n')
    .filter(line => line.endsWith('OK'))
    .map(line => /\[(.*)\]/.exec(line)[1]);

IPList = Array.from(new Set(IPList));

fs.writeFileSync(path.join(__dirname, 'proxy.json'), JSON.stringify(IPList), {flag: 'w'});
