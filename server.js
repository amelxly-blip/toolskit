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
    const assetName = name || req.file.originalname.replace(/\.[^/.]+$/, '');

    console.log(`[UPLOAD] User: ${userId}, File: ${req.file.originalname}, Size: ${req.file.size}`);

    // ===== ROBLOX OPEN CLOUD ASSETS API =====
    // Endpoint: POST https://apis.roblox.com/assets/v1/assets
    // Format: multipart/form-data
    //   - request: JSON string (metadata)
    //   - fileContent: binary file

    // Build creator object
    const creator = groupId && groupId !== '0'
        ? { groupId: groupId.toString() }
        : { userId: userId.toString() };

    const requestMetadata = JSON.stringify({
        assetType: 'Audio',
        displayName: assetName,
        description: description || '',
        creationContext: { creator }
    });

    // Build multipart/form-data manually using Blob/Buffer
    const boundary = `----FormBoundary${Date.now()}`;
    const CRLF = '\r\n';

    // Build form parts
    const metadataPart =
        `--${boundary}${CRLF}` +
        `Content-Disposition: form-data; name="request"${CRLF}` +
        `Content-Type: application/json${CRLF}${CRLF}` +
        requestMetadata + CRLF;

    const filePart =
        `--${boundary}${CRLF}` +
        `Content-Disposition: form-data; name="fileContent"; filename="${req.file.originalname}"${CRLF}` +
        `Content-Type: ${req.file.mimetype}${CRLF}${CRLF}`;

    const closing = `${CRLF}--${boundary}--${CRLF}`;

    const bodyBuffer = Buffer.concat([
        Buffer.from(metadataPart, 'utf8'),
        Buffer.from(filePart, 'utf8'),
        req.file.buffer,
        Buffer.from(closing, 'utf8')
    ]);

    console.log(`[UPLOAD] Sending to Roblox Assets API...`);
    console.log(`[UPLOAD] Metadata:`, requestMetadata);

    try {
        const response = await fetchUrl('https://apis.roblox.com/assets/v1/assets', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': bodyBuffer.length.toString()
            },
            body: bodyBuffer
        });

        const text = await response.text();
        let data;
        try { data = JSON.parse(text); } catch { data = { raw: text }; }

        console.log(`[UPLOAD] Response ${response.status}:`, JSON.stringify(data));

        if (response.ok) {
            console.log(`[UPLOAD] Success! Asset ID: ${data.assetId || data.id || 'pending'}`);
            res.json({
                success: true,
                assetId: data.assetId || data.id || null,
                operationId: data.operationId || null,
                name: assetName,
                ...data
            });
        } else {
            console.error(`[UPLOAD] Failed (${response.status}):`, JSON.stringify(data));
            res.status(response.status).json({
                error: 'Upload failed',
                status: response.status,
                details: data
            });
        }
    } catch (err) {
        console.error(`[UPLOAD] Network error:`, err.message);
        res.status(500).json({
            error: 'Network error',
            details: err.message
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