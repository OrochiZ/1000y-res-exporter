const fs = require('fs');
const path = require('path');
const Events = require('events');
const Packer = require('./Packer');


class TileReader {
    constructor(filename) {
        this.filename = filename;
    }

    read(filename) {
        if (!!filename)
            this.filename = filename;
        if (!fs.existsSync(this.filename)) {
            return false;
        }

        this.blocks = [];
        this.position = 0;
        this.fileBuf = fs.readFileSync(this.filename);

        this.fileHeader = this.readFileHeader();

        if (this.fileHeader) {
            for (let i = 0; i < this.fileHeader.count; i++) {
                this.readBlock();
            }
            return true;
        }
    }

    getTile(tileId, tileNumber) {
        let block = this.blocks.find(block => block.header.id === tileId);
        if (block) {
            var r = block.data[tileNumber];
            if (!r) {
                console.log(block.data, tileNumber);
            }
            return r;
        } else {
            console.log(tileId);
        }
    }

    /**
     * @TILE_FILE_HEADER
     *      char ident[8];
	 *      int nCount;
	 *      int filePos[1024];
     */
    readFileHeader() {
        let ident = this.fileBuf.toString('ASCII', 0, 7);
        let count = this.fileBuf.readUInt32LE(8);
        this.position += 1024 * 4 + 8 + 4;
        if (ident === 'ATZTIL2') {
            return {
                ident,
                count
            }
        }
    }

    /**
     * @BLOCK_HEADER
     * int id;
	 * byte style;
	 * int blockWidth;
	 * int blockHeight;
	 * int nBlock;
	 * int tileWidth;
	 * int tileHeight;
	 * unsigned char buffer[64];
	 * int aniDelay;
	 * int unused[4];
	 * WORD * pColor;
     */
    readBlock() {
        let header = this.readBlockHeader();
        let block = [];
        for (let i = 0; i < header.blockCount; i++) {
            // let nBlock = [];
            // block.push(nBlock);
            for (let y = 0; y < header.blockHeight; y++) {
                for (let x = 0; x < header.blockWidth; x++) {
                    let width = header.tileWidth;
                    let height = header.tileHeight;
                    let data = Array(width * height * 4);
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
                    block.push(data);
                    this.position += header.tileWidth * header.tileHeight * 2;
                }
            }
        }

        this.blocks.push({
            header,
            data: block
        });
    }

    readBlockHeader() {
        let id = this.readUInt32();
        let style = this.readByte();
        let blockWidth = this.readUInt32();
        let blockHeight = this.readUInt32();
        let blockCount = this.readUInt32();
        let tileWidth = this.readUInt32();
        let tileHeight = this.readUInt32();

        this.position += 64;

        let aniDelay = this.readUInt32();

        this.position += 20;

        return {
            id,
            style,
            blockWidth,
            blockHeight,
            blockCount,
            tileWidth,
            tileHeight,
            aniDelay
        }
    }

    readUInt32() {
        let result = this.fileBuf.readUInt32LE(this.position);
        this.position += 4;
        return result;
    }

    readByte() {
        let result = this.fileBuf.readUInt8(this.position);
        this.position += 1;
        return result;
    }
}

module.exports = TileReader;