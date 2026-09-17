# 🎵 RoLox Audio Uploader

A sleek monochrome web app for uploading audio files to Roblox via the Open Cloud API.

## ✨ Features

- **Monochrome Design** — Clean black & white theme with animated background
- **Connect Roblox Account** — Enter User ID & API Key to connect
- **Audio Upload** — Drag & drop MP3, WAV, OGG, FLAC files (up to 20MB)
- **Upload Progress** — Real-time progress bar with shimmer animation
- **Recent Uploads** — Track your recent uploads in localStorage
- **Settings Page** — Manage credentials and clear data
- **Responsive** — Works on desktop, tablet, and mobile
- **Backend Proxy** — Node.js Express server to avoid CORS issues

## 🚀 Quick Start

### 1. Install dependencies
```bash
cd rolox-audio-uploader
npm install
```

### 2. Start the server
```bash
npm start
```

### 3. Open the app
Navigate to `http://localhost:3000`

## 📋 Prerequisites

### Get your Roblox API Key

1. Go to [Roblox Creator Dashboard](https://create.roblox.com/credentials)
2. Create an API Key or use an existing one
3. Ensure the API key has:
   - **User Audio** → **Write** permission (for uploading audio)
   - Optionally **Group Audio** if uploading to a group

### Get your Roblox User ID

1. Go to your Roblox profile
2. Copy the number in the URL (e.g., `roblox.com/users/1234567890/profile`)
3. That number is your User ID

## 📁 Project Structure

```
rolox-audio-uploader/
├── index.html      # Main HTML page
├── styles.css      # Monochrome theme styles
├── app.js          # Frontend application logic
├── server.js       # Backend proxy server (Express)
├── package.json    # Node.js dependencies
├── .gitignore
└── README.md
```

## 🔧 How It Works

1. **Frontend** (`app.js`) handles UI, drag & drop, and form submission
2. **Backend** (`server.js`) proxies requests to Roblox API to avoid CORS
3. **API Key** is stored in `localStorage` (client-side) and sent via headers to the backend
4. Backend forwards the request to `https://apis.roblox.com/cloud/v2/` with the API key

## 🛡️ Security Notes

- API Key is stored in browser `localStorage` — **do not use on shared computers**
- Backend server acts as a proxy only — it does not store your API key
- For production, use environment variables and proper authentication

## 🌐 Deploy

### Vercel / Render / Railway

This app includes a Node.js server, so deploy it as a Node app:

1. Push to GitHub
2. Connect to Vercel/Render/Railway
3. Set build command: `npm install`
4. Set start command: `npm start`

## 📝 License

MIT — Free to use and modify.