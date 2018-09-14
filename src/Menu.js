const { app, Menu } = require('electron');
const Events = require('events');

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
            { label: 'Open New .obj file', accelerator: 'CommandOrControl+Option+O', click: (item, window, event) => { window.emit('OPEN', '.obj') } }
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
            { role: 'resetzoom' },
            { role: 'zoomin' },
            { role: 'zoomout' },
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

