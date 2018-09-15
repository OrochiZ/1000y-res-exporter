const bmpJs = require('bmp-js');
const fs = require('fs');

module.exports = function (filename) {
    return new Promise((resolve, reject) => {
        const buf = fs.readFileSync(filename);
        let bmpData = bmpJs.decode(buf);
        let len = bmpData.data.length;
        let data = bmpData.data;
        for (let i = 0; i < len / 4; i++) {
            let loc = i * 4;
            let r = data[loc + 3];
            let a = data[loc];
            let b = data[loc + 1];
            let g = data[loc + 2];
            data[loc] = r;
            data[loc + 1] = g;
            data[loc + 2] = b;
            data[loc + 3] = 255;
        }
        resolve(bmpData);
    });
}