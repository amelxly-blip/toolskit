/* =============================================
   ROLOX AUDIO UPLOADER - APPLICATION LOGIC
   ============================================= */

// ===== STORAGE KEYS =====
const STORAGE_KEYS = {
    USER_ID: 'rolox_user_id',
    API_KEY: 'rolox_api_key',
    USER_DATA: 'rolox_user_data',
    UPLOADS: 'rolox_uploads'
};

// ===== STATE =====
let state = {
    connected: false,
    userId: null,
    apiKey: null,
    userData: null,
    currentFile: null,
    uploads: []
};

// ===== DOM ELEMENTS =====
const $ = (id) => document.getElementById(id);

const elements = {
    // Sidebar
    sidebar: $('sidebar'),
    mobileToggle: $('mobileToggle'),
    
    // User section
    notConnected: $('notConnected'),
    userConnected: $('userConnected'),
    userAvatar: $('userAvatar'),
    userDisplayName: $('userDisplayName'),
    userUsername: $('userUsername'),
    userId: $('userId'),
    
    // Connection status
    connectionStatus: $('connectionStatus'),
    disconnectBtn: $('disconnectBtn'),
    
    // Navigation
    navItems: document.querySelectorAll('.nav-item'),
    pageTitle: $('pageTitle'),
    pageSubtitle: $('pageSubtitle'),
    
    // Pages
    pages: {
        upload: $('page-upload'),
        library: $('page-library'),
        settings: $('page-settings')
    },
    
    // Connect button
    connectBtn: $('connectBtn'),
    
    // Connect banner
    connectBanner: $('connectBanner'),
    uploadSection: $('uploadSection'),
    
    // Dropzone
    dropzone: $('dropzone'),
    fileInput: $('fileInput'),
    
    // Upload form
    uploadForm: $('uploadForm'),
    fileName: $('fileName'),
    fileSize: $('fileSize'),
    removeFile: $('removeFile'),
    audioName: $('audioName'),
    audioDescription: $('audioDescription'),
    groupId: $('groupId'),
    visibility: $('visibility'),
    
    // Upload progress
    uploadProgress: $('uploadProgress'),
    progressPercent: $('progressPercent'),
    progressFill: $('progressFill'),
    
    // Upload result
    uploadResult: $('uploadResult'),
    
    // Buttons
    cancelUpload: $('cancelUpload'),
    submitUpload: $('submitUpload'),
    
    // Recent uploads
    recentUploads: $('recentUploads'),
    uploadsList: $('uploadsList'),
    
    // Modal
    connectModal: $('connectModal'),
    modalClose: $('modalClose'),
    modalUserId: $('modalUserId'),
    modalApiKey: $('modalApiKey'),
    togglePassword: $('togglePassword'),
    eyeIcon: $('eyeIcon'),
    modalError: $('modalError'),
    modalErrorText: $('modalErrorText'),
    connectSubmit: $('connectSubmit'),
    
    // Settings
    settingsUserId: $('settingsUserId'),
    settingsApiKey: $('settingsApiKey'),
    saveSettings: $('saveSettings'),
    clearData: $('clearData'),
    
    // Toast
    toast: $('toast'),
    toastIcon: $('toastIcon'),
    toastMessage: $('toastMessage')
};

// ===== UTILITY FUNCTIONS =====
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showToast(message, type = 'success') {
    elements.toastMessage.textContent = message;
    elements.toast.className = 'toast show';
    
    const iconHTML = type === 'success' 
        ? `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l3 3 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
        : `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
    
    elements.toastIcon.className = `toast-icon ${type}`;
    elements.toastIcon.innerHTML = iconHTML;
    
    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, 3500);
}

function showLoadingOverlay(text = 'Loading...') {
    let overlay = document.querySelector('.loading-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `<div class="spinner"></div><p>${text}</p>`;
        document.body.appendChild(overlay);
    } else {
        overlay.querySelector('p').textContent = text;
    }
    overlay.style.display = 'flex';
}

function hideLoadingOverlay() {
    const overlay = document.querySelector('.loading-overlay');
    if (overlay) overlay.style.display = 'none';
}

// ===== STORAGE FUNCTIONS =====
function saveToStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (e) {
        console.error('Storage error:', e);
        return false;
    }
}

function getFromStorage(key) {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : null;
    } catch (e) {
        console.error('Storage error:', e);
        return null;
    }
}

function removeFromStorage(key) {
    localStorage.removeItem(key);
}

// ===== ROBLOX API FUNCTIONS =====

// Get user data from Roblox API
async function fetchRobloxUser(userId, apiKey) {
    const response = await fetch(`https://apis.roblox.com/cloud/v2/users/${userId}`, {
        method: 'GET',
        headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json'
        }
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText}`);
    }
    
    return response.json();
}

// Get user thumbnail/avatar from Roblox API
async function fetchRobloxAvatar(userId, apiKey) {
    // Try the thumbnails API
    const response = await fetch(`https://apis.roblox.com/cloud/v2/users/${userId}/thumbnails`, {
        method: 'GET',
        headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json'
        }
    });
    
    if (!response.ok) {
        // Fallback: use Roblox public avatar API (no key needed)
        const fallbackResponse = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=png&isCircular=true`);
        
        if (fallbackResponse.ok) {
            const data = await fallbackResponse.json();
            if (data.data && data.data.length > 0) {
                return data.data[0].imageUrl;
            }
        }
        return null;
    }
    
    const data = await response.json();
    
    // Try to extract image URL from response
    if (data.thumbnails && data.thumbnails.length > 0) {
        return data.thumbnails[0].imageUrl || data.thumbnails[0].imageUri;
    } else if (data.data && data.data.length > 0) {
        return data.data[0].imageUrl;
    }
    
    // Fallback to public API
    const fallbackResponse = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=png&isCircular=true`);
    if (fallbackResponse.ok) {
        const fbData = await fallbackResponse.json();
        if (fbData.data && fbData.data.length > 0) {
            return fbData.data[0].imageUrl;
        }
    }
    
    return null;
}

// Get user info from public API (fallback)
async function fetchRobloxUserPublic(userId) {
    const response = await fetch(`https://users.roblox.com/v1/users/${userId}`);
    
    if (!response.ok) {
        throw new Error(`User not found (ID: ${userId})`);
    }
    
    return response.json();
}

// Upload audio to Roblox
async function uploadAudioToRoblox(file, name, description, groupId, apiKey, userId) {
    // Step 1: Create the audio asset via Roblox Open Cloud API
    const uploadUrl = groupId 
        ? `https://apis.roblox.com/cloud/v2/groups/${groupId}/assets/audio`
        : `https://apis.roblox.com/cloud/v2/users/${userId}/assets/audio`;
    
    // Read file as base64
    const fileData = await readFileAsBase64(file);
    
    const body = {
        asset: {
            name: name,
            description: description || '',
            type: 'Audio'
        },
        fileContent: fileData
    };
    
    const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
    }
    
    return response.json();
}

// Read file as base64
function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            // Remove data URL prefix
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ===== CONNECT ACCOUNT =====
async function connectAccount(userId, apiKey) {
    if (!userId || !apiKey) {
        throw new Error('User ID and API Key are required');
    }
    
    // Validate User ID is numeric
    if (!/^\d+$/.test(userId)) {
        throw new Error('User ID must be a number');
    }
    
    showLoadingOverlay('Connecting to Roblox...');
    
    try {
        // Try Open Cloud API first
        let userData = null;
        let avatarUrl = null;
        
        try {
            userData = await fetchRobloxUser(userId, apiKey);
            avatarUrl = await fetchRobloxAvatar(userId, apiKey);
        } catch (apiError) {
            console.warn('Open Cloud API failed, trying public API:', apiError);
            // Fallback to public API
            userData = await fetchRobloxUserPublic(userId);
            
            // Get avatar from public thumbnail API
            try {
                const thumbResponse = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=png&isCircular=true`);
                if (thumbResponse.ok) {
                    const thumbData = await thumbResponse.json();
                    if (thumbData.data && thumbData.data.length > 0) {
                        avatarUrl = thumbData.data[0].imageUrl;
                    }
                }
            } catch (e) {
                console.warn('Avatar fetch failed:', e);
            }
        }
        
        if (!userData) {
            throw new Error('Failed to fetch user data');
        }
        
        // Save to state
        state.connected = true;
        state.userId = userId;
        state.apiKey = apiKey;
        state.userData = {
            displayName: userData.displayName || userData.name || `User ${userId}`,
            username: userData.name || userData.username || `user${userId}`,
            userId: userId,
            avatarUrl: avatarUrl
        };
        
        // Persist to localStorage
        saveToStorage(STORAGE_KEYS.USER_ID, userId);
        saveToStorage(STORAGE_KEYS.API_KEY, apiKey);
        saveToStorage(STORAGE_KEYS.USER_DATA, state.userData);
        
        // Update UI
        updateConnectedUI();
        
        hideLoadingOverlay();
        showToast('Account connected successfully!', 'success');
        
        return true;
    } catch (error) {
        hideLoadingOverlay();
        throw error;
    }
}

// ===== DISCONNECT ACCOUNT =====
function disconnectAccount() {
    state.connected = false;
    state.userId = null;
    state.apiKey = null;
    state.userData = null;
    
    removeFromStorage(STORAGE_KEYS.USER_ID);
    removeFromStorage(STORAGE_KEYS.API_KEY);
    removeFromStorage(STORAGE_KEYS.USER_DATA);
    
    updateDisconnectedUI();
    showToast('Account disconnected', 'success');
}

// ===== UI UPDATE FUNCTIONS =====
function updateConnectedUI() {
    const data = state.userData;
    
    // Show connected state
    elements.notConnected.style.display = 'none';
    elements.userConnected.style.display = 'flex';
    
    // Update user info
    if (data.avatarUrl) {
        elements.userAvatar.src = data.avatarUrl;
        elements.userAvatar.onerror = function() {
            // If avatar fails to load, hide it
            this.style.display = 'none';
        };
        elements.userAvatar.onload = function() {
            this.style.display = 'block';
        };
    }
    
    elements.userDisplayName.textContent = data.displayName;
    elements.userUsername.textContent = `@${data.username}`;
    elements.userId.textContent = `ID: ${data.userId}`;
    
    // Update connection status
    const statusDot = elements.connectionStatus.querySelector('.status-dot');
    const statusText = elements.connectionStatus.querySelector('.status-text');
    statusDot.className = 'status-dot status-online';
    statusText.textContent = 'Connected';
    
    // Show disconnect button
    elements.disconnectBtn.style.display = 'flex';
    
    // Update connect button
    elements.connectBtn.classList.add('connected');
    elements.connectBtn.querySelector('span').textContent = 'Account Connected';
    
    // Show upload section, hide banner
    elements.connectBanner.style.display = 'none';
    elements.uploadSection.style.display = 'block';
    
    // Load recent uploads
    loadRecentUploads();
}

function updateDisconnectedUI() {
    // Show not connected state
    elements.notConnected.style.display = 'block';
    elements.userConnected.style.display = 'none';
    
    // Update connection status
    const statusDot = elements.connectionStatus.querySelector('.status-dot');
    const statusText = elements.connectionStatus.querySelector('.status-text');
    statusDot.className = 'status-dot status-offline';
    statusText.textContent = 'Disconnected';
    
    // Hide disconnect button
    elements.disconnectBtn.style.display = 'none';
    
    // Update connect button
    elements.connectBtn.classList.remove('connected');
    elements.connectBtn.querySelector('span').textContent = 'Connect Account';
    
    // Show banner, hide upload section
    elements.connectBanner.style.display = 'flex';
    elements.uploadSection.style.display = 'none';
    elements.uploadForm.style.display = 'none';
    elements.uploadProgress.style.display = 'none';
    elements.uploadResult.style.display = 'none';
}

// ===== CHECK SAVED SESSION =====
function checkSavedSession() {
    const savedUserId = getFromStorage(STORAGE_KEYS.USER_ID);
    const savedApiKey = getFromStorage(STORAGE_KEYS.API_KEY);
    const savedUserData = getFromStorage(STORAGE_KEYS.USER_DATA);
    
    if (savedUserId && savedApiKey && savedUserData) {
        state.connected = true;
        state.userId = savedUserId;
        state.apiKey = savedApiKey;
        state.userData = savedUserData;
        
        updateConnectedUI();
        showToast(`Welcome back, ${savedUserData.displayName}!`, 'success');
    }
    
    // Load settings page values
    if (savedUserId) elements.settingsUserId.value = savedUserId;
    if (savedApiKey) elements.settingsApiKey.value = savedApiKey;
}

// ===== FILE HANDLING =====
function handleFileSelect(file) {
    if (!file) return;
    
    // Validate file type
    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/x-flac', 'audio/x-wav'];
    const validExtensions = ['.mp3', '.wav', '.ogg', '.flac'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
        showToast('Invalid file type. Please use MP3, WAV, OGG, or FLAC.', 'error');
        return;
    }
    
    // Validate file size (20MB max)
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
        showToast('File too large. Maximum size is 20MB.', 'error');
        return;
    }
    
    state.currentFile = file;
    
    // Update UI
    elements.fileName.textContent = file.name;
    elements.fileSize.textContent = formatFileSize(file.size);
    
    // Auto-fill name from filename (without extension)
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
    elements.audioName.value = nameWithoutExt;
    
    elements.uploadForm.style.display = 'block';
    elements.uploadProgress.style.display = 'none';
    elements.uploadResult.style.display = 'none';
    
    // Scroll to form
    elements.uploadForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function clearFileSelection() {
    state.currentFile = null;
    elements.fileInput.value = '';
    elements.uploadForm.style.display = 'none';
    elements.uploadProgress.style.display = 'none';
    elements.uploadResult.style.display = 'none';
    elements.audioName.value = '';
    elements.audioDescription.value = '';
    elements.groupId.value = '';
}

// ===== UPLOAD AUDIO =====
async function handleUpload() {
    if (!state.currentFile) {
        showToast('Please select a file first', 'error');
        return;
    }
    
    if (!state.connected || !state.apiKey || !state.userId) {
        showToast('Please connect your account first', 'error');
        return;
    }
    
    const name = elements.audioName.value.trim();
    if (!name) {
        showToast('Please enter a name for your audio', 'error');
        return;
    }
    
    const description = elements.audioDescription.value.trim();
    const groupId = elements.groupId.value.trim();
    const visibility = elements.visibility.value;
    
    // Disable submit button
    elements.submitUpload.disabled = true;
    elements.submitUpload.innerHTML = '<div class="spinner"></div> Uploading...';
    
    // Show progress
    elements.uploadProgress.style.display = 'block';
    elements.uploadResult.style.display = 'none';
    
    // Simulate progress while uploading
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 90) progress = 90;
        elements.progressPercent.textContent = Math.round(progress) + '%';
        elements.progressFill.style.width = progress + '%';
    }, 200);
    
    try {
        const result = await uploadAudioToRoblox(
            state.currentFile,
            name,
            description,
            groupId,
            state.apiKey,
            state.userId
        );
        
        // Complete progress
        clearInterval(progressInterval);
        elements.progressPercent.textContent = '100%';
        elements.progressFill.style.width = '100%';
        
        // Show success result
        const assetId = result.assetId || result.id || result.asset?.id || 'Unknown';
        const assetPath = result.path || result.asset?.path || '';
        
        elements.uploadResult.className = 'upload-result success';
        elements.uploadResult.innerHTML = `
            <div class="result-header">
                <div class="result-icon success">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M5 10l3 3 7-7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <h3>Upload Successful!</h3>
            </div>
            <div class="result-details">
                <p><strong>Audio Name:</strong> ${name}</p>
                <p><strong>Asset ID:</strong> <span class="result-id">${assetId}</span></p>
                ${assetPath ? `<p><strong>Path:</strong> <span class="result-id">${assetPath}</span></p>` : ''}
                <p><strong>Visibility:</strong> ${visibility}</p>
            </div>
        `;
        elements.uploadResult.style.display = 'block';
        
        // Save to recent uploads
        saveUploadRecord({
            name: name,
            assetId: assetId,
            fileName: state.currentFile.name,
            fileSize: formatFileSize(state.currentFile.size),
            date: new Date().toISOString(),
            status: 'completed'
        });
        
        showToast('Audio uploaded successfully!', 'success');
        
        // Reset after delay
        setTimeout(() => {
            clearFileSelection();
        }, 2000);
        
    } catch (error) {
        clearInterval(progressInterval);
        elements.uploadProgress.style.display = 'none';
        
        let errorMsg = error.message;
        if (errorMsg.includes('401') || errorMsg.includes('403')) {
            errorMsg = 'Invalid API key or insufficient permissions. Please check your API key.';
        } else if (errorMsg.includes('429')) {
            errorMsg = 'Rate limited. Please wait before uploading again.';
        } else if (errorMsg.includes('413')) {
            errorMsg = 'File too large for Roblox limits.';
        }
        
        elements.uploadResult.className = 'upload-result error';
        elements.uploadResult.innerHTML = `
            <div class="result-header">
                <div class="result-icon error">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
                    </svg>
                </div>
                <h3>Upload Failed</h3>
            </div>
            <div class="result-details">
                <p>${errorMsg}</p>
            </div>
        `;
        elements.uploadResult.style.display = 'block';
        
        showToast('Upload failed: ' + (errorMsg.substring(0, 50)) + '...', 'error');
        
    } finally {
        elements.submitUpload.disabled = false;
        elements.submitUpload.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 2v10m0-10L5 6m4-4l4 4M2 14v2h14v-2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Upload to Roblox
        `;
    }
}

// ===== RECENT UPLOADS =====
function saveUploadRecord(record) {
    state.uploads.unshift(record);
    // Keep only last 20 uploads
    if (state.uploads.length > 20) {
        state.uploads = state.uploads.slice(0, 20);
    }
    saveToStorage(STORAGE_KEYS.UPLOADS, state.uploads);
    loadRecentUploads();
}

function loadRecentUploads() {
    const saved = getFromStorage(STORAGE_KEYS.UPLOADS);
    if (saved && Array.isArray(saved)) {
        state.uploads = saved;
    }
    
    if (state.uploads.length === 0) {
        elements.recentUploads.style.display = 'none';
        return;
    }
    
    elements.recentUploads.style.display = 'block';
    elements.uploadsList.innerHTML = state.uploads.map(upload => `
        <div class="upload-item">
            <div class="upload-item-icon">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <rect x="3" y="3" width="14" height="14" rx="4" stroke="white" stroke-width="1.5" opacity="0.5"/>
                    <path d="M7 10h6" stroke="white" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>
                </svg>
            </div>
            <div class="upload-item-info">
                <p class="upload-item-name">${upload.name}</p>
                <p class="upload-item-meta">ID: ${upload.assetId} • ${upload.fileSize} • ${formatDate(upload.date)}</p>
            </div>
            <span class="upload-item-status ${upload.status}">${upload.status}</span>
        </div>
    `).join('');
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    if (diff < 604800000) return Math.floor(diff / 86400000) + 'd ago';
    
    return date.toLocaleDateString();
}

// ===== MODAL FUNCTIONS =====
function openConnectModal() {
    // Pre-fill if values exist
    if (state.userId) elements.modalUserId.value = state.userId;
    if (state.apiKey) elements.modalApiKey.value = state.apiKey;
    
    elements.connectModal.classList.add('active');
    elements.modalError.style.display = 'none';
    
    setTimeout(() => {
        elements.modalUserId.focus();
    }, 300);
}

function closeConnectModal() {
    elements.connectModal.classList.remove('active');
}

function showModalError(message) {
    elements.modalErrorText.textContent = message;
    elements.modalError.style.display = 'flex';
}

// ===== NAVIGATION =====
function navigateToPage(pageName) {
    // Update nav items
    elements.navItems.forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === pageName) {
            item.classList.add('active');
        }
    });
    
    // Update pages
    Object.keys(elements.pages).forEach(key => {
        elements.pages[key].style.display = 'none';
    });
    
    if (elements.pages[pageName]) {
        elements.pages[pageName].style.display = 'block';
    }
    
    // Update title
    const titles = {
        upload: { title: 'Upload Audio', subtitle: 'Upload your audio files to Roblox' },
        library: { title: 'My Library', subtitle: 'Manage your uploaded audio files' },
        settings: { title: 'Settings', subtitle: 'Manage your account and preferences' }
    };
    
    if (titles[pageName]) {
        elements.pageTitle.textContent = titles[pageName].title;
        elements.pageSubtitle.textContent = titles[pageName].subtitle;
    }
    
    // Close sidebar on mobile
    if (window.innerWidth <= 768) {
        elements.sidebar.classList.remove('open');
    }
}

// ===== EVENT LISTENERS =====
function initEventListeners() {
    // Connect button
    elements.connectBtn.addEventListener('click', () => {
        if (state.connected) {
            // Already connected - show settings or allow reconnect
            openConnectModal();
        } else {
            openConnectModal();
        }
    });
    
    // Modal close
    elements.modalClose.addEventListener('click', closeConnectModal);
    elements.connectModal.addEventListener('click', (e) => {
        if (e.target === elements.connectModal) closeConnectModal();
    });
    
    // Toggle password visibility
    elements.togglePassword.addEventListener('click', () => {
        const input = elements.modalApiKey;
        if (input.type === 'password') {
            input.type = 'text';
            elements.eyeIcon.innerHTML = `<path d="M2 2l16 16M6.7 6.7A8 8 0 002 10s3 6 8 6a7.5 7.5 0 003-0.6M9 4.2A8 8 0 0118 10s-0.5 1-1.4 2.2M9 9a2 2 0 002 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`;
        } else {
            input.type = 'password';
            elements.eyeIcon.innerHTML = `<path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z" stroke="currentColor" stroke-width="1.5"/><circle cx="10" cy="10" r="2.5" stroke="currentColor" stroke-width="1.5"/>`;
        }
    });
    
    // Connect submit
    elements.connectSubmit.addEventListener('click', async () => {
        const userId = elements.modalUserId.value.trim();
        const apiKey = elements.modalApiKey.value.trim();
        
        // Validate
        if (!userId) {
            showModalError('Please enter your Roblox User ID');
            return;
        }
        if (!apiKey) {
            showModalError('Please enter your API Key');
            return;
        }
        if (!/^\d+$/.test(userId)) {
            showModalError('User ID must be a number');
            return;
        }
        
        // Disable button
        elements.connectSubmit.disabled = true;
        elements.connectSubmit.innerHTML = '<div class="spinner"></div> Connecting...';
        elements.modalError.style.display = 'none';
        
        try {
            await connectAccount(userId, apiKey);
            closeConnectModal();
            
            // Update settings page
            elements.settingsUserId.value = userId;
            elements.settingsApiKey.value = apiKey;
        } catch (error) {
            showModalError(error.message || 'Failed to connect. Please check your credentials.');
        } finally {
            elements.connectSubmit.disabled = false;
            elements.connectSubmit.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M7 2L2 9l5 7M2 9h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Connect Account
            `;
        }
    });
    
    // Enter key on modal inputs
    [elements.modalUserId, elements.modalApiKey].forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                elements.connectSubmit.click();
            }
        });
    });
    
    // Disconnect button
    elements.disconnectBtn.addEventListener('click', disconnectAccount);
    
    // Navigation
    elements.navItems.forEach(item => {
        item.addEventListener('click', () => {
            navigateToPage(item.dataset.page);
        });
    });
    
    // Mobile toggle
    elements.mobileToggle.addEventListener('click', () => {
        elements.sidebar.classList.toggle('open');
    });
    
    // Dropzone click
    elements.dropzone.addEventListener('click', () => {
        elements.fileInput.click();
    });
    
    // File input change
    elements.fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });
    
    // Dropzone drag and drop
    elements.dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        elements.dropzone.classList.add('dragover');
    });
    
    elements.dropzone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        elements.dropzone.classList.remove('dragover');
    });
    
    elements.dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        elements.dropzone.classList.remove('dragover');
        
        if (e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    });
    
    // Remove file
    elements.removeFile.addEventListener('click', (e) => {
        e.stopPropagation();
        clearFileSelection();
    });
    
    // Cancel upload
    elements.cancelUpload.addEventListener('click', clearFileSelection);
    
    // Submit upload
    elements.submitUpload.addEventListener('click', handleUpload);
    
    // Settings save
    elements.saveSettings.addEventListener('click', async () => {
        const userId = elements.settingsUserId.value.trim();
        const apiKey = elements.settingsApiKey.value.trim();
        
        if (!userId || !apiKey) {
            showToast('Please fill in both User ID and API Key', 'error');
            return;
        }
        
        if (!/^\d+$/.test(userId)) {
            showToast('User ID must be a number', 'error');
            return;
        }
        
        try {
            await connectAccount(userId, apiKey);
            elements.settingsUserId.value = userId;
            elements.settingsApiKey.value = apiKey;
        } catch (error) {
            showToast('Failed to save: ' + error.message, 'error');
        }
    });
    
    // Clear data
    elements.clearData.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all data? This will disconnect your account and remove all saved uploads.')) {
            Object.values(STORAGE_KEYS).forEach(key => removeFromStorage(key));
            state = {
                connected: false,
                userId: null,
                apiKey: null,
                userData: null,
                currentFile: null,
                uploads: []
            };
            updateDisconnectedUI();
            elements.settingsUserId.value = '';
            elements.settingsApiKey.value = '';
            showToast('All data cleared', 'success');
        }
    });
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
            if (!elements.sidebar.contains(e.target) && !elements.mobileToggle.contains(e.target)) {
                elements.sidebar.classList.remove('open');
            }
        }
    });
    
    // Escape key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (elements.connectModal.classList.contains('active')) {
                closeConnectModal();
            }
        }
    });
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    checkSavedSession();
    
    // Set initial page
    navigateToPage('upload');
});