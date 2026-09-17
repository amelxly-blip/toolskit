# 🎵 RoLox Audio Uploader

A modern, monochrome (black & white) web application for uploading audio files to Roblox using the Roblox Open Cloud API.

![Version](https://img.shields.io/badge/version-1.0.0-white)
![License](https://img.shields.io/badge/license-MIT-white)

## ✨ Features

- **🔐 Account Connection** — Connect using Roblox User ID & API Key
- **👤 User Profile Display** — Shows avatar, display name, username & ID after connecting
- **💾 Persistent Session** — Data saved in localStorage, survives page refresh/close
- **📤 Drag & Drop Upload** — Upload MP3, WAV, OGG, FLAC files (up to 20MB)
- **📊 Upload Progress** — Real-time progress bar with shimmer animation
- **📜 Upload History** — Recent uploads saved locally
- **⚙️ Settings Page** — Manage credentials & clear data
- **📱 Responsive Design** — Works on desktop, tablet, and mobile
- **🎨 Monochrome UI** — Pure black & white modern design with animated background

## 🚀 Quick Start

### 1. Open the Web App
Simply open `index.html` in your browser, or serve it with a local server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js (npx)
npx serve

# Using PHP
php -S localhost:8000
```

Then visit `http://localhost:8000` in your browser.

### 2. Get Your Roblox API Key

1. Go to [Roblox Creator Dashboard](https://create.roblox.com/)
2. Navigate to **Creator Dashboard → API Keys**
3. Create a new API key
4. Enable the **Asset & Audio** permissions
5. Copy your API key

### 3. Find Your Roblox User ID

1. Go to your Roblox profile
2. Look at the URL: `https://www.roblox.com/users/YOUR_USER_ID/profile`
3. The number is your User ID

### 4. Connect & Upload

1. Click **"Connect Account"**
2. Enter your User ID and API Key
3. Click **"Connect Account"**
4. Your avatar, display name, and username will appear
5. Drag & drop or browse for an audio file
6. Fill in the details and click **"Upload to Roblox"**

## 🛠️ Tech Stack

| Technology | Purpose |
|-----------|---------|
| HTML5 | Structure & semantics |
| CSS3 | Styling, animations, responsive design |
| JavaScript (ES6+) | App logic, API calls, localStorage |
| Roblox Open Cloud API | User data & audio upload |
| LocalStorage | Session persistence |

## 📁 Project Structure

```
rolox-audio-uploader/
├── index.html      # Main HTML structure
├── styles.css      # Monochrome theme styling
├── app.js          # Application logic & API integration
└── README.md       # This file
```

## 🎨 Design Features

### Monochrome Theme
- Pure black background (`#0a0a0a`)
- White text & accents
- Gray scale for secondary elements
- No color, just shades of black & white

### Animated Background
- Floating gradient orbs
- Subtle grid overlay
- Noise texture for depth

### UI Components
- Glassmorphism sidebar
- Animated avatar status indicator
- Drag & drop dropzone with hover effects
- Progress bar with shimmer animation
- Toast notifications
- Modal with step-by-step connect guide

## 🔒 Security Notes

- API keys are stored in **localStorage** (browser only)
- Keys are **never sent to any server** other than Roblox
- All API calls go directly to `apis.roblox.com`
- No backend or intermediary server

> ⚠️ **Warning**: localStorage is not secure storage. For production use, consider implementing a backend proxy with proper key management.

## 📋 Roblox API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `apis.roblox.com/cloud/v2/users/{userId}` | GET | Fetch user data |
| `apis.roblox.com/cloud/v2/users/{userId}/thumbnails` | GET | Get avatar thumbnail |
| `apis.roblox.com/cloud/v2/users/{userId}/assets/audio` | POST | Upload audio |
| `apis.roblox.com/cloud/v2/groups/{groupId}/assets/audio` | POST | Upload to group |
| `users.roblox.com/v1/users/{userId}` | GET | Fallback user data |
| `thumbnails.roblox.com/v1/users/avatar-headshot` | GET | Fallback avatar |

## ❓ FAQ

### Q: Will my session persist after closing the browser?
**A:** Yes! User ID, API Key, and user data are saved in localStorage. When you return, you'll be automatically reconnected.

### Q: What audio formats are supported?
**A:** MP3, WAV, OGG, and FLAC. Maximum file size is 20MB.

### Q: My avatar doesn't show up. Why?
**A:** The app tries multiple Roblox API endpoints for the avatar. If all fail, it may be due to:
- Roblox API rate limiting
- User privacy settings
- CORS restrictions in your browser

### Q: The upload fails with 401/403. What do I do?
**A:** This means your API key is invalid or doesn't have audio upload permissions. Make sure to:
1. Enable "Asset & Audio" permissions on your API key
2. Generate a new key if needed

## 📝 License

This project is open source and available under the MIT License.

## 🤝 Credits

Built with ❤️ using vanilla HTML, CSS, and JavaScript.

---

**Disclaimer**: This is an unofficial tool and is not affiliated with or endorsed by Roblox Corporation. "Roblox" is a trademark of Roblox Corporation.