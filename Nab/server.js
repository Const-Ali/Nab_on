/**
 * سامانه ناب (Nab CRM) — بک‌اند اختصاصی Node.js / Express
 * قابلیت اجرا روی هاست‌های ابری Node.js (مثل Liara، Render، VPS و سرورهای لینوکس)
 */

import express from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000
const DATA_FILE = path.join(__dirname, 'nab_database.json')

app.use(cors())
app.use(express.json({ limit: '15mb' }))

// خواندن دیتابیس JSON
function loadDB() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8')
      return JSON.parse(raw)
    }
  } catch (err) {
    console.error('Error reading JSON DB:', err)
  }
  return {}
}

// ذخیره دیتابیس JSON
function saveDB(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
    return true
  } catch (err) {
    console.error('Error writing JSON DB:', err)
    return false
  }
}

// API Endpoints
app.get('/api/ping', (req, res) => {
  res.json({ success: true, status: 'online', time: new Date().toISOString() })
})

app.get('/api/get_all', (req, res) => {
  const db = loadDB()
  res.json({ success: true, data: db })
})

app.get('/api/get', (req, res) => {
  const key = req.query.key
  if (!key) return res.status(400).json({ success: false, error: 'Key is required' })
  const db = loadDB()
  res.json({ success: true, key, value: db[key] ?? null })
})

app.post('/api/save', (req, res) => {
  const { key, value } = req.body
  if (!key) return res.status(400).json({ success: false, error: 'Key is required' })
  const db = loadDB()
  db[key] = value
  saveDB(db)
  res.json({ success: true, message: `Saved ${key}` })
})

app.post('/api/batch_save', (req, res) => {
  const { items } = req.body
  if (!items || typeof items !== 'object') {
    return res.status(400).json({ success: false, error: 'Items object required' })
  }
  const db = loadDB()
  Object.assign(db, items)
  saveDB(db)
  res.json({ success: true, synced_count: Object.keys(items).length })
})

// سرویس‌دهی فایل‌های استاتیک فرانت‌اند بیلدشده
const distPath = path.join(__dirname, 'dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 سرور سامانه ناب در حال اجراست روی پورت http://localhost:${PORT}`)
})
