const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

let currentPage = 1;
let selectedCategory = '';
let searchQuery = '';
let totalPages = 1;
let categories = []; // глобально сохраним категории для удобства

// Загружаем категории для обоих селектов (фильтр и модалка)
async function loadCategories() {
    const response = await fetch(`${API_BASE_URL}/api/categories`);
    categories = await response.json();
    
    // Селект для фильтра (уже существующий)
    const filterSelect = document.getElementById('categorySelect');
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.name;
        filterSelect.appendChild(option);
    });
    
    // Селект в модальном окне для нового объявления (исправлен id)
    const newAdSelect = document.getElementById('newAdCategorySelect');
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.name;
        newAdSelect.appendChild(option);
    });
}

// Загружаем объявления
async function loadAds() {
    let url = `${API_BASE_URL}/api/ads?page=${currentPage}&limit=5`;
    if (selectedCategory) url += `&categoryId=${selectedCategory}`;
    if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

    const response = await fetch(url);
    const data = await response.json();
    totalPages = data.totalPages;
    renderAds(data.ads);
    updatePagination();
}

// Отрисовка объявлений
function renderAds(ads) {
    const container = document.getElementById('adsList');
    if (ads.length === 0) {
        container.innerHTML = '<p>Объявлений не найдено</p>';
        return;
    }
    let html = '';
    ads.forEach(ad => {
        const date = new Date(ad.createdAt).toLocaleDateString('ru-RU');
        html += `
            <div class="ad-item">
                <h3>${ad.text.substring(0, 100)}${ad.text.length > 100 ? '...' : ''}</h3>
                <p>Категория: ${ad.category || 'Без категории'} | ${date}</p>
                ${ad.photoFileId ? '<span>📷 Есть фото</span>' : ''}
                <button onclick="viewAd(${ad.id})">Подробнее</button>
            </div>
        `;
    });
    container.innerHTML = html;
}

// Просмотр деталей объявления (отправка боту)
function viewAd(adId) {
    tg.sendData(JSON.stringify({ action: 'viewAd', adId }));
    tg.close(); // закрываем WebApp после отправки
}

// Обновление пагинации
function updatePagination() {
    document.getElementById('pageInfo').innerText = `Страница ${currentPage} из ${totalPages}`;
    document.getElementById('prevBtn').disabled = currentPage === 1;
    document.getElementById('nextBtn').disabled = currentPage === totalPages;
}

// --- НОВЫЙ КОД: Функциональность подачи объявления ---

// Открыть модальное окно
document.getElementById('newAdBtn').addEventListener('click', () => {
    document.getElementById('adFormModal').style.display = 'block';
});

// Закрыть модальное окно
document.getElementById('cancelAd').addEventListener('click', () => {
    document.getElementById('adFormModal').style.display = 'none';
    // Очистка полей
    document.getElementById('adText').value = '';
    document.getElementById('adPhoto').value = '';
    const select = document.getElementById('newAdCategorySelect');
    if (select.options.length) select.selectedIndex = 0;
});

// Отправка нового объявления
// Отправка нового объявления (единый API с фото)
document.getElementById('submitAd').addEventListener('click', async () => {
    const categorySelect = document.getElementById('newAdCategorySelect');
    const categoryId = categorySelect.value;
    const text = document.getElementById('adText').value.trim();
    const photoFile = document.getElementById('adPhoto').files[0];
    const userId = tg.initDataUnsafe?.user?.id;

    if (!userId) {
        alert('Ошибка: не удалось определить пользователя');
        return;
    }
    if (!categoryId) {
        alert('Выберите категорию');
        return;
    }
    if (!text) {
        alert('Введите текст объявления');
        return;
    }

    // Создаём FormData и добавляем поля
    const formData = new FormData();
    formData.append('userId', userId);
    formData.append('categoryId', categoryId);
    formData.append('text', text);
    if (photoFile) {
        formData.append('photo', photoFile);
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/createAd`, {
            method: 'POST',
            body: formData,
            // Не устанавливаем Content-Type – браузер сам поставит правильный с boundary
        });

        const result = await response.json();
        if (result.success) {
            alert('✅ Объявление отправлено на модерацию!');
            tg.close(); // Закрываем WebApp
        } else {
            alert('❌ Ошибка: ' + (result.error || 'Неизвестная ошибка'));
        }
    } catch (error) {
        console.error('Ошибка отправки:', error);
        alert('❌ Ошибка соединения с сервером');
    }

    // Закрываем модальное окно и очищаем поля (на случай, если WebApp не закрылся)
    document.getElementById('adFormModal').style.display = 'none';
    document.getElementById('adText').value = '';
    document.getElementById('adPhoto').value = '';
    if (categorySelect.options.length) categorySelect.selectedIndex = 0;
});

// --- КОНЕЦ НОВОГО КОДА ---

// Обработчики событий (ваши существующие)
document.getElementById('categorySelect').addEventListener('change', (e) => {
    selectedCategory = e.target.value;
    currentPage = 1;
    loadAds();
});

document.getElementById('searchBtn').addEventListener('click', function() {
  console.log('🔍 Кнопка "Найти" нажата');
  searchQuery = document.getElementById('searchInput').value;
  console.log('Поисковый запрос:', searchQuery);
  currentPage = 1;
  loadAds();
});

document.getElementById('prevBtn').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        loadAds();
    }
});

document.getElementById('nextBtn').addEventListener('click', () => {
    if (currentPage < totalPages) {
        currentPage++;
        loadAds();
    }
});

//const API_BASE_URL = 'http://localhost:3000';

// Инициализация
const API_BASE_URL = 'https://telegram-board-bot-production.up.railway.app'; // ЗАМЕНИТЕ на реальный адрес вашего API
loadCategories();
loadAds();