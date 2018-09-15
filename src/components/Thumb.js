import React from 'react';

class Thumb extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            cx: -1,
            cy: -1,
        };
    }

    checkPos(nextProps) {
        if (this.thumb) {
            let { cx, cy, mapWidth, mapHeight } = this.state;
            if (mapWidth && mapHeight && (nextProps.camera.x !== cx || nextProps.camera.y !== cy)) {
                cx = nextProps.camera.x;
                cy = nextProps.camera.y;
                let perX = cx / mapWidth;
                let perY = cy / mapHeight;
                let x = parseInt(perX * this.tw);
                let y = parseInt(perY * this.th);
                this.currentPos.style.left = (x + 25) + 'px';
                this.currentPos.style.top = y + 'px';
                let viewPortWidth = parseInt((nextProps.stageH / nextProps.mapInfo.width) * this.tw);
                let viewPortHeight = parseInt((nextProps.stageV / nextProps.mapInfo.height) * this.th);
                this.currentPos.style.width = `${viewPortWidth}px`;
                this.currentPos.style.height = `${viewPortHeight}px`;
            }
        }
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.thumb) {
            if (!this.thumb) {
                this.thumb = nextProps.thumb;
                this.draw();
                this.setState({
                    mapWidth: nextProps.mapInfo.width,
                    mapHeight: nextProps.mapInfo.height
                }, () => {
                    this.checkPos(nextProps);
                });
            }
        } else {
            this.thumb = null;
        }
        this.checkPos(nextProps);
    }

    componentDidMount() {
        this.canvas = document.getElementById('thumb_canvas');
        this.ctx = this.canvas.getContext('2d');
        this.currentPos = document.getElementById('currentPos');
    }

    draw() {
        if (this.ctx) {
            let max = Math.max(this.thumb.width, this.thumb.height);
            let h = max === this.thumb.width ? 150 : 113;
            let p = h / max;
            let width = this.thumb.width * p;
            let height = this.thumb.height * p;
            let imgData = new ImageData(Uint8ClampedArray.from(this.thumb.data), this.thumb.width, this.thumb.height);
            let bufCanvas = document.createElement('canvas');
            bufCanvas.setAttribute('width', this.thumb.width);
            bufCanvas.setAttribute('height', this.thumb.height);
            bufCanvas.getContext('2d').putImageData(imgData, 0, 0);
            let px = width - 150 >> 1;
            let py = height - 113 >> 1;
            this.px = -px;
            this.py = -py;
            this.tw = width;
            this.th = height;
            this.ctx.drawImage(bufCanvas, 0, 0, this.thumb.width, this.thumb.height, -px, -py, width, height);
        }
    }

    render() {
        return (
            <div className="map_thumb">
                <canvas width="150" height="113" id="thumb_canvas"></canvas>
                <div id="currentPos"></div>
            </div>
        )
    }
}

export default Thumb;