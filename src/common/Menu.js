const { app, Menu } = require('electron');
const Events = require('events');
const { viewSet, toggleViewSet } = require('./Config');

let menu_;

const template = [
    {
        label: 'File',
        submenu: [
            {
                label: 'Open New Map', accelerator: 'CommandOrControl+O',
                click: (item, window, event) => { window.emit('OPEN', '.map') }
            },
            { label: 'Open New .atz file', click: (item, window, event) => { window.emit('OPEN', '.atz') } },
            {
                label: 'Open New .obj file',
                accelerator: 'CommandOrControl+Option+O',
                click: (item, window, event) => { window.emit('OPEN', '.obj') }
            },
            {
                label: 'Save As',
                accelerator: 'CommandOrControl+Alt+S',
                click: (item, window, event) => { window.emit('SAVE', 'map') }
            }
        ]
    },
    {
        label: 'Edit',
        submenu: [
            { role: 'undo' },
            { role: 'redo' },
            { type: 'separator' },
            { role: 'cut' },
            { role: 'copy' },
            { role: 'paste' },
            { role: 'pasteandmatchstyle' },
            { role: 'delete' },
            { role: 'selectall' }
        ]
    },
    {
        label: 'View',
        submenu: [
            { role: 'reload' },
            { role: 'forcereload' },
            { role: 'toggledevtools' },
            { type: 'separator' },

            {
                label: 'Show base tile', type: 'checkbox', checked: viewSet.baseTile,
                click: () => toggleViewSet('baseTile')
            },
            {
                label: 'Show over tile', type: 'checkbox', checked: viewSet.overTile,
                click: () => toggleViewSet('overTile')
            },
            {
                label: 'Show object', type: 'checkbox', checked: viewSet.obj,
                click: () => toggleViewSet('obj')
            },
            {
                label: 'Show walkable', type: 'checkbox', checked: viewSet.walkable,
                click: () => toggleViewSet('walkable')
            },
            {
                label: 'Show Grid', type: 'checkbox', checked: viewSet.grid,
                click: () => toggleViewSet('grid')
            },


            { type: 'separator' },
            { role: 'togglefullscreen' }
        ]
    },
    {
        role: 'window',
        submenu: [
            { role: 'minimize' },
            { role: 'close' }
        ]
    },
    {
        label: 'Tools',
        submenu: [
            {
                label: 'ATZ Exporter'
            },
            {
                label: 'Effect Exporter'
            },
            {
                label: 'Sound Exporter'
            }
        ]
    },
    {
        role: 'help',
        submenu: [
            {
                label: 'Learn More',
                click() { require('electron').shell.openExternal('https://electronjs.org') }
            }
        ]
    }
]


if (process.platform === 'darwin') {
    template.unshift({
        label: app.getName(),
        submenu: [
            { role: 'about' },
            { type: 'separator' },
            { role: 'services', submenu: [] },
            { type: 'separator' },
            { role: 'hide' },
            { role: 'hideothers' },
            { role: 'unhide' },
            { type: 'separator' },
            { role: 'quit' }
        ]
    })

    // Edit menu
    template[2].submenu.push(
        { type: 'separator' },
        {
            label: 'Speech',
            submenu: [
                { role: 'startspeaking' },
                { role: 'stopspeaking' }
            ]
        }
    )

    // Window menu
    template[4].submenu = [
        { role: 'close' },
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' }
    ]
}

class SysMenu extends Events.EventEmitter {
    constructor() {
        super();
        let menu = this.menu = Menu.buildFromTemplate(template)
        Menu.setApplicationMenu(menu);
    }
}



module.exports = function initialize() {
    if (!menu_) {
        menu_ = new SysMenu();
    }
    return menu_;
}

