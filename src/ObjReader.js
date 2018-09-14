const FileStream = require('./FileStream');

class ObjReader extends FileStream {
    getObj(id) {
        return this.objs.find(o => o.header.objId === id);
    }

    read(filename) {
        if (!super.read(filename)) {
            return;
        }

        this.fileHeader = this.readFileHeader();
        if (this.fileHeader && this.fileHeader.ident === 'ATZOBJ3') {
            this.objs = [];
            for (let i = 0; i < this.fileHeader.count; i++) {
                this.readObj3();
            }
            return true;
        }
    }

    /**
     * @OBJ_FILE_HEADER
     *  char ident[8];
	 *  int size;
     */
    readFileHeader() {
        let ident = this.readString(8);
        let count = this.readInt();

        return {
            ident,
            count
        }
    }

    readObj3() {
        const header = this.readObjHeader3();
        const images = [];
        for (let k = 0; k < header.imageCount; k++) {
            let data = Array(header.iWidth * header.iHeight * 4);
            for (let i = 0, len = header.iWidth * header.iHeight; i < len; i++) {
                let color = this.readUShort();
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
            images.push(data);
        }
        this.objs.push({
            header,
            images
        });
    }

    /**
     * @OBJ_HEADER3
        { 
            int aniId;
            int objId;
            byte objType;
            int width;
            int height;
            int imageCount;
            int startId;
            int endId;

            int iWidth;
            int iHeight;
            int ipx;
            int ipy;

            byte buffer[256];
            int aniDelay;
            int dataPos;
            int unused[4];
            ushort * pColor;
        }
     */
    readObjHeader3() {
        let aniId = this.readInt();
        let objId = this.readInt();
        let objType = this.readByte();
        let width = this.readInt();
        let height = this.readInt();
        let imageCount = this.readInt();
        let startId = this.readInt();
        let endId = this.readInt();
        let iWidth = this.readInt();
        let iHeight = this.readInt();
        let ipx = this.readInt();
        let ipy = this.readInt();

        this.position += 256;
        let aniDelay = this.readInt();
        let dataPos = this.readInt();
        this.position += 20;

        return {
            aniId,
            objId,
            objType,
            width,
            height,
            imageCount,
            startId,
            endId,
            iWidth,
            iHeight,
            ipx,
            ipy,
            aniDelay,
            dataPos
        }
    }
}

module.exports = ObjReader;