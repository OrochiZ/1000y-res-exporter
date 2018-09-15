

class QueueOp {
    constructor(objs, method, report, done) {
        this.objs = objs;
        this.method = method;
        this.report = report;
        this.done = done;

    }

    run() {
        if (this.objs.length > 0) {
            let objInfo = this.objs.shift();
            let obj = objInfo.obj;
            this.report(objInfo.start, false);
            if (obj[this.method] && obj[this.method].call(obj)) {
                setTimeout(() => {
                    this.run();
                }, 0);
            } else {
                this.report(objInfo.error, true);
            }
        } else {
            this.done();
        }

    }
}

export default QueueOp;