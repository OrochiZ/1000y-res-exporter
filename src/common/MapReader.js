const FileStream = require('./FileStream');

class MapReader extends FileStream {

    read(filename) {
        if (!super.read(filename)) {
            return false;
        }
        this.ic = 0;
        this.fileHeader = this.readFileHeader();
        if (this.fileHeader) {
            this.cells = Array(this.fileHeader.width * this.fileHeader.height);
            let nWidth = Math.floor(this.fileHeader.width / this.fileHeader.blockSize);
            let nHeight = Math.floor(this.fileHeader.height / this.fileHeader.blockSize);
            for (let y = 0; y < nHeight; y++) {
                for (let x = 0; x < nWidth; x++) {
                    this.readBlock(x, y);
                }
            }

            return true;
        }
    }


    readBlock(bx, by) {
        const header = this.readBlockHeader();
        for (let y = 0; y < this.fileHeader.blockSize; y++) {
            for (let x = 0; x < this.fileHeader.blockSize; x++) {
                const cell = this.readCell();
                let mapX = bx * this.fileHeader.blockSize + x;
                let mapY = by * this.fileHeader.blockSize + y;
                let mapIndex = mapX + mapY * this.fileHeader.width;
                this.cells[mapIndex] = cell;
            }
        }
    }


    /**
     * @BLOCK_HEADER
     * char ident[16];
	 * int changedCount;
     */
    readBlockHeader() {
        let ident = this.readString(16);
        let changedCount = this.readInt();
        return {
            ident,
            changedCount
        }
    }

    /**
     * @CELL
     *      unsigned short tileId;
     *      byte tileNumber;
     *      unsigned short overId;
     *      byte overNumber;
     *      unsigned short objId;
     *      byte objectNumber;
     *      unsigned short roofId;
     *      byte boMove;
     */
    readCell() {
        const tileId = this.readUShort();
        const tileNumber = this.readByte();
        const overId = this.readUShort();
        const overNumber = this.readByte();
        const objId = this.readUShort();
        const objNumber = this.readByte();
        const roofId = this.readUShort();
        const bMove = this.readByte();
        return {
            tileId,
            tileNumber,
            overId,
            overNumber,
            objId,
            objNumber,
            roofId,
            bMove
        }
    }

    /**
     * @MAP_HEADER
     *      char ident[16];
     *      int blockSize;
     *      int width;
     *      int height;
     */
    readFileHeader() {
        let ident = this.readString(16);
        let blockSize = this.readInt();
        let width = this.readInt();
        let height = this.readInt();
        if (ident === 'ATZMAP2') {
            return {
                ident,
                blockSize,
                width,
                height
            }
        }
    }
}

module.exports = MapReader;