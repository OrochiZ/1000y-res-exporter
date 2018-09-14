const fs = require('fs');

class FileStream {
    constructor(filename) {
        this.filename = filename;
    }

    read(filename) {
        if (!!filename)
            this.filename = filename;
        if (!fs.existsSync(this.filename)) {
            return false;
        }
        this.position = 0;
        this.fileBuf = fs.readFileSync(this.filename);
        return true;
    }

    readInt() {
        let result = this.fileBuf.readInt32LE(this.position);
        this.position += 4;
        return result;
    }

    readShort() {
        let result = this.fileBuf.readInt16LE(this.position);
        this.position += 2;
        return result;
    }

    readUint() {
        let result = this.fileBuf.readUInt32LE(this.position);
        this.position += 4;
        return result;
    }

    readUShort() {
        let result = this.fileBuf.readUInt16LE(this.position);
        this.position += 2;
        return result;
    }

    readByte() {
        let result = this.fileBuf.readUInt8(this.position);
        this.position += 1;
        return result;
    }

    readString(length) {
        let result = this.fileBuf.toString('ASCII', this.position, this.position + length)
        this.position += length;

        let i = 0;
        while (i < result.length) {
            if (result.charCodeAt(i++) === 0) {
                break;
            }
        }

        if (i - 1 < result.length && i > 0) {
            return result.substring(0, i - 1);
        }
        return result;
    }
}

module.exports = FileStream;