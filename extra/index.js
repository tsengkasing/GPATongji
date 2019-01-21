const fs = require('fs');
const request = require('request-promise-native');
const iconv = require('iconv-lite');

main().then(() => {});

async function main() {
    const file = fs.readFileSync('proxy.txt').toString();
    const proxyList = file.split('\r\n').slice(0, file.length - 1);

    const len = proxyList.length;
    const filteredList = [];
    // console.log(len);

    for (let i in proxyList) {
        if (i < 810) continue;
        const proxyURL = proxyList[i];
        console.log(`Testing ${i} / ${len} => ${proxyURL}`);
        try {
                await request.get('https://www.baidu.com', {
                        proxy: `http://${proxyURL}`,
                        timeout: 2000
                });
                console.log(`[OK] ${proxyURL}\r\n`);
        } catch (e) {
                console.error(e);
        }

        /*(async function(proxyURL) {
                try {
                    console.log(`Testing ${i} / ${len} => ${proxyURL}`);
                    await request.get('https://www.baidu.com', {
                            proxy: `http://${proxyURL}`
                    });
                    console.log(`${proxyURL}\r\n`)
                } catch (e) {}
        })(url);*/
    }

    // fs.writeFileSync('proxy_filtered.json', JSON.stringify(filteredList), { flag: 'w'});
    console.log('finish');
}
