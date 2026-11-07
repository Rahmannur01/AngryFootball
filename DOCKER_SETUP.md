## ⚡ Быстрый старт

```bash
# 1. Клонируйте репозиторий
git clone https://github.com/Rahmannur01/AngryFootball.git
cd AngryFootball

# 2. Создайте .env файл
cp .env.example .env
# Отредактируйте .env и добавьте ваши OAuth credentials

# 3. Запустите проект
docker-compose up -d

# 4. Откройте браузер
http://localhost:8001/angryfootball
```

## 🔑 OAuth Setup

### Google OAuth
1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект
3. Включите Google+ API
4. Создайте OAuth 2.0 credentials
5. Добавьте Authorized redirect URIs:
   - Для текущего OAuth access-token flow redirect URI не используется.
     Добавьте JavaScript origin `http://localhost:8001` и ваш публичный домен.
6. Скопируйте Client ID и Client Secret в `.env`
