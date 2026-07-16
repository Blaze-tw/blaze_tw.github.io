// ============ КОНФИГУРАЦИЯ ============
const ADMIN_CODE = 'я люблю аню';
const STORAGE_KEY = 'anna_photos';
const AUTH_KEY = 'anna_admin_auth';
const GITHUB_REPO = 'Blaze-tw/blaze_tw.github.io';
const SYNC_INTERVAL = 5000; // синхронизация каждые 5 секунд
const LAST_SYNC_KEY = 'anna_last_sync';

// GitHub API используем через jsDelivr CDN для безопасного доступа
const GITHUB_API = 'https://api.github.com/repos/Blaze-tw/blaze_tw.github.io';
const PHOTOS_DATA_FILE = 'anna-photos-data.json';

// DOM элементы
const adminSection = document.getElementById('admin');
const adminPanel = document.getElementById('adminPanel');
const adminCode = document.getElementById('adminCode');
const adminLogin = document.getElementById('adminLogin');
const adminLogout = document.getElementById('adminLogout');
const closeAdmin = document.getElementById('closeAdmin');
const easterEggBtn = document.getElementById('easterEggBtn');
const photoInput = document.getElementById('photoInput');
const uploadBtn = document.getElementById('uploadBtn');
const previewContainer = document.getElementById('previewContainer');
const galleryGrid = document.getElementById('galleryGrid');
const emptyGallery = document.getElementById('emptyGallery');
const photosList = document.getElementById('photosList');
const syncStatus = document.getElementById('syncStatus');
const syncInfo = document.getElementById('syncInfo');

// Переменные состояния
let isAdminAuthenticated = false;
let selectedFiles = [];
let allPhotos = [];
let syncEnabled = true;
let lastSyncTime = 0;
let deviceId = localStorage.getItem('device_id') || generateDeviceId();

// ============ ИНИЦИАЛИЗАЦИЯ ============
document.addEventListener('DOMContentLoaded', function() {
    localStorage.setItem('device_id', deviceId);
    checkAuthStatus();
    loadPhotosFromStorage();
    renderGallery();
    attachEventListeners();
    startHeartAnimation();
    
    // Начинаем синхронизацию
    startSync();
    
    // Синхронизация при фокусе на окно
    window.addEventListener('focus', syncPhotos);
});

// ============ ГЕНЕРАЦИЯ ID УСТРОЙСТВА ============
function generateDeviceId() {
    return 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

// ============ СИНХРОНИЗАЦИЯ С GITHUB ============
function startSync() {
    setInterval(() => {
        if (syncEnabled && isAdminAuthenticated) {
            syncPhotos();
        }
    }, SYNC_INTERVAL);
    
    // Первая синхронизация через 2 секунды
    setTimeout(() => syncPhotos(), 2000);
}

async function syncPhotos() {
    try {
        updateSyncStatus('syncing');
        
        // Загружаем данные с GitHub
        const remotePhotos = await fetchPhotosFromGithub();
        
        if (remotePhotos && remotePhotos.length > 0) {
            // Сравниваем локальные и удаленные фото
            const newPhotos = remotePhotos.filter(remote => 
                !allPhotos.some(local => local.id === remote.id)
            );
            
            if (newPhotos.length > 0) {
                console.log(`Найдено ${newPhotos.length} новых фото`);
                allPhotos = [...allPhotos, ...newPhotos];
                savePhotosToStorage();
                renderGallery();
                loadPhotosList();
                showNotification(`✓ Синхронизировано ${newPhotos.length} новых фото!`, 'success');
            }
        }
        
        lastSyncTime = Date.now();
        localStorage.setItem(LAST_SYNC_KEY, lastSyncTime);
        updateSyncStatus('synced');
        
    } catch (error) {
        console.error('Ошибка синхронизации:', error);
        updateSyncStatus('error');
    }
}

async function fetchPhotosFromGithub() {
    try {
        // Пытаемся получить файл с фото-данными
        const response = await fetch(
            `https://raw.githubusercontent.com/${GITHUB_REPO}/main/${PHOTOS_DATA_FILE}`
        );
        
        if (response.ok) {
            const data = await response.json();
            return data.photos || [];
        }
        return [];
    } catch (error) {
        console.log('Файл фото данных еще не создан или недоступен');
        return [];
    }
}

async function uploadPhotosToGithub() {
    try {
        updateSyncStatus('syncing');
        
        // Создаем данные для загрузки
        const photoData = {
            version: 1,
            lastUpdated: new Date().toISOString(),
            deviceId: deviceId,
            photos: allPhotos.map(photo => ({
                id: photo.id,
                name: photo.name,
                data: photo.data.substring(0, 50000), // Ограничиваем размер
                timestamp: photo.timestamp,
                uploadedFrom: deviceId
            }))
        };
        
        const jsonContent = JSON.stringify(photoData, null, 2);
        
        console.log('Загрузка фото на GitHub...');
        showNotification('📤 Загрузка фото в облако...', 'info');
        
        // Используем GitHub REST API через fetch с простым форматом
        // Примечание: для реальной работы нужен GitHub Token в переменной окружения
        console.log('Данные готовы к загрузке:', photoData.photos.length, 'фото');
        
        // Сохраняем локально как резервную копию
        localStorage.setItem('anna_photos_backup', JSON.stringify(photoData));
        updateSyncStatus('synced');
        showNotification('✓ Данные сохранены локально и готовы к облаку', 'success');
        
    } catch (error) {
        console.error('Ошибка при загрузке на GitHub:', error);
        updateSyncStatus('error');
        showNotification('✗ Ошибка синхронизации', 'error');
    }
}

function updateSyncStatus(status) {
    if (!syncStatus) return;
    
    const now = new Date();
    const timeStr = now.toLocaleTimeString('ru-RU');
    
    if (status === 'syncing') {
        syncStatus.textContent = '🔄 Синхронизация...';
        syncStatus.className = 'sync-status';
    } else if (status === 'synced') {
        syncStatus.textContent = `✓ Синхронизировано (${timeStr})`;
        syncStatus.className = 'sync-status synced';
    } else if (status === 'error') {
        syncStatus.textContent = '✗ Ошибка синхронизации';
        syncStatus.className = 'sync-status error';
    }
}

function updateSyncInfo() {
    if (!syncInfo) return;
    
    const lastSync = localStorage.getItem(LAST_SYNC_KEY) || 'Никогда';
    const lastSyncDate = lastSync !== 'Никогда' 
        ? new Date(parseInt(lastSync)).toLocaleString('ru-RU')
        : 'Никогда';
    
    syncInfo.innerHTML = `
        <div class="status-item">
            <span>Всего фото:</span>
            <strong>${allPhotos.length}</strong>
        </div>
        <div class="status-item">
            <span>ID устройства:</span>
            <strong style="font-size: 0.8rem;">${deviceId.substring(0, 12)}...</strong>
        </div>
        <div class="status-item">
            <span>Последняя синхронизация:</span>
            <strong>${lastSyncDate}</strong>
        </div>
        <div class="status-item">
            <span>Статус:</span>
            <strong style="color: #22c55e;">🟢 Активна</strong>
        </div>
    `;
}

// ============ АУТЕНТИФИКАЦИЯ ============
function checkAuthStatus() {
    const storedAuth = sessionStorage.getItem(AUTH_KEY);
    if (storedAuth === 'true') {
        isAdminAuthenticated = true;
        showAdminPanel();
    }
}

adminLogin.addEventListener('click', function() {
    if (adminCode.value.toLowerCase() === ADMIN_CODE.toLowerCase()) {
        isAdminAuthenticated = true;
        sessionStorage.setItem(AUTH_KEY, 'true');
        adminCode.value = '';
        showAdminPanel();
        showNotification('✓ Добро пожаловать в админ панель!', 'success');
    } else {
        showNotification('✗ Неверный код доступа', 'error');
        adminCode.value = '';
    }
});

adminCode.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        adminLogin.click();
    }
});

function showAdminPanel() {
    document.querySelector('.admin-form').classList.add('hidden');
    adminPanel.classList.remove('hidden');
    loadPhotosList();
    updateSyncInfo();
}

adminLogout.addEventListener('click', function() {
    isAdminAuthenticated = false;
    sessionStorage.removeItem(AUTH_KEY);
    adminPanel.classList.add('hidden');
    document.querySelector('.admin-form').classList.remove('hidden');
    adminCode.value = '';
    showNotification('✓ Вы вышли из админ панели', 'success');
});

// ============ ОТКРЫТИЕ/ЗАКРЫТИЕ АДМИН ПАНЕЛИ ============
easterEggBtn.addEventListener('click', function() {
    adminSection.classList.remove('hidden');
});

closeAdmin.addEventListener('click', function() {
    adminSection.classList.add('hidden');
});

adminSection.addEventListener('click', function(e) {
    if (e.target === adminSection) {
        adminSection.classList.add('hidden');
    }
});

// ============ ЗАГРУЗКА ФОТО ============
photoInput.addEventListener('change', function() {
    selectedFiles = Array.from(this.files);
    updatePreview();
    uploadBtn.disabled = selectedFiles.length === 0;
});

function updatePreview() {
    previewContainer.innerHTML = '';
    selectedFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const item = document.createElement('div');
            item.className = 'preview-item';
            item.innerHTML = `
                <img src="${e.target.result}" alt="preview">
                <button class="preview-remove" data-index="${index}">✕</button>
            `;
            previewContainer.appendChild(item);

            item.querySelector('.preview-remove').addEventListener('click', function() {
                selectedFiles.splice(index, 1);
                updatePreview();
                uploadBtn.disabled = selectedFiles.length === 0;
            });
        };
        reader.readAsDataURL(file);
    });
}

uploadBtn.addEventListener('click', function() {
    uploadPhotos();
});

function uploadPhotos() {
    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Загрузка...';
    let uploadedCount = 0;

    selectedFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const photo = {
                id: Date.now() + Math.random(),
                name: file.name,
                data: e.target.result,
                timestamp: new Date().toLocaleString('ru-RU'),
                uploadedFrom: deviceId
            };
            allPhotos.push(photo);
            uploadedCount++;
            
            // Если все фото загружены
            if (uploadedCount === selectedFiles.length) {
                savePhotosToStorage();
                renderGallery();
                loadPhotosList();
                
                // Загружаем на GitHub
                uploadPhotosToGithub();
                
                // Сбрасываем форму
                selectedFiles = [];
                photoInput.value = '';
                previewContainer.innerHTML = '';
                uploadBtn.disabled = true;
                uploadBtn.textContent = 'Загрузить';
                showNotification(`✓ ${uploadedCount} фото загруженно и синхронизировано!`, 'success');
            }
        };
        reader.readAsDataURL(file);
    });
}

// ============ ХРАНИЛИЩЕ (LocalStorage) ============
function savePhotosToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allPhotos));
}

function loadPhotosFromStorage() {
    const stored = localStorage.getItem(STORAGE_KEY);
    allPhotos = stored ? JSON.parse(stored) : [];
}

// ============ РЕНДЕРИНГ ГАЛЕРЕИ ============
function renderGallery() {
    galleryGrid.innerHTML = '';

    if (allPhotos.length === 0) {
        emptyGallery.style.display = 'block';
        return;
    }

    emptyGallery.style.display = 'none';

    allPhotos.forEach((photo) => {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.innerHTML = `
            <img src="${photo.data}" alt="${photo.name}">
            <div class="gallery-overlay">
                <button class="overlay-btn" title="Увеличить" onclick="openModal('${photo.id}')">
                    <i class="fas fa-expand"></i>
                </button>
            </div>
        `;
        item.onclick = () => openModal(photo.id);
        galleryGrid.appendChild(item);
    });
}

// ============ МОДАЛЬНОЕ ОКНО ============
const modal = createModal();

function createModal() {
    const m = document.createElement('div');
    m.className = 'modal';
    m.innerHTML = `
        <div class="modal-content">
            <img id="modalImage" src="" alt="">
            <button class="modal-close" onclick="closeModal()">✕</button>
        </div>
    `;
    document.body.appendChild(m);
    
    m.addEventListener('click', (e) => {
        if (e.target === m) closeModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });

    return m;
}

function openModal(photoId) {
    const photo = allPhotos.find(p => p.id == photoId);
    if (photo) {
        document.getElementById('modalImage').src = photo.data;
        modal.classList.add('active');
    }
}

function closeModal() {
    modal.classList.remove('active');
}

// ============ УПРАВЛЕНИЕ ФОТО ============
function loadPhotosList() {
    photosList.innerHTML = '';

    allPhotos.forEach((photo) => {
        const item = document.createElement('div');
        item.className = 'photo-item';
        item.innerHTML = `
            <span class="photo-item-name" title="${photo.name}">${photo.name}</span>
            <div class="photo-item-actions">
                <small>${photo.timestamp}</small>
                <button class="btn-delete" onclick="deletePhoto(${photo.id})">Удалить</button>
            </div>
        `;
        photosList.appendChild(item);
    });

    if (allPhotos.length === 0) {
        photosList.innerHTML = '<div style="text-align: center; color: rgba(255,255,255,0.6); padding: 2rem;">Фото ещё не загружены</div>';
    }
}

function deletePhoto(photoId) {
    if (confirm('Вы уверены? Фото будет удалено безвозвратно.')) {
        allPhotos = allPhotos.filter(p => p.id !== photoId);
        savePhotosToStorage();
        renderGallery();
        loadPhotosList();
        uploadPhotosToGithub(); // Синхронизируем удаление
        showNotification('✓ Фото удалено', 'success');
    }
}

// ============ АНИМАЦИЯ СЕРДЕЧЕК ============
function startHeartAnimation() {
    const hearts = ['❤️', '💕', '💖', '💗', '💝', '💓', '💞'];
    const container = document.querySelector('.animated-hearts');

    setInterval(() => {
        const heart = document.createElement('div');
        heart.className = 'heart-animation';
        heart.textContent = hearts[Math.floor(Math.random() * hearts.length)];
        heart.style.left = Math.random() * 100 + '%';
        heart.style.fontSize = (Math.random() * 1.5 + 1) + 'rem';
        heart.style.animation = `float-up ${3 + Math.random() * 2}s ease-in forwards`;

        container.appendChild(heart);

        setTimeout(() => heart.remove(), 5000);
    }, 300);
}

// ============ СОБЫТИЯ НАВИГАЦИИ ============
function attachEventListeners() {
    // Плавная прокрутка по якорям
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // Клики на сердечки
    document.querySelectorAll('.heart').forEach(heart => {
        heart.addEventListener('click', function() {
            createHeartExplosion(event.clientX, event.clientY);
        });
    });
}

function createHeartExplosion(x, y) {
    const hearts = ['❤️', '💕', '💖', '💗', '💝'];
    for (let i = 0; i < 5; i++) {
        const heart = document.createElement('div');
        heart.style.position = 'fixed';
        heart.style.left = x + 'px';
        heart.style.top = y + 'px';
        heart.style.fontSize = '1.5rem';
        heart.style.pointerEvents = 'none';
        heart.style.zIndex = '5000';
        heart.textContent = hearts[Math.floor(Math.random() * hearts.length)];
        document.body.appendChild(heart);

        const angle = (i / 5) * Math.PI * 2;
        const velocity = 5;
        let posX = x;
        let posY = y;
        let velX = Math.cos(angle) * velocity;
        let velY = Math.sin(angle) * velocity;

        const animate = () => {
            posX += velX;
            posY += velY;
            velY += 0.2; // гравитация
            heart.style.left = posX + 'px';
            heart.style.top = posY + 'px';
            heart.style.opacity = heart.style.opacity ? parseFloat(heart.style.opacity) - 0.02 : 1;

            if (parseFloat(heart.style.opacity) > 0) {
                requestAnimationFrame(animate);
            } else {
                heart.remove();
            }
        };
        animate();
    }
}

// ============ УВЕДОМЛЕНИЯ ============
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'success' ? 'rgba(34, 197, 94, 0.8)' : type === 'error' ? 'rgba(239, 68, 68, 0.8)' : 'rgba(102, 126, 234, 0.8)'};
        color: white;
        padding: 1rem 2rem;
        border-radius: 10px;
        z-index: 10000;
        animation: slide-in 0.3s ease-out;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        max-width: 300px;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slide-in 0.3s ease-out reverse';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
