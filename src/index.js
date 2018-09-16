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
import CanvasBuffer from './common/CanvasBuffer';
import path from 'path';
import { viewSet } from './common/Config';
import fs from 'fs';

import "./style/main.css";

const { Footer, Sider, Content } = Layout;

let mapReader, tileReader, objReader;
let queue;
let tempCanvas;
const CELL_WIDTH = 32;
const CELL_HEIGHT = 24;

let mViewSetting = { ...viewSet };

let ox = -100;
let oy = -100;
let drawCount = 0;

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
        },
        objList: []
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
        this.overCanvas.setAttribute('width', stageWidth);
        this.overCanvas.setAttribute('height', stageHeight);
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

            this.canvas.width = this.overCanvas.width = this.state.stageWidth;
            drawCount = 0;
            if (mViewSetting.baseTile)
                this.renderTile(startX, endX, startY, endY);
            if (mViewSetting.overTile)
                this.renderOver(startX, endX, startY, endY);
            if (mViewSetting.obj)
                this.renderObj(startX, endX, startY, endY);
            this.renderRoof(startX, endX, startY, endY);
            // this.setState({
            //     message: `DrawCount:${drawCount}`
            // })
            this.overCanvas.width = this.state.stageWidth;
            if (mViewSetting.grid) this.renderGrid();
            if (mViewSetting.walkable) this.renderWalkable(startX, endX, startY, endY);
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
                    //drawCount++;
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
                    //drawCount++;
                    let data = new ImageData(Uint8ClampedArray.from(imageData), 32, 24);
                    tempCanvas.getContext('2d').putImageData(data, 0, 0);
                    ctx.drawImage(tempCanvas, 0, 0, 32, 24, screenX * 32, screenY * 24, 32, 24);
                }
            }
        }
    }

    renderObj(x1, x2, y1, y2) {
        let shouldUpdateObjList = false;
        if (ox !== x1 || oy !== y1) {
            shouldUpdateObjList = true;
        }
        let objList = [];

        let ctx = this.ctx;
        if (!ctx) return;
        for (let y = y1; y < y2; y++) {
            for (let x = x1; x < x2; x++) {
                var cell = mapReader.cells[x + y * mapReader.fileHeader.width];
                var screenX = x - x1;
                var screenY = y - y1;
                if (cell.objId > 0) {
                    const obj = objReader.getObj(cell.objId);
                    if (obj) {
                        if (shouldUpdateObjList) {
                            objList.push(obj);
                        }
                        drawCount++;
                        if (obj.header.show) {
                            let data = new ImageData(Uint8ClampedArray.from(obj.images[0]), obj.header.iWidth, obj.header.iHeight);
                            tempCanvas.getContext('2d').putImageData(data, 0, 0);
                            //ctx.globalAlpha = .2;
                            ctx.drawImage(tempCanvas, 0, 0, obj.header.iWidth, obj.header.iHeight,
                                screenX * 32 + obj.header.ipx,
                                screenY * 24 + obj.header.ipy,
                                obj.header.iWidth,
                                obj.header.iHeight);
                        }
                    }
                }
            }
        }



        if (objList.length > 0) {
            this.setState({
                objList
            });
        }
    }

    renderRoof(x1, x2, y1, y2) {

    }

    renderWalkable(x1, x2, y1, y2) {
        let ctx = this.ctx;
        if (!ctx) return;
        for (let y = y1; y < y2; y++) {
            for (let x = x1; x < x2; x++) {
                var cell = mapReader.cells[x + y * mapReader.fileHeader.width];
                var screenX = x - x1;
                var screenY = y - y1;
                if (cell.bMove) {
                    ctx.globalAlpha = .3;
                    ctx.fillStyle = 'red';
                    ctx.fillRect(screenX * 32, screenY * 24, 32, 24);
                    ctx.globalAlpha = 1;
                }
            }
        }
    }

    renderGrid() {
        if (!this.ctx) return;
        let ctx = this.ctx;
        let w = this.state.stageH;
        let h = this.state.stageV;

        ctx.strokeStyle = 'rgba(0, 0, 0, .8)';
        for (let x = 0; x < w; x++) {
            ctx.moveTo(x * 32 + .5, .5);
            ctx.lineTo(x * 32 + .5, h * 24 + .5);
        }

        for (let y = 0; y < h; y++) {
            ctx.moveTo(0.5, y * 24 + .5)
            ctx.lineTo(w * 32 + .5, y * 24 + .5);
        }
        ctx.stroke();
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

    onToggleShow = (objId) => {
        let list = this.state.objList;
        let obj = list.find(o => o.header.objId === objId);
        if (obj) {
            obj.header.show = !obj.header.show;
        }
        this.setState({
            objList: list
        });

        let nobj = objReader.getObj(objId);
        if (nobj) {
            nobj.header.show = obj.header.show;
        }
    }


    saveMyMap(dir) {


        let cw = 32;
        let ch = 24;
        let groupCount = 10;
        let mapWidth = mapReader.fileHeader.width;
        let mapHeight = mapReader.fileHeader.height;
        let scale = .2;

        let nw = cw * groupCount;
        let nh = ch * groupCount;

        let hCross = mapWidth / groupCount;
        let vCross = mapHeight / groupCount;

        let canvas = document.createElement('canvas');
        canvas.setAttribute('width', nw);
        canvas.setAttribute('height', nh);
        let ctx = canvas.getContext('2d');

        let miniCanvas = document.createElement('canvas');
        miniCanvas.setAttribute('width', mapWidth * cw * scale);
        miniCanvas.setAttribute('height', mapHeight * ch * scale);
        let miniCtx = miniCanvas.getContext('2d');

        const mapName = mapReader.getName();
        if (!fs.existsSync(path.join(dir, mapName))) {
            fs.mkdir(path.join(dir, mapName));
        }

        if (!fs.existsSync(path.join(dir, mapName, 'tile'))) {
            fs.mkdir(path.join(dir, mapName, 'tile'));
        }

        if (!fs.existsSync(path.join(dir, mapName, 'obj'))) {
            fs.mkdir(path.join(dir, mapName, 'obj'));
        }

        this.saveObj(dir);
        return;

        for (let y = 0; y < vCross; y++) {
            for (let x = 0; x < hCross; x++) {
                let sourceX = x * groupCount;
                let sourceY = y * groupCount;

                for (let i = 0; i < groupCount * groupCount; i++) {
                    let cellX = i % groupCount;
                    let cellY = Math.floor(i / groupCount);

                    let cell = mapReader.getCell(cellX + sourceX, cellY + sourceY);
                    var screenX = cellX * cw;
                    var screenY = cellY * ch
                    let imageData = tileReader.getTile(cell.tileId, cell.tileNumber);
                    if (imageData) {
                        let data = new ImageData(Uint8ClampedArray.from(imageData), cw, ch);
                        ctx.putImageData(data, screenX, screenY);
                    }

                    imageData = tileReader.getTile(cell.overId, cell.overNumber);
                    if (imageData) {
                        //drawCount++;
                        let data = new ImageData(Uint8ClampedArray.from(imageData), cw, ch);
                        tempCanvas.getContext('2d').putImageData(data, 0, 0);
                        ctx.drawImage(tempCanvas, 0, 0, cw, ch, screenX, screenY, cw, ch);
                    }
                }

                miniCtx.drawImage(
                    canvas,
                    0, 0,
                    canvas.width, canvas.height,
                    sourceX * cw * scale, sourceY * ch * scale,
                    canvas.width * scale, canvas.height * scale
                )
                let imgBuf = CanvasBuffer(canvas, 'image/jpeg', 65);
                fs.writeFileSync(path.join(dir, mapName, 'tile', `${x + y * hCross}.jpg`), imgBuf);
                this.setState({
                    'message': `Save Tile Block ${x}-${y}`
                })
            }
        }

        let miniBuf = CanvasBuffer(miniCanvas, 'image/jpeg', 65);
        fs.writeFileSync(path.join(dir, mapName, `mini.jpg`), miniBuf);
        this.setState({
            'message': `Done.`
        });

        setTimeout(() => {
            this.saveMapCell(dir);
        }, 0);
    }

    saveMapCell(dir) {
        const mapName = mapReader.getName();
        let str = '';
        for (let i = 0; i < mapReader.cells.length; i++) {
            let cell = mapReader.cells[i];
            str += `${cell.objId},${cell.objNumber},${cell.roofId},${cell.bMove}\n`;
        }
        fs.writeFileSync(path.join(dir, mapName, `cell.txt`), str);
        this.setState({
            'message': `Saved map info.`
        });

        setTimeout(() => {
            this.saveObj(dir);
        }, 0);
    }

    saveObj(dir) {
        const mapName = mapReader.getName();
        let objs = [];

        let canvas = document.createElement('canvas');
        let ctx = canvas.getContext('2d');
        for (let i = 0; i < objReader.objs.length; i++) {
            objs.push(objReader.objs[i].header);
            let obj = objReader.objs[i];
            let objId = obj.header.objId.toString();

            canvas.setAttribute('width', obj.header.iWidth * obj.images.length);
            canvas.setAttribute('height', obj.header.iHeight);
            for (let j = 0; j < obj.images.length; j++) {

                let data = new ImageData(Uint8ClampedArray.from(obj.images[j]), obj.header.iWidth, obj.header.iHeight);
                ctx.putImageData(data, j * obj.header.iWidth, 0);

            }

            let fileBuf = CanvasBuffer(canvas, 'image/png');
            fs.writeFileSync(path.join(dir, mapName, `obj`, `${objId}.png`), fileBuf);

        }
        let str = JSON.stringify(objs);
        fs.writeFileSync(path.join(dir, mapName, `obj.json`), str);
        this.setState({
            'message': `Saved obj info.`
        });

    }

    componentDidMount() {
        tempCanvas = document.createElement('canvas');
        tempCanvas.setAttribute('width', 1024);
        tempCanvas.setAttribute('height', 768);
        this.canvas = document.getElementById('stage');
        this.ctx = this.canvas.getContext('2d');
        this.canvasContainer = this.canvas.parentNode;
        this.overCanvas = document.getElementById('stageOver');
        this.overCtx = this.overCanvas.getContext('2d');

        window.addEventListener('resize', this.onResize);
        ipcRenderer.send('page_init', 'init');
        ipcRenderer.on('OPEN', this.onOpen);
        ipcRenderer.on('viewsetchange', (evt, arg) => {
            mViewSetting = { ...arg };
        });
        ipcRenderer.on("SAVE", (e, dir) => {
            this.saveMyMap(dir);
        });

        window.addEventListener('keydown', this.onKeydown);

        setTimeout(() => this.resetStageSize(), 0);
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.onResize);
        window.removeEventListener('keydown', this.onKeydown);
    }

    render() {
        const { message, mapInfo, camera, thumb, stageH, stageV, objList } = this.state;
        return (
            <Layout style={{ height: '100%' }}>
                <Layout style={{ height: '100%' }}>
                    <Content className="stage">
                        <canvas id="stage" width="550" height="400"></canvas>
                        <canvas id="stageOver" width="550" height="400"></canvas>
                    </Content>
                    <Sider className="sidebar">
                        <Thumb thumb={thumb} mapInfo={mapInfo} camera={camera} stageH={stageH} stageV={stageV} />
                        <UnitProperty mapInfo={mapInfo} camera={camera} />
                        <UnitLibrary objList={objList} onToggleShow={this.onToggleShow} />
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