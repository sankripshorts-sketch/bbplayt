# FAQ (расширенный)

## Сборка и запуск

**Q: Какая версия Node?**  
A: LTS, совместимая с **Expo SDK 51** (см. [Expo: установка](https://docs.expo.dev/get-started/installation/)). Точный номер в репо не пиннится; при сбоях — сначала `node -v` и сравнение с документацией Expo.

**Q: `npm start` — телефон не подключается к Metro.**  
A: Телефон и ПК в одной сети; отключить VPN для проверки; в Dev Tools переключить **Tunnel**; проверить файрвол Windows (разрешить Node).

**Q: Можно ли разрабатывать iOS на Windows?**  
A: Симулятор iOS **нет**; только **macOS** + Xcode. На Windows — Android, или **EAS** для облачной сборки iOS.

**Q: Зачем `patch-package`?**  
A: Небольшие фиксы в `node_modules` с воспроизводимыми патчами в `patches/`. См. [../developer-guide.md](../developer-guide.md).

## Конфигурация

**Q: Почему мой `.env` не применяется?**  
A: Ключи должны быть `EXPO_PUBLIC_*` для попадания в бандл. После изменения — **перезапустить** Metro. Для EAS — задать env **в EAS**, не полагаться на локальный файл.

**Q: `contestSignSecret` в `app.config.js` — страшно публично?**  
A: Это **договорной** с прокси кусок, как `SECRET` в реф. Android. Настоящие сервер-only секреты в клиент не кладут.

## Данные и кэш

**Q: Почему после перезапуска нет брони в списке, пока сеть догрузит?**  
A: Список броней, как и многие запросы, **не** в персисте RQ. См. [../modules/data-and-jobs.md](../modules/data-and-jobs.md).

**Q: Почему «чат дурацкий»?**  
A: Только **локальная/загруженная** база, без OpenAI. Расширяйте `knowledge.json` или URL базы, не ожидайте «умного бота» из коробки.

## Бэкенд

**Q: 403 на всех деньгоподобных путях.**  
A: **Права на прокси** для токена. Согласовывать с владельцем API. См. [troubleshooting.md](troubleshooting.md).

**Q: Бронь 401/403 без текста «подпись».**  
A: Смотреть **сырой** body; сравнить path с [api-spec.md](../../api-spec.md). Возможен не тот `member` или host.

## Производительность

**Q: Клавиатура дёргает refetch?**  
A: `refetchOnWindowFocus: false` в `queryClient` как раз **против** этого. Если сбой остаётся — искать `refetch` вручную.

## Сборка в стор

**Q: Какой профиль EAS для теста APK?**  
A: `preview` с `buildType: apk` в [eas.json](../../../eas.json). См. [deployment.md](deployment.md).

**Q: Где bundle id?**  
A: `app.config.js` — `ios.bundleIdentifier`, `android.package` (сейчас `com.bbplay.app` — проверяйте актуальный файл).
