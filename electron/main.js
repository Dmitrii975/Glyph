import { app, BrowserWindow, Menu, dialog, ipcMain } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEnv, modelConfig } from './env.js'
import { streamChat } from './openrouter.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const markdownFilter = [{ name: 'Markdown', extensions: ['md', 'markdown'] }]
const contextFilter = [{ name: 'Текст', extensions: ['md', 'markdown', 'txt'] }]
const textExtension = /\.(md|markdown|txt)$/i
const maxTextBytes = 2_000_000

let win
let allowClose = false
let closeGuard = false
let closePending = false
const streams = new Map()

function assertContent(content) {
  if (typeof content !== 'string') throw new Error('Ожидался текст файла')
}

function assertPath(filePath) {
  if (typeof filePath !== 'string' || !path.isAbsolute(filePath)) {
    throw new Error('Ожидался абсолютный путь')
  }
}

function withMarkdownExtension(filePath) {
  return /\.(md|markdown)$/i.test(filePath) ? filePath : `${filePath}.md`
}

function baseName(filePath) {
  return path.basename(filePath)
}

function send(channel) {
  if (!win || win.isDestroyed()) return
  win.webContents.send(channel)
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 880,
    minHeight: 560,
    title: 'New Vision',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: 'Файл',
      submenu: [
        { label: 'Создать', accelerator: 'CmdOrCtrl+N', click: () => send('menu:new') },
        { label: 'Открыть…', accelerator: 'CmdOrCtrl+O', click: () => send('menu:open') },
        { label: 'Сохранить', accelerator: 'CmdOrCtrl+S', click: () => send('menu:save') },
        { label: 'Сохранить как…', accelerator: 'CmdOrCtrl+Shift+S', click: () => send('menu:save-as') },
        { type: 'separator' },
        { label: 'Закрыть', accelerator: 'CmdOrCtrl+W', click: () => send('menu:close') },
      ],
    },
    {
      label: 'Правка',
      submenu: [
        { label: 'Отменить', accelerator: 'CmdOrCtrl+Z', click: () => send('menu:undo') },
        { label: 'Повторить', accelerator: 'CmdOrCtrl+Shift+Z', click: () => send('menu:redo') },
        { type: 'separator' },
        { role: 'cut', label: 'Вырезать' },
        { role: 'copy', label: 'Копировать' },
        { role: 'paste', label: 'Вставить' },
        { role: 'selectAll', label: 'Выделить всё' },
      ],
    },
  ]))

  win.on('close', (event) => {
    if (!closeGuard || allowClose) return
    event.preventDefault()
    if (closePending) return
    closePending = true
    win.webContents.send('app:close-requested')
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

ipcMain.on('app:ready', () => {
  closeGuard = true
})

ipcMain.on('app:close-decision', (_event, shouldClose) => {
  closePending = false
  if (!shouldClose) return
  allowClose = true
  win?.close()
})

ipcMain.handle('file:ask-save', async (_event, payload) => {
  const name = typeof payload?.name === 'string' && payload.name.trim() ? payload.name.trim() : 'документ'
  const result = await dialog.showMessageBox(win, {
    type: 'question',
    buttons: ['Сохранить', 'Не сохранять', 'Отмена'],
    defaultId: 0,
    cancelId: 2,
    message: `Сохранить изменения в «${name}»?`,
    detail: 'Несохранённые правки пропадут.',
  })
  return result.response
})

ipcMain.handle('file:open', async () => {
  const result = await dialog.showOpenDialog(win, {
    title: 'Открыть Markdown',
    filters: markdownFilter,
    properties: ['openFile'],
  })
  if (result.canceled || !result.filePaths[0]) return { canceled: true }
  const filePath = result.filePaths[0]
  const content = await fs.readFile(filePath, 'utf8')
  return { canceled: false, filePath, content }
})

ipcMain.handle('file:save', async (_event, payload) => {
  assertContent(payload?.content)
  assertPath(payload?.filePath)
  await fs.writeFile(payload.filePath, payload.content, 'utf8')
  return { canceled: false, filePath: payload.filePath }
})

ipcMain.handle('file:save-as', async (_event, payload) => {
  assertContent(payload?.content)
  const result = await dialog.showSaveDialog(win, {
    title: 'Сохранить Markdown',
    filters: markdownFilter,
  })
  if (result.canceled || !result.filePath) return { canceled: true }
  const filePath = withMarkdownExtension(result.filePath)
  await fs.writeFile(filePath, payload.content, 'utf8')
  return { canceled: false, filePath }
})

ipcMain.handle('file:open-context', async () => {
  const result = await dialog.showOpenDialog(win, {
    title: 'Добавить в контекст',
    filters: contextFilter,
    properties: ['openFile', 'multiSelections'],
  })
  if (result.canceled || !result.filePaths.length) return { canceled: true, files: [] }
  const files = []
  for (const filePath of result.filePaths) {
    const stat = await fs.stat(filePath)
    files.push({ filePath, name: baseName(filePath), bytes: stat.size })
  }
  return { canceled: false, files }
})

ipcMain.handle('file:read-text', async (_event, filePath) => {
  assertPath(filePath)
  if (!textExtension.test(filePath)) throw new Error('Можно читать только файлы md и txt')
  const stat = await fs.stat(filePath)
  if (stat.size > maxTextBytes) throw new Error('Файл больше 2 МБ')
  const content = await fs.readFile(filePath, 'utf8')
  return { content }
})

ipcMain.handle('ai:config', () => modelConfig())

ipcMain.handle('ai:start', (event, payload) => {
  const { model, hasKey } = modelConfig()
  if (!hasKey) return { error: 'Укажите OPENROUTER_API_KEY в файле .env' }
  if (!model) return { error: 'Укажите OPENROUTER_MODEL в файле .env' }
  if (!payload || !Array.isArray(payload.messages) || !Array.isArray(payload.tools)) {
    return { error: 'Некорректный запрос к модели' }
  }
  const requestId = crypto.randomUUID()
  const controller = new AbortController()
  streams.set(requestId, controller)
  const sendEvent = (data) => {
    if (event.sender.isDestroyed()) return
    event.sender.send('ai:event', { requestId, ...data })
  }
  streamChat({
    apiKey: process.env.OPENROUTER_API_KEY,
    model,
    messages: payload.messages,
    tools: payload.tools,
    signal: controller.signal,
    send: sendEvent,
  }).catch((error) => {
    if (controller.signal.aborted || error?.name === 'AbortError') return
    sendEvent({ type: 'error', message: error.message || 'Не удалось получить ответ' })
  }).finally(() => {
    streams.delete(requestId)
  })
  return { requestId }
})

ipcMain.on('ai:abort', (_event, requestId) => {
  const controller = streams.get(requestId)
  if (!controller) return
  controller.abort()
  streams.delete(requestId)
})

app.whenReady().then(() => {
  loadEnv()
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
