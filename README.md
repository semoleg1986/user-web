# user-web

Nuxt 4 + Nitro клиент для пользователя (UI + BFF в `server/api`).

## Что реализовано
### UI
- регистрация
- логин
- выход
- создание профиля пользователя
- список/создание/редактирование/архивация детей
- добавление stories

### Nitro BFF (`/api`)
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/me`
- `POST /api/user/create`
- `GET /api/children`
- `POST /api/children`
- `PATCH /api/children/{childId}`
- `DELETE /api/children/{childId}`
- `POST /api/children/{childId}/stories`

## Запуск
```bash
cd /Users/olegsemenov/Programming/monitoring/user-web
pnpm install
pnpm dev --port 3000
```

## Требуемые backend
- `auth-service` на `http://localhost:8000`
- `user-children-service` на `http://localhost:8001`

## Статус
Подтвержден в e2e smoke (`5/5`): user-flow и token lifecycle проходят.
