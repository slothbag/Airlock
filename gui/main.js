var app = require('app');  // Module to control application life.
var BrowserWindow = require('browser-window');  // Module to create native browser window.
var globalShortcut = require('global-shortcut');
var path = require('path');

// Quit when all windows are closed.
app.on('window-all-closed', function() {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform != 'darwin') {
    app.quit();
  }
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', function() {

  var icon = 'airlock_icon48x48.png';
  if (require('os').platform() == 'win32')
    icon = 'airlock_icon.ico';

  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200, 
    height: 768, 
    title: "AIRLOCK",
    icon: path.join(__dirname, 'images/' + icon)
  });
  mainWindow.setMenu(null);
  //

  var ret = globalShortcut.register('ctrl+r', function() {
    mainWindow.loadUrl('file://' + __dirname + '/index.html');
  });

  var ret = globalShortcut.register('ctrl+d', function() {
    mainWindow.toggleDevTools();
  });


  mainWindow.loadUrl('file://' + __dirname + '/index.html');

  // Emitted when the window is closed.
  mainWindow.on('closed', function() {
    mainWindow = null;
  });

  mainWindow.on('page-title-updated', function(e) {
    e.preventDefault();
  });

  mainWindow.webContents.on('will-navigate', function(evnt, url) {
      require('shell').openExternal(url);
      evnt.preventDefault();
  });

  var webContents = mainWindow.webContents
  webContents.on('will-navigate', function(event, url) {
    var clipboard = require('clipboard');
    clipboard.writeText(url);
  });
});
