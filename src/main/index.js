import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

import { autoUpdater } from "electron-updater"

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

// ----------------- AutoUpdater with Dialog Messages -----------------
function setupAutoUpdater(mainWindow) {
  autoUpdater.on('checking-for-update', () => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update',
      message: 'Checking for updates...'
    })
  })

  autoUpdater.on('update-available', (info) => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: `A new version (${info.version}) is available. Downloading now...`
    })
  })

  autoUpdater.on('update-not-available', () => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'No Update',
      message: 'You are running the latest version.'
    })
  })

  autoUpdater.on('error', (err) => {
    dialog.showErrorBox('Update Error', err == null ? "unknown" : (err.stack || err).toString())
  })

  autoUpdater.on('download-progress', (progress) => {
    // Optional: show a small dialog for progress (can be annoying)
    // Better: send progress to renderer via ipc for a nice progress bar
    mainWindow.setProgressBar(progress.percent / 100)
  })

  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Ready',
      message: 'Update downloaded. The app will now restart to install the update.',
      buttons: ['Restart Now']
    }).then(() => {
      autoUpdater.quitAndInstall()
    })
  })

  // Start checking for updates
  autoUpdater.checkForUpdatesAndNotify()
}

// ----------------- App Initialization -----------------
app.whenReady().then(() => {
  const mainWindow = createWindow()
  setupAutoUpdater(mainWindow)

  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.on('ping', () => console.log('pong'))

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed (except macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})