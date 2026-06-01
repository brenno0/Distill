import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { writeFile } from 'fs/promises'
import { marked } from 'marked'
import { backendManager } from './backend'

function buildPdfHtml(title: string, date: string | undefined, htmlContent: string): string {
  const formattedDate = date
    ? new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: A4; margin: 0; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background-color: #09090b;
    color: #e4e4e7;
    font-size: 14px;
    line-height: 1.6;
  }
  .cover {
    padding: 56px 60px 44px;
    background: linear-gradient(160deg, #0d0d12 0%, #09090b 100%);
    border-bottom: 1px solid rgba(45,212,191,0.12);
    position: relative;
  }
  .cover::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: linear-gradient(90deg, #2dd4bf 0%, #06b6d4 60%, transparent 100%);
  }
  .cover-badge {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.15em;
    color: #2dd4bf;
    text-transform: uppercase;
    margin-bottom: 18px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .cover-badge::after {
    content: '';
    display: inline-block;
    width: 80px;
    height: 1px;
    background: rgba(45,212,191,0.25);
  }
  .cover-title {
    font-size: 26px;
    font-weight: 700;
    color: #fafafa;
    letter-spacing: -0.025em;
    line-height: 1.25;
    margin-bottom: 20px;
    max-width: 540px;
  }
  .cover-meta {
    font-size: 11.5px;
    color: #52525b;
    letter-spacing: 0.01em;
  }
  .content {
    padding: 44px 60px 64px;
  }
  h1 {
    font-size: 17px;
    font-weight: 700;
    color: #fafafa;
    letter-spacing: -0.015em;
    margin-top: 30px;
    margin-bottom: 10px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(255,255,255,0.07);
  }
  h1:first-child { margin-top: 0; }
  h2 {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: #2dd4bf;
    margin-top: 26px;
    margin-bottom: 0;
    padding-bottom: 4px;
  }
  h2:first-child { margin-top: 0; }
  h2::after {
    content: '';
    display: block;
    height: 1px;
    background: rgba(45,212,191,0.18);
    margin-top: 5px;
    margin-bottom: 10px;
  }
  h3 {
    font-size: 13.5px;
    font-weight: 600;
    color: #fafafa;
    margin-top: 20px;
    margin-bottom: 8px;
  }
  p {
    color: #a1a1aa;
    margin-bottom: 10px;
    line-height: 1.75;
  }
  ul { list-style: none; padding-left: 0; margin-bottom: 10px; }
  ol { padding-left: 20px; margin-bottom: 10px; }
  li {
    color: #a1a1aa;
    margin-bottom: 7px;
    padding-left: 16px;
    position: relative;
    line-height: 1.65;
  }
  ul > li::before {
    content: '▸';
    position: absolute;
    left: 0;
    color: rgba(45,212,191,0.65);
    font-size: 10px;
    top: 3px;
  }
  strong { font-weight: 600; color: #fafafa; }
  em { font-style: italic; color: #a1a1aa; }
  blockquote {
    border-left: 2px solid rgba(45,212,191,0.4);
    padding: 8px 14px;
    margin: 12px 0;
    color: #a1a1aa;
    font-style: italic;
    background: rgba(45,212,191,0.04);
    border-radius: 0 4px 4px 0;
  }
  pre {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 6px;
    padding: 12px 14px;
    margin: 12px 0;
    font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
    font-size: 12px;
    overflow-x: auto;
  }
  code {
    font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
    font-size: 12px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 3px;
    padding: 1px 5px;
    color: #e4e4e7;
  }
  pre code { background: none; border: none; padding: 0; }
  hr { border: none; border-top: 1px solid rgba(255,255,255,0.07); margin: 20px 0; }
  a { color: #2dd4bf; text-decoration: underline; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  th { text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #2dd4bf; padding: 8px 12px; border-bottom: 1px solid rgba(45,212,191,0.2); }
  td { padding: 8px 12px; color: #a1a1aa; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 13px; }
</style>
</head>
<body>
  <div class="cover">
    <div class="cover-badge">Summary</div>
    <div class="cover-title">${title.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
    <div class="cover-meta">Generated on ${formattedDate} &nbsp;·&nbsp; Distill</div>
  </div>
  <div class="content">${htmlContent}</div>
</body>
</html>`
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#1a1a1a',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  return win
}

app.whenReady().then(() => {
  const win = createWindow()
  backendManager.start(win.webContents)

  ipcMain.handle('export-summary-pdf', async (_event, { markdown, title, date }: { markdown: string; title: string; date?: string }) => {
    try {
      const htmlContent = String(marked.parse(markdown))
      const html = buildPdfHtml(title, date, htmlContent)

      const pdfWin = new BrowserWindow({ show: false, webPreferences: { sandbox: true } })
      await pdfWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)

      const pdfBuffer = await pdfWin.webContents.printToPDF({
        pageSize: 'A4',
        printBackground: true,
      })
      pdfWin.close()

      const safeName = title.replace(/[^a-z0-9\s-]/gi, '').trim().replace(/\s+/g, '_') || 'summary'
      const { filePath, canceled } = await dialog.showSaveDialog({
        title: 'Save Summary PDF',
        defaultPath: `${safeName}_summary.pdf`,
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
      })

      if (canceled || !filePath) return { success: false, canceled: true }

      await writeFile(filePath, pdfBuffer)
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  backendManager.stop()
  if (process.platform !== 'darwin') app.quit()
})
