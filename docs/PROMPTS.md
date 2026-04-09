# Промпты для генерации BBplay

По условиям конкурса сюда нужно **скопировать все промпты**, которыми вы пользовались в Cursor / ChatGPT / Claude и т.д. при создании кода и архитектуры.

## Шаблон записи

Для каждого значимого запроса:

1. Дата (опционально)
2. Инструмент (Cursor Agent, Composer, …)
3. Текст промпта **полностью**
4. Кратко: что изменилось в проекте после ответа

---

### Пример

- **Инструмент:** Cursor Agent  
- **Промпт:** «Реализуй план BBplay Expo: авторизация, баланс, бронирование, локальный чат по JSON, ApiClient с Bearer и refresh.»  
- **Результат:** Создан каркас Expo-проекта, экраны и `docs/api-spec.md`.

---

### 2026-04-09 — реализация плана

- **Инструмент:** Cursor Agent  
- **Промпт:** «План: BBplay (мультиплатформа на React / Expo) — Implement the plan as specified… To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work… Don't stop until you have completed all the to-dos.»  
- **Результат:** Создан проект Expo в `d:\BB_Project\bbplay`, экраны и API-клиент по `docs/api-spec.md`, чат по `assets/knowledge.json`, `eas.json`, `docs/ARCHITECTURE.md` и этот файл.

---

### 2026-04-09 — интеграция vibe.blackbearsplay.ru

- **Промпт:** (вставка технического текста по API iCafe / vibe, тестовые учётки test1:test1, исправление `tsconfig.json`, сборка APK/iOS).
- **Результат:** Переписаны клиент и эндпоинты под обёртку `{code,message,data}`, экраны Профиль / Клубы / Новости (WebView VK) / Бронь / Помощь; MD5-подпись для `POST /booking`; `tsconfig` без зависимости от `node_modules/expo/tsconfig.base`.

---

_(Добавляйте ниже дальнейшие промпты по мере работы.)_
