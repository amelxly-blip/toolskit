/* =============================================
   ROLOX AUDIO UPLOADER - BACKEND PROXY
   ============================================= */

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.static(__dirname));

// Multer config for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

// ===== HELPER: Forward requests to Roblox API =====
async function robloxFetch(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            'x-api-key': options.apiKey || '',
            'Content-Type': 'application/json',
            ...options.headers
        }
    });
    
    const text = await response.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch {
        data = text;
    }
    
    return { ok: response.ok, status: response.status, data };
}

// ===== API ROUTES =====

// --- Get User Info ---
app.get('/api/user/:userId', async (req, res) => {
    const { userId } = req.params;
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) return res.status(400).json({ error: 'API Key required' });
    
    // Try Open Cloud API first
    let result = await robloxFetch(
        `https://apis.roblox.com/cloud/v2/users/${userId}`,
        { apiKey }
    );
    
    if (result.ok) return res.json(result.data);
    
    // Fallback to public API
    result = await robloxFetch(`https://users.roblox.com/v1/users/${userId}`);
    
    if (result.ok) return res.json(result.data);
    
    res.status(result.status).json({ 
        error: 'Failed to fetch user', 
        details: result.data 
    });
});

// --- Get User Avatar ---
app.get('/api/avatar/:userId', async (req, res) => {
    const { userId } = req.params;
    
    const result = await robloxFetch(
        `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=png&isCircular=true`
    );
    
    if (result.ok && result.data?.data?.length > 0) {
        return res.json({ imageUrl: result.data.data[0].imageUrl });
    }
    
    res.status(404).json({ error: 'Avatar not found' });
});

// --- Upload Audio ---
app.post('/api/upload', upload.single('file'), async (req, res) => {
    const apiKey = req.headers['x-api-key'];
    const userId = req.headers['x-user-id'];
    const groupId = req.headers['x-group-id'];
    
    if (!apiKey) return res.status(400).json({ error: 'API Key required' });
    if (!userId) return res.status(400).json({ error: 'User ID required' });
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    
    const { name, description } = req.body;
    
    // Convert file to base64
    const fileBase64 = req.file.buffer.toString('base64');
    
    // Build request body for Roblox API
    const body = {
        asset: {
            name: name || req.file.originalname,
            description: description || '',
            type: 'Audio'
        },
        fileContent: fileBase64
    };
    
    // Build URL
    const uploadUrl = groupId && groupId !== '0'
        ? `https://apis.roblox.com/cloud/v2/groups/${groupId}/assets/audio`
        : `https://apis.roblox.com/cloud/v2/users/${userId}/assets/audio`;
    
    const result = await robloxFetch(uploadUrl, {
        method: 'POST',
        apiKey,
        body: JSON.stringify(body)
    });
    
    if (result.ok) {
        res.json(result.data);
    } else {
        res.status(result.status).json({ 
            error: 'Upload failed', 
            details: result.data 
        });
    }
});

// --- Serve index.html ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ===== START SERVER =====
app.listen(PORT, () => {
    console.log(`\n  ┌─────────────────────────────────────┐`);
    console.log(`  │  🎵 RoLox Audio Uploader Server    │`);
    console.log(`  │  Running on http://localhost:${PORT}   │`);
    console.log(`  └─────────────────────────────────────┘\n`);
});