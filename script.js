/* 
Copyright (c) 2025 Siddhant Digraje. All rights reserved.
This file is part of Claverpage.

Permission is granted to view and use this page for personal, non-commercial purposes only through the official GitHub Pages link.  
Unauthorized downloading, modifying, redistributing, or reverse engineering of this file in any form is strictly prohibited without explicit written permission from the copyright holder.  
For permissions, contact: siddhantdigraje77@gmail.com 
*/

const firebaseConfig = {
    apiKey: "AIzaSyCmUPSQHLABZ2fI1LcUSEdB-6E9YssCABg",
    authDomain: "claverpages.firebaseapp.com",
    projectId: "claverpages",
    storageBucket: "claverpages.firebasestorage.app",
    messagingSenderId: "148787266143",
    appId: "1:148787266143:web:62724e5086e0db5ff411ea",
    measurementId: "G-XW58K4MRG5"
  };

  const app = firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();

/* --- Initialization --- */
        const DEFAULT_NAME = "Claver";
        
        /* --- IndexedDB Image Caching --- */
        const DB_NAME = 'ClaverpageDB';
        const DB_VERSION = 1;
        const STORE_NAME = 'backgrounds';

        function initDB() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(DB_NAME, DB_VERSION);
                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve(request.result);
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains(STORE_NAME)) {
                        db.createObjectStore(STORE_NAME);
                    }
                };
            });
        }

        async function cacheImage(url) {
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error('Network response was not ok');
                const blob = await response.blob();
                const db = await initDB();
                return new Promise((resolve, reject) => {
                    const transaction = db.transaction(STORE_NAME, 'readwrite');
                    const store = transaction.objectStore(STORE_NAME);
                    const request = store.put(blob, 'cached_bg');
                    request.onsuccess = () => resolve(true);
                    request.onerror = () => reject(request.error);
                });
            } catch (e) {
                console.error('Failed to cache image:', e);
                return false;
            }
        }

        async function getCachedImage() {
            try {
                const db = await initDB();
                return new Promise((resolve, reject) => {
                    const transaction = db.transaction(STORE_NAME, 'readonly');
                    const store = transaction.objectStore(STORE_NAME);
                    const request = store.get('cached_bg');
                    request.onsuccess = () => {
                        if (request.result) {
                            resolve(URL.createObjectURL(request.result));
                        } else {
                            resolve(null);
                        }
                    };
                    request.onerror = () => reject(request.error);
                });
            } catch (e) {
                console.error('Failed to get cached image:', e);
                return null;
            }
        }
        
        async function clearCachedImage() {
            try {
                const db = await initDB();
                return new Promise((resolve, reject) => {
                    const transaction = db.transaction(STORE_NAME, 'readwrite');
                    const store = transaction.objectStore(STORE_NAME);
                    const request = store.delete('cached_bg');
                    request.onsuccess = () => resolve(true);
                    request.onerror = () => reject(request.error);
                });
            } catch (e) {
                console.error('Failed to clear cached image:', e);
                return false;
            }
        }

        /* --- Centralized State Management --- */
        class ClaverState {
            constructor() {
                this.state = {
                    username: localStorage.getItem('claver_username') || DEFAULT_NAME,
                    theme: localStorage.getItem('claver_theme') || 'dark',
                    liteMode: localStorage.getItem('claver_litemode') === 'true',
                    searchEngine: localStorage.getItem('claver_engine') || 'Google',
                    shortcuts: JSON.parse(localStorage.getItem('claver_shortcuts_v2')) || null,
                    background: JSON.parse(localStorage.getItem('claver_bg_recipe')) || null,
                    adaptiveBg: localStorage.getItem('claver_adaptive_bg') === 'true'
                };
                this.listeners = {};
            }

            get(key) {
                return this.state[key];
            }

            set(key, value) {
                this.state[key] = value;
                this._persist(key, value);
                this._notify(key, value);
            }

            _persist(key, value) {
                switch(key) {
                    case 'username': localStorage.setItem('claver_username', value); break;
                    case 'theme': localStorage.setItem('claver_theme', value); break;
                    case 'liteMode': localStorage.setItem('claver_litemode', value); break;
                    case 'searchEngine': localStorage.setItem('claver_engine', value); break;
                    case 'shortcuts': 
                        if(value) localStorage.setItem('claver_shortcuts_v2', JSON.stringify(value)); 
                        else localStorage.removeItem('claver_shortcuts_v2');
                        break;
                    case 'background': 
                        if (value) localStorage.setItem('claver_bg_recipe', JSON.stringify(value));
                        else localStorage.removeItem('claver_bg_recipe');
                        break;
                    case 'adaptiveBg':
                        localStorage.setItem('claver_adaptive_bg', value);
                        break;
                }
            }

            subscribe(key, callback) {
                if (!this.listeners[key]) this.listeners[key] = [];
                this.listeners[key].push(callback);
            }

            _notify(key, value) {
                if (this.listeners[key]) {
                    this.listeners[key].forEach(cb => cb(value));
                }
            }
        }

        const appState = new ClaverState();

        // Setup Subscriptions
        appState.subscribe('username', (newName) => {
            document.getElementById('helloText').textContent = getGreeting(newName);
            document.getElementById('settings-name-input').value = newName;
        });

        appState.subscribe('theme', (newTheme) => {
            if (newTheme === 'light') {
                document.body.setAttribute('data-theme', 'light');
                document.getElementById('theme-toggle').checked = false; 
            } else {
                document.body.removeAttribute('data-theme');
                document.getElementById('theme-toggle').checked = true; 
            }
        });

        appState.subscribe('liteMode', (isLite) => {
            document.getElementById('lite-mode-toggle').checked = isLite;
            if (isLite) document.body.classList.add('lite-mode');
            else document.body.classList.remove('lite-mode');
        });

        appState.subscribe('searchEngine', (engine) => {
            const buttons = document.querySelectorAll('.engine-btn');
            buttons.forEach(btn => {
                const btnText = btn.textContent.trim();
                if (btnText === engine) btn.classList.add('active'); else btn.classList.remove('active');
            });
            const title = document.getElementById("googleTitle");
            if (title.textContent !== engine) {
                title.textContent = engine;
            }
        });

        appState.subscribe('background', (recipe) => {
            if(!appState.get('adaptiveBg')) {
                applyBackgroundFromState(recipe);
            }
        });

        appState.subscribe('adaptiveBg', (isAdaptive) => {
            const btn = document.getElementById('adaptive-btn');
            if(btn) {
                if(isAdaptive) {
                    btn.className = 'save-name-btn';
                    btn.style.position = 'static';
                    btn.style.flex = '1';
                    btn.style.margin = '0';
                    btn.style.padding = '10px 0';
                    btn.style.display = 'flex';
                    btn.style.justifyContent = 'center';
                    btn.textContent = 'Dynamic: ON';
                } else {
                    btn.className = 'edit-btn cancel-btn';
                    btn.style.flex = '1';
                    btn.style.margin = '0';
                    btn.style.padding = '10px 0';
                    btn.style.display = 'flex';
                    btn.style.justifyContent = 'center';
                    btn.textContent = 'Dynamic: OFF';
                }
            }
            if (isAdaptive) {
                const weatherData = JSON.parse(localStorage.getItem('claver_weather_cache'));
                if (weatherData) applyAdaptiveBackground(weatherData);
            } else {
                if (window.adaptiveBgInterval) {
                    clearInterval(window.adaptiveBgInterval);
                    window.adaptiveBgInterval = null;
                }
                // Revert to normal custom background
                applyBackgroundFromState(appState.get('background'));
            }
        });

        appState.subscribe('shortcuts', (data) => {
            if (data) renderAllCategories(data);
        });
        
        document.addEventListener('DOMContentLoaded', () => {
            // Fade in container
            setTimeout(() => { document.getElementById('container').style.opacity = '1'; }, 50);
            
            loadSettings();
            applyBackground(); // Load the saved background
            setupSearchEvents();
            loadShortcuts();
            setupModalEventListeners();
            setupSearchContainerClickHandler();
            setupKeyboardShortcuts();
            initWeather(); 
            initBgDragLogic();
            
            document.querySelector('.about-link').addEventListener('click', toggleAboutModal);
            
            document.addEventListener('contextmenu', e => e.preventDefault());
            document.addEventListener('dragstart', e => e.preventDefault());
        });

        /* --- Elastic Scroll Logic --- */
        function initElasticScroll(container) {
            const wrapper = container.querySelector('.elastic-wrapper');
            if (!wrapper) return;

            let isTouching = false;
            let startX = 0;
            let currentTranslate = 0;
            let lastScrollLeft = 0;
            let pullStartX = 0; // The X coordinate where pull began
            let pullActive = false;

            const applyTranslate = (x) => {
                wrapper.style.transition = 'none';
                wrapper.style.transform = `translate3d(${x}px, 0, 0)`;
            };

            const resetTranslate = () => {
                wrapper.style.transition = 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)';
                wrapper.style.transform = 'translate3d(0, 0, 0)';
                currentTranslate = 0;
                pullActive = false;
            };

            const getElasticX = (pull) => {
                const sign = Math.sign(pull);
                const absPull = Math.abs(pull);
                // Heavy resistance formula
                return sign * Math.pow(absPull, 0.7) * 1.5;
            };

            // Touch Events
            container.addEventListener('touchstart', (e) => {
                isTouching = true;
                startX = e.touches[0].pageX;
                lastScrollLeft = container.scrollLeft;
                pullActive = false;
            }, { passive: true });

            container.addEventListener('touchmove', (e) => {
                if (!isTouching) return;
                
                const x = e.touches[0].pageX;
                const walkTotal = x - startX;
                const maxScroll = container.scrollWidth - container.clientWidth;
                
                // Boundaries with 1px tolerance for sub-pixel mobile screens
                const isAtStart = container.scrollLeft <= 1;
                const isAtEnd = container.scrollLeft >= maxScroll - 1;

                if (isAtStart && walkTotal > 0) {
                    // Pulling Right at the beginning
                    if (!pullActive) { pullActive = true; pullStartX = x; }
                    currentTranslate = getElasticX(x - pullStartX);
                    applyTranslate(currentTranslate);
                } else if (isAtEnd && walkTotal < 0) {
                    // Pulling Left at the end
                    if (!pullActive) { pullActive = true; pullStartX = x; }
                    currentTranslate = getElasticX(x - pullStartX);
                    applyTranslate(currentTranslate);
                } else {
                    // Normal scroll territory
                    if (currentTranslate !== 0) {
                        resetTranslate();
                    }
                    pullActive = false;
                }
            }, { passive: true });

            container.addEventListener('touchend', () => {
                isTouching = false;
                if (currentTranslate !== 0) resetTranslate();
            });

            // Wheel Events (Desktop Trackpads)
            container.addEventListener('wheel', (e) => {
                if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) return;

                const maxScroll = container.scrollWidth - container.clientWidth;
                const isAtStart = container.scrollLeft <= 0;
                const isAtEnd = container.scrollLeft >= maxScroll - 1;

                if (isAtStart && e.deltaX < 0) {
                    e.preventDefault();
                    currentTranslate -= e.deltaX * 0.4;
                    applyTranslate(getElasticX(currentTranslate));
                    clearTimeout(container.wheelTimeout);
                    container.wheelTimeout = setTimeout(resetTranslate, 100);
                } else if (isAtEnd && e.deltaX > 0) {
                    e.preventDefault();
                    currentTranslate -= e.deltaX * 0.4;
                    applyTranslate(getElasticX(currentTranslate));
                    clearTimeout(container.wheelTimeout);
                    container.wheelTimeout = setTimeout(resetTranslate, 100);
                }
            }, { passive: false });
        }

        /* --- Settings & State --- */
        function getGreeting(name) {
            const hour = new Date().getHours();
            if (hour < 12) return `Good morning, ${name}`;
            if (hour < 17) return `Good afternoon, ${name}`;
            return `Good evening, ${name}`;
        }

        function loadSettings() {
            // Trigger initial UI setup based on state
            appState._notify('username', appState.get('username'));
            appState._notify('theme', appState.get('theme'));
            appState._notify('liteMode', appState.get('liteMode'));
            appState._notify('searchEngine', appState.get('searchEngine'));
            appState._notify('adaptiveBg', appState.get('adaptiveBg'));
            
            // Display User ID
            const uid = getUserId();
            document.getElementById('sync-id-display').value = uid;
            document.getElementById('sync-id-input').value = uid;
        }

        function saveNameSettings() {
            const input = document.getElementById('settings-name-input');
            const newName = input.value.trim() || DEFAULT_NAME;
            appState.set('username', newName);
            showToast('Name updated');
        }

        function copyUserId() {
            const uid = getUserId();
            if (!uid) return;
            
            navigator.clipboard.writeText(uid).then(() => {
                showToast('ID Copied to Clipboard');
            }).catch(err => {
                showToast('Failed to copy', true);
            });
        }

        function showSyncEditView() {
            document.getElementById('sync-readonly-view').style.display = 'none';
            document.getElementById('sync-edit-view').style.display = 'flex';
        }

        function hideSyncEditView() {
            const editView = document.getElementById('sync-edit-view');
            const readOnlyView = document.getElementById('sync-readonly-view');
            if(editView && readOnlyView) {
                editView.style.display = 'none';
                readOnlyView.style.display = 'flex';
                document.getElementById('sync-id-input').value = getUserId();
            }
        }

        function syncWithNewId() {
            const input = document.getElementById('sync-id-input');
            const newId = input.value.trim();
            
            if (!newId) {
                showToast('Enter a valid ID', true);
                return;
            }
            
            const oldId = localStorage.getItem(STORAGE_KEY_USERID);
            if (newId === oldId) {
                showToast('Already using this ID');
                return;
            }
            
            // 1. Update ID in LocalStorage
            localStorage.setItem(STORAGE_KEY_USERID, newId);
            
            // 2. Clear Shortcuts cache to force Firebase re-fetch
            appState.set('shortcuts', null);
            
            // 3. Trigger reload
            showToast('Syncing with new ID...');
            loadShortcuts();
            
            // 4. Close settings
            setTimeout(() => {
                closeModal('settings-modal');
            }, 500);
        }

        function toggleTheme(checkbox) {
            if (checkbox.checked) {
                appState.set('theme', 'dark');
                showToast('Dark Theme Enabled');
            } else {
                appState.set('theme', 'light');
                showToast('Light Theme Enabled');
            }
            const weatherData = localStorage.getItem(WEATHER_CACHE_KEY);
            if(weatherData) {
                const data = JSON.parse(weatherData);
                renderWeather(data);
            }
        }

        function toggleLiteMode(checkbox) {
            if (checkbox.checked) {
                appState.set('liteMode', true);
                showToast('Lite Mode On');
            } else {
                appState.set('liteMode', false);
                showToast('Lite Mode Off');
            }
        }

        function toggleAdaptiveBgButton() {
            const currentState = appState.get('adaptiveBg');
            appState.set('adaptiveBg', !currentState);
            showToast(!currentState ? 'Dynamic Environment On' : 'Dynamic Environment Off');
        }

        function showToast(message, isError = false) {
            let toast = document.querySelector('.toast');
            if (!toast) {
                toast = document.createElement('div');
                toast.className = 'toast';
                document.body.appendChild(toast);
            }
            toast.className = isError ? 'toast error' : 'toast';
            toast.textContent = message;
            requestAnimationFrame(() => { requestAnimationFrame(() => { toast.classList.add('show'); }); });
            setTimeout(() => toast.classList.remove('show'), 3000);
        }
        
        /* --- Background Editor Logic (Revamped) --- */
        const BG_STORAGE_KEY = 'claver_bg_recipe';
        
        // State for Background Editor
        let bgEditorState = {
            x: 50,
            y: 50,
            isDragging: false,
            startX: 0,
            startY: 0,
            initialX: 50,
            initialY: 50
        };

        function initBgDragLogic() {
            const container = document.getElementById('bg-editor-preview-container');
            
            const startDrag = (clientX, clientY) => {
                bgEditorState.isDragging = true;
                bgEditorState.startX = clientX;
                bgEditorState.startY = clientY;
                bgEditorState.initialX = bgEditorState.x;
                bgEditorState.initialY = bgEditorState.y;
                container.style.cursor = 'grabbing';
            };

            const onMove = (clientX, clientY) => {
                if (!bgEditorState.isDragging) return;
                
                const deltaX = clientX - bgEditorState.startX;
                const deltaY = clientY - bgEditorState.startY;
                
                const rect = container.getBoundingClientRect();
                const sensitivity = 1.5; 
                
                // If I drag right (deltaX > 0), visual moves right, object-position x decreases (moves viewport left)
                const percentChangeX = (deltaX / rect.width) * 100 * sensitivity;
                const percentChangeY = (deltaY / rect.height) * 100 * sensitivity;
                
                let newX = bgEditorState.initialX - percentChangeX;
                let newY = bgEditorState.initialY - percentChangeY;
                
                newX = Math.max(0, Math.min(100, newX));
                newY = Math.max(0, Math.min(100, newY));
                
                bgEditorState.x = newX;
                bgEditorState.y = newY;
                
                updateBgPreview(true); 
            };

            const endDrag = () => {
                if (bgEditorState.isDragging) {
                    bgEditorState.isDragging = false;
                    container.style.cursor = 'grab';
                }
            };

            // Mouse
            container.addEventListener('mousedown', e => { e.preventDefault(); startDrag(e.clientX, e.clientY); });
            window.addEventListener('mousemove', e => onMove(e.clientX, e.clientY));
            window.addEventListener('mouseup', endDrag);

            // Touch
            container.addEventListener('touchstart', e => { e.preventDefault(); startDrag(e.touches[0].clientX, e.touches[0].clientY); }, {passive: false});
            window.addEventListener('touchmove', e => { if(bgEditorState.isDragging) onMove(e.touches[0].clientX, e.touches[0].clientY); }, {passive: false});
            window.addEventListener('touchend', endDrag);
        }
        
        function openBgEditor() {
            const container = document.getElementById('bg-editor-preview-container');
            const savedBg = appState.get('background');
            
            // --- Dynamic Resizing Logic ---
            const viewportW = window.innerWidth;
            const viewportH = window.innerHeight;
            const screenRatio = viewportW / viewportH;
            
            // Calculate available bounds within the modal
            // Modal Max Width: 600px. Padding: 24px * 2 = 48px.
            // Screen Margin safety: ~40px.
            let maxW = Math.min(600, viewportW - 40) - 48; 
            if (maxW < 0) maxW = 280; // Safety fallback
            
            // Modal Max Height: ~85vh. 
            // Reserved for Header(60) + Inputs(60) + Controls(100) + Footer(60) = ~280px.
            let maxH = (viewportH * 0.85) - 300;
            if (maxH < 200) maxH = 200; // Safety fallback

            // 1. Try fitting to Width
            let finalW = maxW;
            let finalH = finalW / screenRatio;

            // 2. If Height overflows, fit to Height
            if (finalH > maxH) {
                finalH = maxH;
                finalW = finalH * screenRatio;
            }

            // Apply Dimensions
            container.style.width = `${Math.round(finalW)}px`;
            container.style.height = `${Math.round(finalH)}px`;
            
            // Hide the old ratio frame if it exists
            const frame = document.getElementById('bg-ratio-frame');
            if (frame) frame.style.display = 'none';

            // --- Load State ---
            if (savedBg) {
                const recipe = savedBg;
                document.getElementById('bg-url-input').value = recipe.url;
                
                bgEditorState.x = recipe.x !== undefined ? parseFloat(recipe.x) : 50;
                bgEditorState.y = recipe.y !== undefined ? parseFloat(recipe.y) : 50;
                
                document.getElementById('range-blur').value = recipe.blur || 0;
                document.getElementById('range-zoom').value = recipe.zoom || 110;
                const dimPercent = Math.round((1 - (recipe.dim !== undefined ? recipe.dim : 1)) * 100);
                document.getElementById('range-dim').value = dimPercent;
                
                const img = document.getElementById('bg-editor-preview-img');
                img.src = recipe.url;
                img.style.opacity = '1';
                document.getElementById('bg-editor-placeholder').style.display = 'none';
                updateBgPreview();
            } else {
                document.getElementById('bg-editor-placeholder').style.display = 'block';
                document.getElementById('range-dim').value = 0;
                document.getElementById('range-zoom').value = 110;
                bgEditorState.x = 50;
                bgEditorState.y = 50;
                // Ensure image opacity is 0 if no bg
                document.getElementById('bg-editor-preview-img').style.opacity = '0';
            }

            document.getElementById('bg-editor-modal').classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function loadEditorImage() {
            const urlInput = document.getElementById('bg-url-input');
            let url = urlInput.value.trim();
            if (!url) return showToast('Please paste a link first', true);
            
            // Unsplash optimization
            if (url.includes('unsplash.com/photos/')) {
                const parts = url.split('/');
                const id = parts[parts.length - 1].split('?')[0];
                url = `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&q=80&w=2000`;
                urlInput.value = url;
            }
            
            const btn = document.getElementById('bg-load-btn');
            btn.textContent = '...';
            
            const img = document.getElementById('bg-editor-preview-img');
            img.onload = () => {
                img.style.opacity = '1';
                document.getElementById('bg-editor-placeholder').style.display = 'none';
                // Frame is no longer used, we resized the container
                showToast('Image loaded');
                updateBgPreview();
                btn.textContent = 'Load';
            };
            img.onerror = () => {
                showToast('Failed to load image. Try a direct link.', true);
                img.style.opacity = '0';
                document.getElementById('bg-editor-placeholder').style.display = 'block';
                btn.textContent = 'Load';
            };
            img.src = url;
        }

        function updateBgPreview() {
            const blur = document.getElementById('range-blur').value;
            const dimVal = document.getElementById('range-dim').value;
            const zoom = document.getElementById('range-zoom').value;
            
            document.getElementById('val-dim').textContent = `${dimVal}%`;
            document.getElementById('val-blur').textContent = `${blur}px`;
            document.getElementById('val-zoom').textContent = `${zoom}%`;
            
            const brightness = 1 - (dimVal / 100);
            
            const img = document.getElementById('bg-editor-preview-img');
            if (img.style.opacity === '1') {
                img.style.objectPosition = `${bgEditorState.x}% ${bgEditorState.y}%`;
                img.style.filter = `blur(${blur/4}px) brightness(${brightness})`;
                img.style.transform = `scale(${zoom/100})`;
            }
        }

        async function saveBackgroundSettings() {
            const urlInput = document.getElementById('bg-url-input');
            const url = urlInput.value.trim();
            if (!url) return showToast('Image URL required', true);
            
            const dimVal = document.getElementById('range-dim').value;
            const brightness = 1 - (dimVal / 100);
            
            const recipe = {
                url: url,
                x: bgEditorState.x,
                y: bgEditorState.y,
                blur: document.getElementById('range-blur').value,
                zoom: document.getElementById('range-zoom').value,
                dim: brightness 
            };
            
            showToast('Caching background...');
            const btn = document.querySelector('#bg-editor-modal .save-btn');
            if (btn) btn.textContent = 'Saving...';
            
            await cacheImage(url);
            
            if (btn) btn.textContent = 'Save Background';
            
            appState.set('adaptiveBg', false);
            appState.set('background', recipe);
            
            showToast('Background Saved');
            closeModal('bg-editor-modal');
        }

        function applyAdaptiveBackground(data) {
            if (!data) return;
            
            if (window.adaptiveBgInterval) {
                clearInterval(window.adaptiveBgInterval);
            }

            const updateGradient = () => {
                const now = new Date();
                const timeFloat = now.getHours() + (now.getMinutes() / 60);

                let condition = 'clear';
                const code = data.code;
                if (code >= 1 && code <= 3) condition = 'cloudy';
                if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) condition = 'rain';
                if (code >= 71 && code <= 77) condition = 'snow';
                if (code >= 95) condition = 'storm';

                const schedules = {
                  'clear': [
                    {h: 0,    c: ['#0a0e1a', '#0f1b2d']},
                    {h: 3.5,  c: ['#0a0e1a', '#0f1b2d']},
                    {h: 4.2,  c: ['#12102a', '#1e1535']},  // pre-dawn indigo stir
                    {h: 4.8,  c: ['#1a1040', '#2d1854']},  // deep indigo
                    {h: 5.2,  c: ['#2d1255', '#5a1e3a']},  // violet break
                    {h: 5.6,  c: ['#5c1f3a', '#c4503d']},  // first light red-violet
                    {h: 6.0,  c: ['#c45a38', '#f4a26b']},  // golden sunrise fire
                    {h: 6.5,  c: ['#f4a060', '#fdd99a']},  // warm sunrise glow
                    {h: 7.2,  c: ['#fdd8a0', '#d4eaff']},  // sunrise to morning
                    {h: 8.5,  c: ['#b8d8f8', '#e8f4ff']},  // fresh morning blue
                    {h: 10,   c: ['#7ec8f5', '#c5e8ff']},  // late morning
                    {h: 12,   c: ['#55b8f5', '#9cd4f8']},  // crisp midday
                    {h: 14,   c: ['#4eb0f5', '#85ccfa']},  // bright afternoon
                    {h: 16,   c: ['#7ac5f5', '#bde2fc']},  // afternoon shifting warm
                    {h: 17,   c: ['#f5d08a', '#f4a568']},  // golden hour begins
                    {h: 17.8, c: ['#f09050', '#e0553a']},  // golden hour peak
                    {h: 18.4, c: ['#c84040', '#7a1c5a']},  // sunset fire to violet
                    {h: 19,   c: ['#5c1c62', '#1c1040']},  // dusk violet-indigo
                    {h: 19.8, c: ['#1e1240', '#0f1525']},  // twilight
                    {h: 21,   c: ['#0d1222', '#0f1b2d']},  // early night, soft moon
                    {h: 22,   c: ['#0a0e1a', '#0d1728']},  // deep night
                    {h: 24,   c: ['#0a0e1a', '#0f1b2d']}
                    ],
                  'cloudy': [
                    {h: 0,    c: ['#0c1220', '#101828']},  // night, slight blue
                    {h: 3.5,  c: ['#0c1220', '#101828']},
                    {h: 4.5,  c: ['#1a1c30', '#252840']},  // pre-dawn muted indigo
                    {h: 5.4,  c: ['#382840', '#5a4455']},  // muted violet dawn, clouds mute the fire
                    {h: 6.0,  c: ['#6a4858', '#9a7880']},  // diffused sunrise through clouds, dusty rose
                    {h: 6.8,  c: ['#a09098', '#c8b8bc']},  // clouds swallow the gold, pale rose-grey
                    {h: 8.0,  c: ['#8898a8', '#b0c0cc']},  // overcast morning blue-grey
                    {h: 10,   c: ['#7890a0', '#a8bec8']},  // flat cool mid-morning
                    {h: 12,   c: ['#6e8898', '#9cb0bc']},  // overcast midday, desaturated blue
                    {h: 14,   c: ['#708090', '#a0b4be']},  // afternoon cloud cover
                    {h: 16,   c: ['#7888a0', '#9898b0']},  // late afternoon, hint of lilac
                    {h: 17,   c: ['#806878', '#a08898']},  // cloudy golden hour, mauve not gold
                    {h: 18,   c: ['#604858', '#402840']},  // cloud-muted dusk, deep mauve
                    {h: 19,   c: ['#2c1e38', '#1e1830']},  // dusk to night
                    {h: 20.5, c: ['#141828', '#101520']},
                    {h: 22,   c: ['#0c1220', '#101828']},
                    {h: 24,   c: ['#0c1220', '#101828']}
                    ],
                  'rain': [
                    {h: 0,    c: ['#080c18', '#0c1422']},  // cold rainy night
                    {h: 3.5,  c: ['#080c18', '#0c1422']},
                    {h: 4.8,  c: ['#181828', '#28283c']},  // pre-dawn, dark and wet
                    {h: 5.5,  c: ['#302838', '#502840']},  // rain-soaked dawn, muted violet
                    {h: 6.2,  c: ['#504050', '#805860']},  // diffused sunrise, dim dusty plum
                    {h: 7.5,  c: ['#485868', '#607888']},  // rain morning, steel teal
                    {h: 9,    c: ['#3e5868', '#587888']},  // wet morning, deep teal-steel
                    {h: 11,   c: ['#385068', '#506878']},  // rain midday, dark ocean
                    {h: 13,   c: ['#384e60', '#4e6878']},  // afternoon rain, dim teal
                    {h: 15,   c: ['#304050', '#405868']},  // heavy rain afternoon
                    {h: 17,   c: ['#483848', '#603858']},  // rainy dusk, dark mauve
                    {h: 18,   c: ['#382030', '#281828']},  // wet evening, deep wine
                    {h: 19.5, c: ['#181420', '#100c18']},  // rainy night falls
                    {h: 22,   c: ['#080c18', '#0c1422']},
                    {h: 24,   c: ['#080c18', '#0c1422']}
                    ],
                  'snow': [
                    {h: 0,    c: ['#0a1020', '#10182e']},  // cold silent night
                    {h: 3.5,  c: ['#0a1020', '#10182e']},
                    {h: 4.8,  c: ['#1c2038', '#28304c']},  // pre-dawn cold indigo
                    {h: 5.5,  c: ['#382848', '#583858']},  // snow dawn, soft violet
                    {h: 6.2,  c: ['#806878', '#b09098']},  // snow sunrise, muted pink-violet
                    {h: 7.2,  c: ['#a0b4c8', '#c8d8e8']},  // snow morning lifts, icy blue-white
                    {h: 8.5,  c: ['#b8cce0', '#dceef8']},  // bright snow morning
                    {h: 10,   c: ['#c0d4e8', '#e0f0f8']},  // pure snow day, icy pale
                    {h: 12,   c: ['#b8d0e8', '#daeef8']},  // snow midday, cool white-blue
                    {h: 14,   c: ['#a8c4dc', '#cce4f4']},  // afternoon snow
                    {h: 16,   c: ['#8aacc8', '#b0cce0']},  // late afternoon, blue creeping back
                    {h: 17.2, c: ['#7888a8', '#9898c0']},  // snow dusk, blue-lavender
                    {h: 18,   c: ['#504868', '#382848']},  // snow evening, violet-deep
                    {h: 19.5, c: ['#20182c', '#180c20']},
                    {h: 22,   c: ['#0a1020', '#10182e']},
                    {h: 24,   c: ['#0a1020', '#10182e']}
                    ],
                  'storm': [
                    {h: 0,    c: ['#050810', '#080c14']},  // dead of night storm
                    {h: 3.5,  c: ['#050810', '#080c14']},
                    {h: 4.8,  c: ['#101420', '#181c28']},  // pre-dawn storm, ominous
                    {h: 5.5,  c: ['#281e30', '#3c2838']},  // storm dawn, almost no light
                    {h: 6.5,  c: ['#3c3040', '#504050']},  // stormy sunrise, dark purple-slate
                    {h: 8,    c: ['#303848', '#404858']},  // storm morning, grey-blue
                    {h: 10,   c: ['#2e3c4c', '#3e4c5c']},  // dark storm, deep slate
                    {h: 12,   c: ['#304050', '#405060']},  // storm midday, heavy cloud
                    {h: 14,   c: ['#2c3848', '#3c4858']},  // storm afternoon, dark
                    {h: 16,   c: ['#303040', '#404050']},  // oppressive dusk approach
                    {h: 17.5, c: ['#382838', '#4c3048']},  // storm dusk, dark plum
                    {h: 18.5, c: ['#281820', '#180c18']},  // storm evening
                    {h: 20,   c: ['#100810', '#080810']},
                    {h: 22,   c: ['#050810', '#080c14']},
                    {h: 24,   c: ['#050810', '#080c14']}
                    ]
                };

                const schedule = schedules[condition] || schedules['clear'];
                
                // Find interpolation stops
                let stop1 = schedule[0];
                let stop2 = schedule[schedule.length - 1];
                
                for (let i = 0; i < schedule.length - 1; i++) {
                    if (timeFloat >= schedule[i].h && timeFloat < schedule[i+1].h) {
                        stop1 = schedule[i];
                        stop2 = schedule[i+1];
                        break;
                    }
                }

// AFTER — adds easing so transitions feel smooth instead of linear:
const rawProgress = (timeFloat - stop1.h) / (stop2.h - stop1.h);
const progress = rawProgress < 0.5 
    ? 2 * rawProgress * rawProgress 
    : -1 + (4 - 2 * rawProgress) * rawProgress;
                const hexToRgb = (hex) => {
                    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                    return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [0,0,0];
                };

                const c1A = hexToRgb(stop1.c[0]);
                const c1B = hexToRgb(stop1.c[1]);
                const c2A = hexToRgb(stop2.c[0]);
                const c2B = hexToRgb(stop2.c[1]);

                const r1 = Math.round(c1A[0] + progress * (c2A[0] - c1A[0]));
                const g1 = Math.round(c1A[1] + progress * (c2A[1] - c1A[1]));
                const b1 = Math.round(c1A[2] + progress * (c2A[2] - c1A[2]));

                const r2 = Math.round(c1B[0] + progress * (c2B[0] - c1B[0]));
                const g2 = Math.round(c1B[1] + progress * (c2B[1] - c1B[1]));
                const b2 = Math.round(c1B[2] + progress * (c2B[2] - c1B[2]));

                const grad = `linear-gradient(135deg, rgb(${r1},${g1},${b1}) 0%, rgb(${r2},${g2},${b2}) 100%)`;

                document.body.classList.add('has-custom-bg');
                document.documentElement.style.setProperty('--bg-url', grad);
                document.documentElement.style.setProperty('--bg-blur', '20px');
                document.documentElement.style.setProperty('--bg-brightness', appState.get('theme') === 'light' ? 0.95 : 0.7);
                document.documentElement.style.setProperty('--bg-scale', 1.05); // slight scale to cover edges
                
                const resetBtn = document.getElementById('reset-bg-btn');
                if(resetBtn) resetBtn.style.display = 'none';
            };

            updateGradient();
            window.adaptiveBgInterval = setInterval(updateGradient, 60000);
        }

        function applyBackground() {
            if (appState.get('adaptiveBg')) {
                const cached = localStorage.getItem(WEATHER_CACHE_KEY);
                if (cached) {
                    applyAdaptiveBackground(JSON.parse(cached));
                    return;
                }
            }
            applyBackgroundFromState(appState.get('background'));
        }

        function applyBackgroundFromState(recipe) {
            const resetBtn = document.getElementById('reset-bg-btn');
            
            if (recipe) {
                document.body.classList.add('has-custom-bg');
                
                // Set original URL immediately to avoid flickering
                document.documentElement.style.setProperty('--bg-url', `url('${recipe.url}')`);
                document.documentElement.style.setProperty('--bg-blur', `${recipe.blur}px`);
                document.documentElement.style.setProperty('--bg-brightness', recipe.dim);
                document.documentElement.style.setProperty('--bg-x', `${recipe.x}%`);
                document.documentElement.style.setProperty('--bg-y', `${recipe.y}%`);
                document.documentElement.style.setProperty('--bg-scale', (recipe.zoom || 110) / 100);
                if(resetBtn) resetBtn.style.display = 'block';
                
                // Try to get cached image
                getCachedImage().then(cachedUrl => {
                    if (cachedUrl) {
                        document.documentElement.style.setProperty('--bg-url', `url('${cachedUrl}')`);
                    } else if (recipe.url) {
                        // Cache it if not cached
                        cacheImage(recipe.url).then(success => {
                            if (success) {
                                getCachedImage().then(newCachedUrl => {
                                    if (newCachedUrl) {
                                        document.documentElement.style.setProperty('--bg-url', `url('${newCachedUrl}')`);
                                    }
                                });
                            }
                        });
                    }
                });
            } else {
                document.body.classList.remove('has-custom-bg');
                if(resetBtn) resetBtn.style.display = 'none';
            }
        }

        function resetBackground() {
            appState.set('background', null);
            clearCachedImage();
            showToast('Background Reset');
        }
        
        /* --- Weather Logic --- */
        const WEATHER_CACHE_KEY = 'claver_weather_cache';
        const WEATHER_MANUAL_KEY = 'claver_weather_manual_loc';
        const CACHE_DURATION = 30 * 60 * 1000; 

        async function fetchWithTimeout(resource, options = {}) {
            const { timeout = 5000 } = options;
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), timeout);
            const response = await fetch(resource, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(id);
            return response;
        }

        function sanitizeCityName(name) {
            return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        }

        async function initWeather(forceRefresh = false) {
            const manualLoc = JSON.parse(localStorage.getItem(WEATHER_MANUAL_KEY));
            const cached = localStorage.getItem(WEATHER_CACHE_KEY);
            
            if (!forceRefresh && cached) {
                const data = JSON.parse(cached);
                if (Date.now() - data.timestamp < CACHE_DURATION) {
                    renderWeather(data);
                    return;
                }
            }
            
            try {
                let lat, lon, city;
                if (manualLoc) {
                    lat = manualLoc.lat;
                    lon = manualLoc.lon;
                    city = manualLoc.city;
                } else {
                    try {
                        const geoRes = await fetchWithTimeout('https://ipwho.is/', { timeout: 3000 });
                        const geoData = await geoRes.json();
                        if(geoData.success) {
                            lat = geoData.latitude;
                            lon = geoData.longitude;
                            city = sanitizeCityName(geoData.city);
                        } else {
                            throw new Error('IPWho failed');
                        }
                    } catch(err) {
                        const fbRes = await fetchWithTimeout('https://get.geojs.io/v1/ip/geo.json', { timeout: 3000 });
                        const fbData = await fbRes.json();
                        lat = fbData.latitude;
                        lon = fbData.longitude;
                        city = sanitizeCityName(fbData.city);
                    }
                }
                const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;
                const weatherRes = await fetchWithTimeout(weatherUrl, { timeout: 5000 });
                const weatherData = await weatherRes.json();
                
                const weatherObj = {
                    city: city,
                    temp: Math.round(weatherData.current.temperature_2m),
                    code: weatherData.current.weather_code,
                    humidity: weatherData.current.relative_humidity_2m,
                    rain: weatherData.daily.precipitation_probability_max[0],
                    min: Math.round(weatherData.daily.temperature_2m_min[0]),
                    max: Math.round(weatherData.daily.temperature_2m_max[0]),
                    timestamp: Date.now()
                };
                localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(weatherObj));
                renderWeather(weatherObj);
            } catch (e) {
                // Graceful degradation: If API fails, try to use expired cache
                if (cached) {
                    console.warn("Weather API failed, using cached data.");
                    renderWeather(JSON.parse(cached));
                    return;
                }
                if (!document.getElementById('weather-temp').textContent.includes('--')) return;
                document.getElementById('weather-widget').style.display = 'none';
            }
        }
        
        function toggleWeatherEdit() {
            const h2 = document.getElementById('weather-city');
            const input = document.getElementById('weather-city-input');
            const btn = document.querySelector('.weather-edit-btn');
            
            if (input.style.display === 'block') {
                saveWeatherLocation();
            } else {
                h2.style.display = 'none';
                input.style.display = 'block';
                input.value = h2.textContent;
                input.focus();
                btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
                input.onkeydown = (e) => { if (e.key === 'Enter') saveWeatherLocation(); };
            }
        }
        
        async function saveWeatherLocation() {
            const input = document.getElementById('weather-city-input');
            const query = input.value.trim();
            if (!query) return;
            const btn = document.querySelector('.weather-edit-btn');
            input.disabled = true;
            try {
                const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
                const res = await fetch(geoUrl);
                const data = await res.json();
                if (data.results && data.results.length > 0) {
                    const loc = data.results[0];
                    const manualData = { city: sanitizeCityName(loc.name), lat: loc.latitude, lon: loc.longitude };
                    localStorage.setItem(WEATHER_MANUAL_KEY, JSON.stringify(manualData));
                    input.style.display = 'none';
                    input.disabled = false;
                    document.getElementById('weather-city').style.display = 'block';
                    document.getElementById('weather-city').textContent = 'Updating...';
                    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
                    await initWeather(true);
                } else {
                    showToast('City not found', true);
                    input.disabled = false;
                    input.focus();
                }
            } catch (e) {
                showToast('Error finding city', true);
                input.disabled = false;
            }
        }
        
        function getWeatherColor(code) {
            const isLight = document.body.getAttribute('data-theme') === 'light';
            if (code === 0) return '#FFB74D'; 
            if (code >= 1 && code <= 3) return isLight ? '#42A5F5' : '#90CAF9';
            if (code >= 45 && code <= 48) return isLight ? '#78909C' : '#B0BEC5';
            if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return '#64B5F6'; 
            if (code >= 71 && code <= 77) return isLight ? '#00ACC1' : '#E0F7FA'; 
            if (code >= 95) return '#9575CD'; 
            return '#F97316';
        }

        function renderWeather(data) {
            const dynamicColor = getWeatherColor(data.code);
            document.documentElement.style.setProperty('--weather-color', dynamicColor);
            const widget = document.getElementById('weather-widget');
            const iconSvg = getWeatherIcon(data.code);
            widget.querySelector('.weather-icon-wrapper').innerHTML = iconSvg;
            document.getElementById('weather-temp').textContent = `${data.temp}°`;
            widget.style.opacity = '1';
            const cityDisplay = document.getElementById('weather-city');
            cityDisplay.textContent = data.city;
            document.getElementById('weather-city-input').style.display = 'none';
            cityDisplay.style.display = 'block';
            document.querySelector('.weather-edit-btn').innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
            const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
            document.getElementById('weather-date').textContent = date;
            document.getElementById('weather-main-icon').innerHTML = iconSvg;
            document.getElementById('weather-temp-val').textContent = data.temp;
            document.getElementById('weather-condition').textContent = getWeatherDescription(data.code);
            document.getElementById('weather-humidity').textContent = `${data.humidity}%`;
            document.getElementById('weather-rain').textContent = `${data.rain}%`;
            document.getElementById('weather-high').textContent = `${data.max}°`;
            document.getElementById('weather-low').textContent = `${data.min}°`;
            
            if (appState.get('adaptiveBg')) {
                applyAdaptiveBackground(data);
            }
        }

        function getWeatherDescription(code) {
            if (code === 0) return 'Clear Sky';
            if (code >= 1 && code <= 3) return 'Partly Cloudy';
            if (code >= 45 && code <= 48) return 'Foggy';
            if (code >= 51 && code <= 55) return 'Drizzle';
            if (code >= 61 && code <= 67) return 'Rain';
            if (code >= 71 && code <= 77) return 'Snow';
            if (code >= 80 && code <= 82) return 'Showers';
            if (code >= 95) return 'Thunderstorm';
            return 'Unknown';
        }

        function getWeatherIcon(code) {
            const props = 'width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
            if (code === 0) return `<svg ${props}><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`; 
            if (code >= 1 && code <= 3) return `<svg ${props}><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></svg>`; 
            if (code >= 45 && code <= 48) return `<svg ${props}><path d="M5 6h14M4 11h16M3 16h18M5 21h14"></path></svg>`; 
            if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return `<svg ${props}><line x1="16" y1="13" x2="16" y2="21"></line><line x1="8" y1="13" x2="8" y2="21"></line><line x1="12" y1="15" x2="12" y2="23"></line><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"></path></svg>`; 
            if (code >= 71 && code <= 77) return `<svg ${props}><line x1="8" y1="19" x2="8" y2="21"></line><line x1="8" y1="13" x2="8" y2="15"></line><line x1="16" y1="19" x2="16" y2="21"></line><line x1="16" y1="13" x2="16" y2="15"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="12" y1="15" x2="12" y2="17"></line><path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"></path></svg>`; 
            if (code >= 95) return `<svg ${props}><path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9"></path><polyline points="13 11 9 17 15 17 11 23"></polyline></svg>`; 
            return `<svg ${props}><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></svg>`; 
        }

        function openWeatherModal() {
            document.getElementById('weather-modal').classList.add('active');
            document.body.style.overflow = 'hidden';
            document.querySelector('.footer').classList.add('hidden');
        }

        /* --- Search Logic --- */
        let selectedEngine = 'Google';
        function handleSearch(event) {
            if (event.key === 'Enter') {
                const query = document.getElementById("searchInput").value.trim();
                if (query) {
                    const searchContainer = document.getElementById("searchContainer");
                    searchContainer.style.transform = "translate3d(0, -40px, 0) scale(0.98)";
                    searchContainer.style.opacity = "0.8";

                    // Handle Search Bangs
                    if (query.startsWith('!')) {
                        const firstSpace = query.indexOf(' ');
                        if (firstSpace !== -1) {
                            const bang = query.substring(0, firstSpace).toLowerCase();
                            const searchTerm = encodeURIComponent(query.substring(firstSpace + 1).trim());
                            
                            const bangs = {
                                '!yt': 'https://www.youtube.com/results?search_query=',
                                '!w': 'https://en.wikipedia.org/wiki/Special:Search?search=',
                                '!g': 'https://www.google.com/search?q=',
                                '!b': 'https://www.bing.com/search?q=',
                                '!ddg': 'https://duckduckgo.com/?q=',
                                '!r': 'https://www.reddit.com/search/?q=',
                                '!a': 'https://www.amazon.com/s?k=',
                                '!gh': 'https://github.com/search?q='
                            };

                            if (bangs[bang]) {
                                window.location.href = bangs[bang] + searchTerm;
                                return;
                            }
                        }
                    }

                    const engines = {
                        'Google': 'https://www.google.com/search?q=',
                        'Bing': 'https://www.bing.com/search?q=',
                        'DuckDuckGo': 'https://duckduckgo.com/?q=',
                        'Brave': 'https://search.brave.com/search?q=',
                        'Startpage': 'https://www.startpage.com/do/search?q='
                    };
                    
                    if(query.includes('.') && !query.includes(' ')) {
                        window.location.href = query.startsWith('http') ? query : 'https://' + query;
                    } else {
                        window.location.href = engines[selectedEngine] + encodeURIComponent(query);
                    }
                }
            }
        }
        
        function setSearchEngine(engine, animate = true) {
            if (selectedEngine === engine && animate) { resetView(); return; }
            
            selectedEngine = engine;
            const title = document.getElementById("googleTitle");

            if (animate) {
                title.classList.add("switching-out");
                resetView();
                setTimeout(() => {
                    appState.set('searchEngine', engine);
                    title.classList.remove("switching-out");
                    title.classList.add("switching-in-start");
                    void title.offsetWidth; 
                    title.style.transition = "transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.5s ease, filter 0.5s ease";
                    title.classList.remove("switching-in-start");
                    setTimeout(() => { title.style.transition = ""; }, 500);
                }, 300);
            } else {
                appState.set('searchEngine', engine);
            }
        }
        
        function toggleSearchOptions() {
            const options = document.getElementById("searchOptions");
            const blurBg = document.getElementById("blurBgTitle");
            const title = document.getElementById("googleTitle");
            if (options.classList.contains("active")) {
                resetView();
            } else {
                if (document.body.classList.contains('search-mode')) {
                    document.body.classList.remove('search-mode');
                    document.getElementById("blurBgSearch").classList.remove("active");
                }
                title.setAttribute("aria-expanded", "true");
                document.body.classList.add('engine-mode');
                options.style.display = "flex";
                blurBg.style.display = "block";
                requestAnimationFrame(() => { options.classList.add("active"); });
                document.querySelector('.footer').classList.add('hidden');
            }
        }

        function animateSearchBar() {
            document.body.classList.add('search-mode');
            const blurBgSearch = document.getElementById("blurBgSearch");
            blurBgSearch.style.display = "block";
            requestAnimationFrame(() => { blurBgSearch.classList.add("active"); });
        }
        
        function resetView() {
             document.body.classList.remove('search-mode');
             document.body.classList.remove('engine-mode');
             const blurBgSearch = document.getElementById("blurBgSearch");
             const blurBgTitle = document.getElementById("blurBgTitle");
             const options = document.getElementById("searchOptions");
             const title = document.getElementById("googleTitle");
             title.setAttribute("aria-expanded", "false");
             options.classList.remove("active");
             blurBgSearch.classList.remove("active");
             document.querySelector('.footer').classList.remove('hidden');
             setTimeout(() => {
                 if (!document.body.classList.contains("search-mode")) blurBgSearch.style.display = "none";
                 if (!document.body.classList.contains("engine-mode")) blurBgTitle.style.display = "none";
                 if (!options.classList.contains("active")) options.style.display = "none";
             }, 500);
        }

        function setupSearchContainerClickHandler() {
             const searchContainer = document.getElementById("searchContainer");
             const searchInput = document.getElementById("searchInput");
             searchContainer.addEventListener('click', (e) => {
                 if (e.target !== searchInput) searchInput.focus();
             });
             document.addEventListener('click', (e) => {
                 if (!searchContainer.contains(e.target) && document.body.classList.contains('search-mode')) {
                     resetView();
                     searchInput.blur();
                 }
             });
        }
        
        function setupKeyboardShortcuts() {
            document.addEventListener('keydown', (e) => {
                // Focus search bar on '/'
                if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                    document.getElementById('searchInput').focus();
                }
                
                // Close modals or search on Escape
                if (e.key === 'Escape') {
                    // Close search options if open
                    const options = document.getElementById("searchOptions");
                    if (options && options.classList.contains("active")) {
                        resetView();
                    }
                    
                    // Unfocus search bar
                    document.getElementById('searchInput').blur();
                    resetView();
                    
                    // Close any open modals
                    const modals = document.querySelectorAll('.modal.active');
                    modals.forEach(modal => {
                        closeModal(modal.id);
                    });
                }
            });
        }
        
        /* --- Modal Logic --- */
        let activeCategory = null;

        function openModal(type) {
            activeCategory = type;
            const modal = document.getElementById('shortcut-modal');
            const modalTitle = document.getElementById('modal-title');
            const modalGrid = document.getElementById('modal-grid');
            const container = document.getElementById(`${type}-container`);
            const wrapper = container.querySelector('.elastic-wrapper');

            modalGrid.innerHTML = '';
            modalTitle.textContent = type.charAt(0).toUpperCase() + type.slice(1);
            
            const shortcuts = Array.from((wrapper || container).querySelectorAll('.shortcut'));
            shortcuts.forEach((shortcut, index) => {
                const clone = shortcut.cloneNode(true);
                clone.style.animation = `fadeInScale 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards`;
                clone.style.animationDelay = `${Math.min(index * 0.03, 0.5)}s`;
                clone.style.opacity = '0'; 
                modalGrid.appendChild(clone);
            });
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            document.querySelector('.footer').classList.add('hidden');
        }
        
        function handleHeaderAction(mode) {
            if (!activeCategory) return;
            closeModal('shortcut-modal', false);
            setTimeout(() => { openEditModal(activeCategory, mode); }, 50);
        }
        
        function openSettingsModal() {
            document.getElementById('settings-modal').classList.add('active');
            document.body.style.overflow = 'hidden';
            document.querySelector('.footer').classList.add('hidden');
            if (typeof hideSyncEditView === 'function') hideSyncEditView();
        }

        function toggleAboutModal() {
            const modal = document.getElementById('about-modal');
            if (modal.classList.contains('active')) closeModal('about-modal'); else openAboutModal();
        }
        
        function openAboutModal() {
            document.getElementById('about-modal').classList.add('active');
            document.body.style.overflow = 'hidden';
            const footer = document.querySelector('.footer');
            footer.classList.remove('hidden'); 
            footer.classList.add('lifted');
            document.querySelector('.about-link').classList.add('active');
        }

        function closeModal(modalId = 'shortcut-modal', restoreFooter = true) {
            document.getElementById(modalId).classList.remove('active');
            document.body.style.overflow = '';
            if (restoreFooter) {
                const footer = document.querySelector('.footer');
                footer.classList.remove('hidden');
                footer.classList.remove('lifted');
                document.querySelector('.about-link').classList.remove('active');
            }
        }
        
        function setupModalEventListeners() {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal || e.target.classList.contains('modal-backdrop')) closeModal(modal.id);
                });
            });
        }

        /* --- Edit Shortcuts Logic --- */
        let currentEditCategory = '';
        let shortcutsListSortable = null;
        let currentShortcuts = [];

        function openEditModal(category, defaultView = 'add') {
            currentEditCategory = category;
            const modal = document.getElementById('edit-shortcuts-modal');
            const list = document.getElementById('edit-shortcuts-list');
            const container = document.getElementById(`${category}-container`);
            
            const displayCategory = category.charAt(0).toUpperCase() + category.slice(1);
            document.getElementById('edit-modal-title').textContent = `Edit ${displayCategory}`;
            document.getElementById('staged-shortcuts-list').innerHTML = '';
            
            currentShortcuts = getShortcutsFromDOM(container);
            renderEditList();
            switchEditView(defaultView);
            
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            document.querySelector('.footer').classList.add('hidden');
            
            if (shortcutsListSortable) shortcutsListSortable.destroy();
            shortcutsListSortable = new Sortable(list, {
                animation: 200,
                handle: '.drag-handle',
                ghostClass: 'sortable-ghost',
                onEnd: () => {
                    const newOrder = [];
                    list.querySelectorAll('.shortcut-item').forEach(item => {
                        newOrder.push(currentShortcuts[parseInt(item.dataset.index)]);
                    });
                    currentShortcuts = newOrder;
                    renderEditList();
                }
            });
            
            document.getElementById('add-shortcut-btn').onclick = addNewShortcut;
            document.getElementById('save-shortcuts-btn').onclick = saveShortcuts;
            document.getElementById('cancel-edit-btn').onclick = () => closeModal('edit-shortcuts-modal');
        }
        
        function switchEditView(viewName) {
            const modalContent = document.querySelector('#edit-shortcuts-modal .modal-content');
            if (viewName === 'organize') modalContent.classList.add('organize-view'); else modalContent.classList.remove('organize-view');
            document.querySelectorAll('.segment-btn').forEach(btn => btn.classList.remove('active'));
            document.getElementById(`tab-${viewName}`).classList.add('active');
            document.querySelectorAll('.edit-view').forEach(view => view.classList.add('hidden'));
            document.getElementById(`view-${viewName}`).classList.remove('hidden');
        }

        function getShortcutsFromDOM(container) {
            const items = [];
            const wrapper = container.querySelector('.elastic-wrapper') || container;
            wrapper.querySelectorAll('.shortcut').forEach(el => {
                items.push({
                    name: el.querySelector('span').title || el.querySelector('span').textContent,
                    url: el.querySelector('a').href,
                    icon: el.querySelector('img').src
                });
            });
            return items;
        }

        function renderEditList() {
            const list = document.getElementById('edit-shortcuts-list');
            list.innerHTML = '';
            currentShortcuts.forEach((shortcut, index) => {
                const item = document.createElement('div');
                item.className = 'shortcut-item';
                item.dataset.index = index;
                item.innerHTML = `
                    <div class="drag-handle">
                       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="19" r="1"></circle></svg>
                    </div>
                    <div class="shortcut-item-info">
                        <div class="shortcut-item-icon">
                            <img src="${shortcut.icon}" loading="lazy">
                        </div>
                        <div class="shortcut-text">
                            <span class="shortcut-item-name">${shortcut.name}</span>
                            <span class="shortcut-item-url">${shortcut.url}</span>
                        </div>
                    </div>
                     <button class="remove-shortcut-btn" onclick="event.stopPropagation(); removeShortcut(${index})">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                `;
                list.appendChild(item);
            });
        }

        function removeShortcut(index) {
            currentShortcuts.splice(index, 1);
            renderEditList();
        }

        function addNewShortcut() {
            const nameInput = document.getElementById('new-shortcut-name');
            const urlInput = document.getElementById('new-shortcut-url');
            
            const name = nameInput.value.trim();
            let url = urlInput.value.trim();
            
            if (!name || !url) return showToast('Enter name & URL', true);
            if (!url.startsWith('http')) url = 'https://' + url;
            
            let domain = url;
            try { domain = new URL(url).hostname; } catch(e){}
            
            const newShortcut = {
                name,
                url,
                icon: `https://www.google.com/s2/favicons?sz=64&domain=${domain}`
            };
            
            currentShortcuts.push(newShortcut);
            
            const stagedList = document.getElementById('staged-shortcuts-list');
            const stagedItem = document.createElement('div');
            stagedItem.className = 'staged-item';
            stagedItem.innerHTML = `
                <img src="${newShortcut.icon}" loading="lazy">
                <span>${newShortcut.name}</span>
            `;
            stagedList.appendChild(stagedItem);
            
            setTimeout(() => stagedList.scrollTo({ left: stagedList.scrollWidth, behavior: 'smooth' }), 10);
            
            nameInput.value = '';
            urlInput.value = '';
            nameInput.focus();
            renderEditList();
            
            const btn = document.getElementById('add-shortcut-btn');
            const originalText = btn.innerHTML;
            btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg> Added`;
            setTimeout(() => btn.innerHTML = originalText, 1000);
        }

        /* --- DATA PERSISTENCE LAYER --- */
        const STORAGE_KEY_SHORTCUTS = 'claver_shortcuts_v2';
        const STORAGE_KEY_USERID = 'claver_userid';

        function createShortcutElement(shortcut) {
            const div = document.createElement('div');
            div.className = 'shortcut';
            div.innerHTML = `
                <a href="${shortcut.url}">
                    <div class="icon-wrapper"><img src="${shortcut.icon}" alt="${shortcut.name}" loading="lazy"></div>
                    <span title="${shortcut.name}">${shortcut.name}</span>
                </a>
            `;
            return div;
        }

        function updateDOMForCategory(category, shortcuts) {
            const container = document.getElementById(`${category}-container`);
            if(!container) return;
            container.innerHTML = '';
            
            // Create the Elastic Wrapper
            const wrapper = document.createElement('div');
            wrapper.className = 'elastic-wrapper';
            
            shortcuts.forEach(s => wrapper.appendChild(createShortcutElement(s)));
            container.appendChild(wrapper);
            
            // Re-init elastic logic for this container
            initElasticScroll(container);
        }
        
        function getUserId() {
            let id = localStorage.getItem(STORAGE_KEY_USERID);
            if (!id) {
                // Generate User ID
                id = 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
                localStorage.setItem(STORAGE_KEY_USERID, id);
            }
            return id;
        }

        function loadShortcuts() {
            const localData = appState.get('shortcuts');
            
            if (localData) {
                try {
                    renderAllCategories(localData);
                    // Background Sync
                    syncWithFirebase(localData); 
                } catch (e) {
                    console.error("Local data corrupt", e);
                    loadDefaultShortcuts();
                }
            } else {
                loadDefaultShortcuts();
            }
        }

        function loadDefaultShortcuts() {
            fetch('defaultShortcuts.json')
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    appState.set('shortcuts', data);
                    
                    // Sync Up to Firebase (Create new user doc)
                    syncWithFirebase(data);
                })
                .catch(error => {
                    console.error("Failed to load default shortcuts:", error);
                    // Initialize empty to avoid errors
                    const empty = { tools: [], productivity: [], utilities: [], social: [] };
                    appState.set('shortcuts', empty);
                });
        }

        function renderAllCategories(data) {
             if (!data) return;
             Object.keys(data).forEach(cat => updateDOMForCategory(cat, data[cat]));
        }

        function syncWithFirebase(currentLocalData) {
            const userId = getUserId();
            // Collection: shortcuts -> Document: {userId}
            const userDoc = db.collection('shortcuts').doc(userId);

            userDoc.get().then((doc) => {
                if (doc.exists) {
                    // Scenario A: User Exists -> Sync Down (Server wins)
                    const serverData = doc.data();
                    appState.set('shortcuts', serverData);
                    console.log(`Synced Down from shortcuts/${userId}`);
                } else {
                    // Scenario B: New User -> Sync Up (Create Doc)
                    if (currentLocalData) {
                        userDoc.set(currentLocalData)
                            .then(() => console.log(`Initialized shortcuts/${userId}`))
                            .catch(e => {
                                console.error('Init failed', e);
                                showToast('Cloud init failed', true);
                            });
                    }
                }
            }).catch(e => {
                console.log('Offline or Firebase blocked', e);
            });
        }

        function saveShortcuts() {
            const btn = document.getElementById('save-shortcuts-btn');
            btn.textContent = 'Saving...';
            
            let currentData = appState.get('shortcuts') || { tools: [], productivity: [], utilities: [], social: [] };
            let appData = JSON.parse(JSON.stringify(currentData)); // Deep clone
            
            appData[currentEditCategory] = currentShortcuts;
            
            appState.set('shortcuts', appData);
            
            const userId = getUserId();
            db.collection('shortcuts').doc(userId).set(appData)
                .then(() => {
                    showToast('Saved');
                    closeModal('edit-shortcuts-modal');
                })
                .catch(err => {
                    console.error("Firebase save failed:", err);
                    showToast('Saved locally', true); 
                    closeModal('edit-shortcuts-modal');
                })
                .finally(() => btn.textContent = 'Save Changes');
        }
        
        /* --- Search Suggestions --- */
        let currentSuggestionIndex = -1;
        
        function setupSearchEvents() {
            const input = document.getElementById('searchInput');
            let debounce;
            
            input.addEventListener('input', () => {
                currentSuggestionIndex = -1;
                clearTimeout(debounce);
                debounce = setTimeout(() => {
                   if(input.value.trim()) {
                       // Clean up old JSONP scripts
                       document.querySelectorAll('.jsonp-script').forEach(el => el.remove());
                       
                       const script = document.createElement('script');
                       script.className = 'jsonp-script';
                       script.src = `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(input.value)}&callback=handleSuggestions`;
                       document.body.appendChild(script);
                   } else hideSuggestions();
                }, 150); 
            });
            
            input.addEventListener('keydown', (e) => {
                const container = document.getElementById('suggestions-container');
                if (!container || container.style.display === 'none') return;
                
                const items = container.querySelectorAll('.suggestion-item');
                if (!items.length) return;

                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    currentSuggestionIndex = (currentSuggestionIndex + 1) % items.length;
                    updateSuggestionHighlight(items, input);
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    currentSuggestionIndex = (currentSuggestionIndex - 1 + items.length) % items.length;
                    updateSuggestionHighlight(items, input);
                } else if (e.key === 'Enter' && currentSuggestionIndex >= 0) {
                    e.preventDefault();
                    selectSuggestion(items[currentSuggestionIndex].textContent.trim());
                }
            });
            
            document.addEventListener('click', e => {
                if(!e.target.closest('#searchContainer') && !e.target.closest('.suggestions-container')) {
                    hideSuggestions();
                }
            });
        }
        
        window.handleSuggestions = (data) => {
            const suggestions = data[1];
            if(!suggestions.length) return hideSuggestions();
            let container = document.getElementById('suggestions-container');
            const searchContainer = document.getElementById('searchContainer');
            if(!container) {
                container = document.createElement('div');
                container.id = 'suggestions-container';
                container.className = 'suggestions-container';
                searchContainer.appendChild(container);
            }
            container.innerHTML = suggestions.slice(0, 3).map((s, i) => `
                <div class="suggestion-item" id="suggestion-${i}" onclick="selectSuggestion('${s}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    ${s}
                </div>
            `).join('');
            container.style.display = 'block';
            requestAnimationFrame(() => { requestAnimationFrame(() => { container.classList.add('active'); }); });
            searchContainer.classList.add('with-suggestions');
        };

        function updateSuggestionHighlight(items, input) {
            items.forEach((item, index) => {
                if (index === currentSuggestionIndex) {
                    item.classList.add('highlighted');
                    input.value = item.textContent.trim();
                } else {
                    item.classList.remove('highlighted');
                }
            });
        }
        
        window.selectSuggestion = (val) => {
            document.getElementById('searchInput').value = val;
            handleSearch({key: 'Enter'});
            hideSuggestions();
        };
        
        function hideSuggestions() {
            const c = document.getElementById('suggestions-container');
            if(c) {
                c.classList.remove('active');
                setTimeout(() => c.style.display = 'none', 250);
                const sc = document.getElementById('searchContainer');
                if(sc) sc.classList.remove('with-suggestions');
            }
        }
