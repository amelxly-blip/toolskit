/* =============================================
   ROLOX AUDIO UPLOADER - BACKEND PROXY
   ============================================= */

const express = require('express');
const cors = require('cors');
const multer = require('multer');
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

// ===== HELPER: Native fetch (Node 18+) or fallback =====
async function fetchUrl(url, options = {}) {
    // Node 18+ has native fetch
    if (typeof fetch === 'function') {
        return fetch(url, options);
    }
    // Fallback to node-fetch
    const nodeFetch = require('node-fetch');
    return nodeFetch(url, options);
}

// ===== HELPER: Forward requests to Roblox API =====
async function robloxFetch(url, options = {}) {
    const headers = {
        'x-api-key': options.apiKey || '',
        ...options.headers
    };

    // Only set Content-Type for JSON body
    if (options.body && typeof options.body === 'string') {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetchUrl(url, {
        method: options.method || 'GET',
        headers: headers,
        body: options.body
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

// --- Health check ---
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running', time: new Date().toISOString() });
});

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

    // Fallback to public API (no API key needed)
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

    console.log(`[UPLOAD] User: ${userId}, File: ${req.file.originalname}, Size: ${req.file.size}`);

    // Convert file to base64
    const fileBase64 = req.file.buffer.toString('base64');

    // Build request body for Roblox Open Cloud API v2
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

    console.log(`[UPLOAD] URL: ${uploadUrl}`);

    let result = await robloxFetch(uploadUrl, {
        method: 'POST',
        apiKey,
        body: JSON.stringify(body)
    });

    // If v2 fails, try v1 as fallback
    if (!result.ok) {
        console.log(`[UPLOAD] V2 failed (${result.status}), trying V1...`);
        console.log(`[UPLOAD] V2 error:`, JSON.stringify(result.data));

        const v1Body = {
            name: name || req.file.originalname,
            description: description || '',
            fileContent: fileBase64
        };

        const v1Url = groupId && groupId !== '0'
            ? `https://apis.roblox.com/cloud/v1/groups/${groupId}/assets`
            : `https://apis.roblox.com/cloud/v1/users/${userId}/assets`;

        result = await robloxFetch(v1Url, {
            method: 'POST',
            apiKey,
            body: JSON.stringify(v1Body)
        });
    }

    if (result.ok) {
        console.log(`[UPLOAD] Success!`);
        res.json(result.data);
    } else {
        console.error(`[UPLOAD] Error (${result.status}):`, JSON.stringify(result.data));
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
    console.log(`  │  Running on port ${PORT}              │`);
    console.log(`  └─────────────────────────────────────┘\n`);
});