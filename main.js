const { app, BrowserWindow, dialog } = require('electron');
const { ipcMain } = require('electron');
const Menu = require('./src/Menu');
let win;
let menu;
let ipcRender;

ipcMain.on('page_init', (e) => {
    ipcRender = e.sender;
});




function createWindow() {
    win = new BrowserWindow({ backgroundColor: 0, width: 1024, height: 768 })
    win.loadFile('index.html');

    menu = Menu();
    win.on('OPEN', (type) => {
        let nType = type.substring(1);
        if (ipcRender) {
            const files = dialog.showOpenDialog(win, { filters: [{ name: `${nType.toUpperCase()} File`, extensions: [nType] }], properties: ['openFile'] });
            if (files) {
                ipcRender.send('OPEN', files[0]);
            }
        }
    });
    win.on('closed', () => {
        win = null
    })
}

// Electron 会在初始化后并准备
// 创建浏览器窗口时，调用这个函数。
// 部分 API 在 ready 事件触发后才能使用。
app.on('ready', createWindow)

// 当全部窗口关闭时退出。
app.on('window-all-closed', () => {
    // 在 macOS 上，除非用户用 Cmd + Q 确定地退出，
    // 否则绝大部分应用及其菜单栏会保持激活。
    //if (process.platform !== 'darwin') {
    app.quit()
    //}
})

app.on('activate', () => {
    // 在macOS上，当单击dock图标并且没有其他窗口打开时，
    // 通常在应用程序中重新创建一个窗口。
    if (win === null) {
        createWindow()
    }
})

  // 在这个文件中，你可以续写应用剩下主进程代码。
  // 也可以拆分成几个文件，然后用 require 导入。