import React from 'react';
import ReactDOM from 'react-dom';
import { Layout } from 'antd';
import Thumb from './components/Thumb';
import UnitProperty from './components/UnitProperty';
import UnitLibrary from './components/UnitLibrary';
import { ipcRenderer } from 'electron'
import MapReader from './common/MapReader';
import TileReader from './common/TileReader';
import ObjReader from './common/ObjReader';
import QueueOp from './common/QueueOp';
import ThumbLoader from './common/ThumbLoader';
import path from 'path';

import "./style/main.css";

const { Footer, Sider, Content } = Layout;

let mapReader, tileReader, objReader;
let queue;
let tempCanvas;
const CELL_WIDTH = 32;
const CELL_HEIGHT = 24;

class App extends React.Component {
    last = Date.now();
    state = {
        message: 'No map loaded.',
        mapInfo: {
            width: 200,
            height: 200
        },
        camera: {
            x: 115,
            y: 44
        }
    }
    onResize = (e) => {
        this.resetStageSize();
    }

    resetStageSize() {
        if (!this.canvasContainer) return;
        let stageWidth = this.canvasContainer.clientWidth - 2;
        let stageHeight = this.canvasContainer.clientHeight - 24;
        let stageH = Math.ceil(stageWidth / CELL_WIDTH);
        let stageV = Math.ceil(stageHeight / CELL_HEIGHT);
        this.setState({
            stageWidth,
            stageHeight,
            stageH,
            stageV
        });
        this.canvas.setAttribute('width', stageWidth);
        this.canvas.setAttribute('height', stageHeight);
    }

    gameRender = () => {
        let now = Date.now();
        let last = this.last;
        if (now - last > 1000) {
            let { camera, stageH, stageV } = this.state;
            last = now;
            let startX = camera.x;
            let startY = camera.y;
            let endX = startX + stageH;
            let endY = startY + stageV;

            this.renderTile(startX, endX, startY, endY);
            this.renderOver(startX, endX, startY, endY);
            this.renderObj(startX, endX, startY, endY);
            this.renderRoof(startX, endX, startY, endY);
            this.renderWalkable(startX, endX, startY, endY);
        }

        requestAnimationFrame(this.gameRender);
    }

    renderTile(x1, x2, y1, y2) {
        let ctx = this.ctx;
        if (!ctx) return;
        for (let y = y1; y < y2; y++) {
            for (let x = x1; x < x2; x++) {
                var cell = mapReader.cells[x + y * mapReader.fileHeader.width];
                var screenX = x - x1;
                var screenY = y - y1;
                let imageData = tileReader.getTile(cell.tileId, cell.tileNumber);
                if (imageData) {
                    let data = new ImageData(Uint8ClampedArray.from(imageData), 32, 24);
                    ctx.putImageData(data, screenX * 32, screenY * 24);
                }
            }
        }

    }

    renderOver(x1, x2, y1, y2) {
        let ctx = this.ctx;
        if (!ctx) return;
        for (let y = y1; y < y2; y++) {
            for (let x = x1; x < x2; x++) {
                var cell = mapReader.cells[x + y * mapReader.fileHeader.width];
                var screenX = x - x1;
                var screenY = y - y1;
                let imageData = tileReader.getTile(cell.overId, cell.overNumber);
                if (imageData) {
                    let data = new ImageData(Uint8ClampedArray.from(imageData), 32, 24);
                    tempCanvas.getContext('2d').putImageData(data, 0, 0);
                    ctx.drawImage(tempCanvas, 0, 0, 32, 24, screenX * 32, screenY * 24, 32, 24);
                }
            }
        }
    }

    renderObj(x1, x2, y1, y2) {

    }

    renderRoof(x1, x2, y1, y2) {

    }

    renderWalkable(x1, x2, y1, y2) {

    }

    onOpen = (evt, arg) => {
        mapReader = new MapReader(arg);
        const thumbPath = path.join(path.dirname(arg), path.basename(arg, path.extname(arg)) + '.bmp');
        const tilePath = path.join(path.dirname(arg), path.basename(arg, path.extname(arg)) + 'til.til');
        tileReader = new TileReader(tilePath);
        const objPath = path.join(path.dirname(arg), path.basename(arg, path.extname(arg)) + 'obj.obj');
        objReader = new ObjReader(objPath);
        queue = new QueueOp([
            { obj: mapReader, start: 'Loading .map file', error: `Can not open ${arg}` },
            { obj: tileReader, start: 'Loading .til file', error: `Can not open ${tilePath}` },
            { obj: objReader, start: 'Loading .obj file', error: `Can not open ${objPath}` }
        ], 'read', (msg, hasError) => {
            if (hasError) {
                ipcRenderer.send('SHOW_ERROR', msg);
            } else {
                this.setState({
                    'message': msg
                });
            }
        }, () => {
            ThumbLoader(thumbPath).then(thumb => {
                this.setState({
                    thumb: {
                        data: thumb.data,
                        width: thumb.width,
                        height: thumb.height
                    },
                    'message': 'Load Completed.',
                    mapInfo: {
                        width: mapReader.fileHeader.width,
                        height: mapReader.fileHeader.height
                    }
                });
                this.status = 'rending';
                this.gameRender();
            });
        });
        queue.run();
    }

    onKeydown = (e) => {
        if (this.status === 'rending') {
            let { stageH, stageV, camera, mapInfo } = this.state;
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

            if (camera.x < 0) camera.x = 0;
            if (camera.y < 0) camera.y = 0;
            if (camera.x > (mapInfo.width - stageH)) {
                camera.x = mapInfo.width - stageH;
            }
            if (camera.y > (mapInfo.height - stageV)) {
                camera.y = mapInfo.height - stageV;
            }
            this.setState({
                camera
            });
        }
    }

    componentDidMount() {
        tempCanvas = document.createElement('canvas');
        tempCanvas.setAttribute('width', 1024);
        tempCanvas.setAttribute('height', 768);
        this.canvas = document.getElementById('stage');
        this.ctx = this.canvas.getContext('2d');
        this.canvasContainer = this.canvas.parentNode;
        window.addEventListener('resize', this.onResize);
        setTimeout(() => this.resetStageSize(), 0);
        ipcRenderer.send('page_init', 'init');
        ipcRenderer.on('OPEN', this.onOpen);
        window.addEventListener('keydown', this.onKeydown);
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.onResize);
        window.removeEventListener('keydown', this.onKeydown);
    }

    render() {
        const { message, mapInfo, camera, thumb, stageH, stageV } = this.state;
        return (
            <Layout style={{ height: '100%' }}>
                <Layout style={{ height: '100%' }}>
                    <Content className="stage">
                        <canvas id="stage" width="550" height="400"></canvas>
                    </Content>
                    <Sider className="sidebar">
                        <Thumb thumb={thumb} mapInfo={mapInfo} camera={camera} stageH={stageH} stageV={stageV} />
                        <UnitProperty mapInfo={mapInfo} camera={camera} />
                        <UnitLibrary />
                    </Sider>
                </Layout>
                <Footer className="statusbar">{message}</Footer>
            </Layout>
        )
    }
}

ReactDOM.render(<App />, document.getElementById('root'));

// import { ipcRenderer } from 'electron';
// import ATZReader from './common/ATZReader';
// import ObjReader from './common/ObjReader';
// import TileReader from './common/TileReader';
// import MapReader from './common/MapReader';
// import path from 'path';
// import { viewSet } from './common/Config';


// let camera = {
//     x: 12,
//     y: 12
// }

// let reader;
// let tileReader;
// let objReader;
// let canvas, ctx;
// let index = 0;
// let stageWidth = 800;
// let stageHeight = 600;
// function ready() {
//     ipcRenderer.send('page_init', 'init');
//     canvas = document.getElementById('stage');
//     ctx = canvas.getContext('2d');
//     ipcRenderer.on('viewsetchange', (evt, arg) => {
//         console.log(arg, viewSet);
//     })
//     ipcRenderer.on('OPEN', (evt, arg) => {
//         let ext = path.extname(arg).toLowerCase();
//         switch (ext) {
//             case '.atz':
//                 reader = new ATZReader(arg);

//                 break;
//             case '.obj':
//                 reader = new ObjReader(arg);
//                 if (reader.read()) {
//                     canvas = document.getElementById('stage');
//                     ctx = canvas.getContext('2d');
//                     index = 0;
//                     //renderATZImage();
//                     //reader.saveAsSpriteSheet('/Users/yuantao/documents/');
//                 }
//             case '.map':
//                 reader = new MapReader(arg);

//                 if (reader.read()) {
//                     const tilePath = path.join(path.dirname(arg), path.basename(arg, path.extname(arg)) + 'til.til');
//                     tileReader = new TileReader(tilePath);

//                     const objPath = path.join(path.dirname(arg), path.basename(arg, path.extname(arg)) + 'obj.obj');
//                     objReader = new ObjReader(objPath);
//                     if (tileReader.read() && objReader.read()) {

//                         render();
//                     }
//                 }
//                 break;
//         }
//     });
// }


// document.documentElement.addEventListener('keydown', (e) => {
//     let keyCode = e.keyCode;
//     if (keyCode === 39) {
//         camera.x += 1;
//     }
//     if (keyCode === 37) {
//         camera.x -= 1;
//     }

//     if (keyCode === 38) {
//         camera.y -= 1;
//     }

//     if (keyCode === 40) {
//         camera.y += 1;
//     }
// });


// let last = Date.now();
// var temp = document.createElement('canvas');
// temp.setAttribute('width', stageWidth);
// temp.setAttribute('height', stageHeight);
// function render() {

//     if (!reader)
//         return;
//     let now = Date.now();
//     if (now - last > 1000) {
//         last = now;
//         let startX = camera.x - 12;
//         let startY = camera.y - 12;
//         if (startX < 0) startX = 0;
//         if (startY < 0) startY = 0;

//         var endX = startX + 25;
//         var endY = startY + 25;
//         if (endX >= reader.fileHeader.width) {
//             endX = reader.fileHeader.width - 1;
//         }
//         if (endY >= reader.fileHeader.height) {
//             endY = reader.fileHeader.height - 1;
//         }

//         ctx.fillRect(0, 0, stageWidth, stageHeight);

//         for (let y = startY; y < endY; y++) {
//             for (let x = startX; x < endX; x++) {
//                 var cell = reader.cells[(x) + (y) * reader.fileHeader.width];
//                 var screenX = x - startX;
//                 var screenY = y - startY;
//                 let imageData = tileReader.getTile(cell.tileId, cell.tileNumber);
//                 if (imageData) {
//                     let data = new ImageData(Uint8ClampedArray.from(imageData), 32, 24);
//                     ctx.putImageData(data, screenX * 32, screenY * 24);
//                 }

//                 if (cell.overId > 0) {
//                     imageData = tileReader.getTile(cell.overId, cell.overNumber);
//                     if (imageData) {
//                         let data = new ImageData(Uint8ClampedArray.from(imageData), 32, 24);
//                         temp.getContext('2d').putImageData(data, 0, 0);
//                         ctx.drawImage(temp, 0, 0, 32, 24, screenX * 32, screenY * 24, 32, 24);
//                     }
//                 }


//                 //console.log();
//                 //console.log(cell.tileId);
//             }
//         }

//         let iCount = 0;
//         for (let y = startY; y < endY; y++) {
//             for (let x = startX; x < endX; x++) {
//                 var cell = reader.cells[(x) + (y) * reader.fileHeader.width];
//                 var screenX = x - startX;
//                 var screenY = y - startY;
//                 if (cell.objId > 0) {
//                     const obj = objReader.getObj(cell.objId);
//                     if (obj) {
//                         iCount++;
//                         let data = new ImageData(Uint8ClampedArray.from(obj.images[0]), obj.header.iWidth, obj.header.iHeight);
//                         temp.getContext('2d').putImageData(data, 0, 0);
//                         //ctx.globalAlpha = .2;
//                         ctx.drawImage(temp, 0, 0, obj.header.iWidth, obj.header.iHeight,
//                             screenX * 32 + obj.header.ipx,
//                             screenY * 24 + obj.header.ipy,
//                             obj.header.iWidth,
//                             obj.header.iHeight);
//                         let sx = screenX * 32 + obj.header.ipx;
//                         let sy = screenY * 24 + obj.header.ipy;

//                         ctx.rect(sx, sy, obj.header.iWidth, obj.header.iHeight);

//                     }
//                 }
//             }
//         }

//         ctx.fillStyle = 'red';
//         for (let y = startY; y < endY; y++) {
//             for (let x = startX; x < endX; x++) {
//                 var cell = reader.cells[(x) + (y) * reader.fileHeader.width];
//                 var screenX = x - startX;
//                 var screenY = y - startY;

//                 if (cell.bMove) {
//                     ctx.globalAlpha = .2;
//                     ctx.fillRect(screenX * 32, screenY * 24, 32, 24);
//                 }
//             }
//         }
//         ctx.globalAlpha = 1;
//         //ctx.stroke();
//         console.log(iCount);
//     }

//     requestAnimationFrame(render);
// }


// //reader = new ObjReader('/Users/yuantao/documents/newversion/startobj.obj');
// //reader.read();
// //console.log(reader.objs)


// // var data = ctx.getImageData(0, 0, 200, 200);
// // for (let y = 0; y < 200; y++) {
// //     for (let x = 0; x < 200; x++) {
// //         index = x + y * 200;
// //         let cell = reader.cells[index];
// //         data.data[index * 4] = cell.bMove === 0 ? 255 : 0;
// //         data.data[index * 4 + 1] = 0;
// //         data.data[index * 4 + 2] = 0;
// //         data.data[index * 4 + 3] = 255;
// //     }
// // }

// // ctx.putImageData(data, 0, 0);

// // let image = reader.blocks[0];

// // let data = new ImageData(Uint8ClampedArray.from(image.data[0][0]), image.header.tileWidth, image.tileHeight);

// // ctx.fillRect(0, 0, stageWidth, stageHeight);
// // ctx.putImageData(data, 0, 0);




// function renderATZImage() {
//     let now = Date.now();
//     if (now - last > 100) {
//         last = now;
//         index++;
//         if (index >= reader.fileHeader.imageCount) {
//             index = 0;
//         }
//         let image = reader.images[index];
//         let data = new ImageData(Uint8ClampedArray.from(image.data), image.width, image.height);

//         ctx.fillRect(0, 0, stageWidth, stageHeight);
//         ctx.putImageData(data, (stageWidth >> 1) + image.px, (stageHeight >> 1) + image.py);
//     }
//     requestAnimationFrame(renderATZImage);
// }

// window.addEventListener('load', ready);