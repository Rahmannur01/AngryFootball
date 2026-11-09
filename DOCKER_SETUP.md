## ⚡ Быстрый старт

```bash
# 1. Клонируйте репозиторий
git clone https://github.com/Rahmannur01/AngryFootball.git
cd AngryFootball

# 2. Создайте .env файл
cp .env.example .env
# Задайте пароль PostgreSQL, DATABASE_URL и SECRET_KEY

# 3. Запустите проект
docker compose up -d --build

# 4. Откройте браузер
http://localhost:8001/
```

Для локального запуска оставьте `ROOT_PATH` пустым. При публикации за
прокси задайте внешний префикс, например `ROOT_PATH=/angryfootball`.

Для регистрации по email настройте в `.env` SMTP-параметры. Для Яндекс
Почты используйте `smtp.yandex.ru`, порт `465`, SSL и отдельный пароль
приложения. Обычный пароль от Яндекс ID использовать не нужно.
