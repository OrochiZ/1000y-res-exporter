const fs = require('fs');
const path = require('path');
const Events = require('events');
const Packer = require('./Packer');
const CanvasBuffer = require('./CanvasBuffer');

class ATZReader extends Events.EventEmitter {
    constructor(filename) {
        super();
        this.filename = filename;
    }

    saveAsSpriteSheet(dir, name) {
        if (!name) {
            name = path.basename(this.filename, path.extname(this.filename));
            console.log(name)
        }
        let blocks = [];
        for (let i = 0; i < this.images.length; i++) {
            blocks.push({
                w: reader.images[i].width,
                h: reader.images[i].height,
                index: i
            });
        };
        blocks.sort((a, b) => {
            return b.h - a.h;
        });
        let packer = new Packer();
        packer.fit(blocks);

        let canvas = document.createElement('canvas');

        canvas.setAttribute('width', packer.root.w);
        canvas.setAttribute('height', packer.root.h);

        let ctx = canvas.getContext('2d');
        for (let i = 0; i < blocks.length; i++) {
            this.copyPixels(ctx, blocks[i].index, blocks[i].fit.x, blocks[i].fit.y, blocks[i].w, blocks[i].y);
        }

        const buf = CanvasBuffer(canvas, 'image/png');

        fs.writeFileSync(path.join(dir, name + '.png'), buf);

    }

    copyPixels(ctx, index, x, y, width, height) {
        let image = this.images[index];
        let data = new ImageData(Uint8ClampedArray.from(image.data), image.width, image.height);
        ctx.putImageData(data, x, y);
    }

    read(filename) {
        if (!!filename)
            this.filename = filename;
        if (!fs.existsSync(this.filename)) {
            return false;
        }

        this.images = [];
        this.position = 0;
        this.fileBuf = fs.readFileSync(this.filename);

        this.fileHeader = this.readFileHeader();
        if (this.fileHeader) {
            for (let i = 0; i < this.fileHeader.imageCount; i++) {
                this.images.push(this.readImage());
            }
            return true;
        }

    }

    /**
     * @ATZ FileHeader
     * {
     *      char ident[4];  // ATZ0| ATZ1 | ATZ2
     *      int imageCount;
     *      int transparentColor;
     *      byte pattle[256 * 4];
     * }
     */
    readFileHeader() {
        const ident = this.fileBuf.toString('ascii', 0, 4);
        if (['ATZ0', 'ATZ1', 'ATZ2'].indexOf(ident) > -1) {
            let pattle = [], start = 12;
            for (let i = 0; i < 256; i++) {
                let loc = i * 4;
                let color = {
                    r: this.fileBuf[start + loc],
                    g: this.fileBuf[start + loc + 1],
                    b: this.fileBuf[start + loc + 2],
                    a: i === 0 ? 0 : 255
                };

                pattle.push(color);
            }
            this.position = 12 + 256 * 4;
            return {
                ident,
                imageCount: this.fileBuf.readUInt32LE(4),
                transparentColor: this.fileBuf.readUInt32LE(8),
                pattle
            }
        }
        return void 2333;
    }

    /**
     * @Image Header
     * {
     *      int width;
     *      int height;
     *      int px, py;
     *      int unused;
     * }
     */
    readImage() {
        let width, height, px, py, unused, data;
        width = this.fileBuf.readUInt32LE(this.position);
        height = this.fileBuf.readUInt32LE(this.position + 4);
        px = this.fileBuf.readUInt32LE(this.position + 8);
        py = this.fileBuf.readUInt32LE(this.position + 12);
        unused = this.fileBuf.readUInt32LE(this.position + 16);
        this.position += 20;
        data = Array(width * height * 4);
        console.log(this.fileHeader.transparentColor)
        if (this.fileHeader.ident === 'ATZ0') {
            for (let i = 0, len = width * height; i < len; i++) {
                let colorIndex = this.fileBuf[this.position + i];
                let color = this.fileHeader.pattle[colorIndex];
                data[i * 4] = color.r;
                data[i * 4 + 1] = color.g;
                data[i * 4 + 2] = color.b;
                data[i * 4 + 3] = color.a;
            }
            this.position += width * height;
        } else {
            for (let i = 0, len = width * height; i < len; i++) {
                let colorIndex = this.position + i * 2;
                let color = this.fileBuf.readUInt16LE(colorIndex);

                let b = color & 0x1F;
                let g = (color >> 5) & 0x1F;
                let r = (color >> 10) & 0x1F;
                let alpha = 255;

                if (color == 0)
                    alpha = 0;
                else if (color == 31) {
                    alpha = 80;
                    r = 0;
                    b = 0;
                    g = 0;
                }
                data[i * 4] = r * 8;
                data[i * 4 + 1] = g * 8;
                data[i * 4 + 2] = b * 8;
                data[i * 4 + 3] = alpha;
            }
            this.position += width * height * 2;
        }

        return {
            width,
            height,
            px, py,
            unused,
            data
        }
    }
}

module.exports = ATZReader;