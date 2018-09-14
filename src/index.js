const { ipcRenderer } = require('electron');
const ATZReader = require('./src/ATZReader');
const ObjReader = require('./src/ObjReader');
const TileReader = require('./src/TileReader');
const MapReader = require('./src/MapReader');
const path = require('path');

let camera = {
    x: 12,
    y: 12
}

let reader;
let tileReader;
let objReader;
let canvas, ctx;
let index = 0;
let stageWidth = 800;
let stageHeight = 600;
function ready() {
    ipcRenderer.send('page_init', 'init');
    canvas = document.getElementById('stage');
    ctx = canvas.getContext('2d');
    ipcRenderer.on('OPEN', (evt, arg) => {
        let ext = path.extname(arg).toLowerCase();
        switch (ext) {
            case '.atz':
                reader = new ATZReader(arg);

                break;
            case '.obj':
                reader = new ObjReader(arg);
                if (reader.read()) {
                    canvas = document.getElementById('stage');
                    ctx = canvas.getContext('2d');
                    index = 0;
                    //renderATZImage();
                    //reader.saveAsSpriteSheet('/Users/yuantao/documents/');
                }
            case '.map':
                reader = new MapReader(arg);

                if (reader.read()) {
                    const tilePath = path.join(path.dirname(arg), path.basename(arg, path.extname(arg)) + 'til.til');
                    tileReader = new TileReader(tilePath);

                    const objPath = path.join(path.dirname(arg), path.basename(arg, path.extname(arg)) + 'obj.obj');
                    objReader = new ObjReader(objPath);
                    if (tileReader.read() && objReader.read()) {

                        render();
                    }
                }
                break;
        }
    });
}


document.documentElement.addEventListener('keydown', (e) => {
    let keyCode = e.keyCode;
    if (keyCode === 39) {
        camera.x += 1;
    }
    if (keyCode === 37) {
        camera.x -= 1;
    }

    if (keyCode === 38) {
        camera.y -= 1;
    }

    if (keyCode === 40) {
        camera.y += 1;
    }
});


let last = Date.now();
var temp = document.createElement('canvas');
temp.setAttribute('width', stageWidth);
temp.setAttribute('height', stageHeight);
function render() {

    if (!reader)
        return;
    let now = Date.now();
    if (now - last > 100) {
        last = now;
        let startX = camera.x - 12;
        let startY = camera.y - 12;
        if (startX < 0) startX = 0;
        if (startY < 0) startY = 0;

        var endX = startX + 25;
        var endY = startY + 25;
        if (endX >= reader.fileHeader.width) {
            endX = reader.fileHeader.width - 1;
        }
        if (endY >= reader.fileHeader.height) {
            endY = reader.fileHeader.height - 1;
        }

        ctx.fillRect(0, 0, stageWidth, stageHeight);

        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                var cell = reader.cells[(x) + (y) * reader.fileHeader.width];
                var screenX = x - startX;
                var screenY = y - startY;
                let imageData = tileReader.getTile(cell.tileId, cell.tileNumber);
                if (imageData) {
                    let data = new ImageData(Uint8ClampedArray.from(imageData), 32, 24);
                    ctx.putImageData(data, screenX * 32, screenY * 24);
                }

                if (cell.overId > 0) {
                    imageData = tileReader.getTile(cell.overId, cell.overNumber);
                    if (imageData) {
                        let data = new ImageData(Uint8ClampedArray.from(imageData), 32, 24);
                        temp.getContext('2d').putImageData(data, 0, 0);
                        ctx.drawImage(temp, 0, 0, 32, 24, screenX * 32, screenY * 24, 32, 24);
                    }
                }


                //console.log();
                //console.log(cell.tileId);
            }
        }

        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                var cell = reader.cells[(x) + (y) * reader.fileHeader.width];
                var screenX = x - startX;
                var screenY = y - startY;
                if (cell.objId > 0) {
                    const obj = objReader.getObj(cell.objId);
                    if (obj) {
                        console.log(obj.header)
                        let data = new ImageData(Uint8ClampedArray.from(obj.images[0]), obj.header.iWidth, obj.header.iHeight);
                        temp.getContext('2d').putImageData(data, 0, 0);
                        ctx.drawImage(temp, 0, 0, obj.header.iWidth, obj.header.iHeight, screenX * 32 + obj.header.ipx, screenY * 24 + obj.header.ipy, obj.header.iWidth, obj.header.iHeight);

                    }
                }
            }
        }
    }

    requestAnimationFrame(render);
}


//reader = new ObjReader('/Users/yuantao/documents/newversion/startobj.obj');
//reader.read();
//console.log(reader.objs)


// var data = ctx.getImageData(0, 0, 200, 200);
// for (let y = 0; y < 200; y++) {
//     for (let x = 0; x < 200; x++) {
//         index = x + y * 200;
//         let cell = reader.cells[index];
//         data.data[index * 4] = cell.bMove === 0 ? 255 : 0;
//         data.data[index * 4 + 1] = 0;
//         data.data[index * 4 + 2] = 0;
//         data.data[index * 4 + 3] = 255;
//     }
// }

// ctx.putImageData(data, 0, 0);

// let image = reader.blocks[0];

// let data = new ImageData(Uint8ClampedArray.from(image.data[0][0]), image.header.tileWidth, image.tileHeight);

// ctx.fillRect(0, 0, stageWidth, stageHeight);
// ctx.putImageData(data, 0, 0);




function renderATZImage() {
    let now = Date.now();
    if (now - last > 100) {
        last = now;
        index++;
        if (index >= reader.fileHeader.imageCount) {
            index = 0;
        }
        let image = reader.images[index];
        let data = new ImageData(Uint8ClampedArray.from(image.data), image.width, image.height);

        ctx.fillRect(0, 0, stageWidth, stageHeight);
        ctx.putImageData(data, (stageWidth >> 1) + image.px, (stageHeight >> 1) + image.py);
    }
    requestAnimationFrame(renderATZImage);
}

window.addEventListener('load', ready);