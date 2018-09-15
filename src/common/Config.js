const Events = require('events');
const viewSet = {
    baseTile: true,
    overTile: true,
    obj: true,
    walkable: true,
    grid: true
}

let event = new Events.EventEmitter();

let toggleViewSet = function (flag) {
    viewSet[flag] = !viewSet[flag];
    event.emit('viewsetchange');
}

module.exports = {
    viewSet,
    toggleViewSet,
    onViewSetChange: function (callback) {
        event.on('viewsetchange', callback);
    }
}