# TenderScope — финальный UX/UI-аудит

**Дата проверки:** 03.11.2026

**Область:** лендинг, Flutter-клиент по исходному коду, billing UX/configuration, pitch deck и практические HTML-презентации №9/11/13/15/17/19.

## Исправленные проблемы

| Файл / область | Проблема и влияние | Исправление | Критерий проверки | Приоритет |
|---|---|---|---|---|
| `landing/index.html`, `landing/styles.css` | CTA и часть мелких подписей не проходили проверку контраста; это ухудшало читаемость и accessibility. | Для primary CTA и ключевых mockup-подписей использованы более контрастные значения; focus-visible сохранён. | Lighthouse не сообщает о недостаточном контрасте; клавиатурный focus видим. | P1 |
| `landing/styles.css` | Hero выглядел перегруженным из-за декоративных glow/grid/floating cards. | Плавающие карточки скрыты, radar ослаблен, карточки и CTA переведены в более спокойную solid-систему. | На проверенном desktop главным визуальным акцентом остаются phone mockup, ценностный текст и CTA; CSS mobile-breakpoints и отсутствие overflow нужно повторить на целевом устройстве. | P1 |
| `landing/index.html`, `landing/script.js` | В раннем доступе было легко принять целевую цену и форму за подключённую оплату/ backend-submit. | CTA и pricing copy явно говорят о раннем доступе, целевой цене `999 ₽/мес` и `mailto`-сценарии без обязательства оплаты. | До отправки формы видны ранний доступ и отсутствие боевого платежа; форма не заявляется как backend-submit. | P0 |
| `tender_ai/lib/main.dart` | Полноэкранный raster/circular reveal при смене темы создавал тяжёлую и непредсказуемую анимацию. | Убран snapshot/reveal-контур; тема меняется обычным предсказуемым переключением с `Duration.zero`. | Переключение темы не зависит от `ui.Image`/snapshot overlay и не блокирует экран. | P1 |
| `tender_ai/lib/features/widgets/auth_widgets.dart`, `tender_ai/lib/features/auth/*.dart` | Auth-компоненты содержали отдельную копию `AppColors`, что создавало риск рассинхронизации палитры. | Auth-экраны переведены на канонические значения `AppPalette.dark`. | В auth-коде нет класса `AppColors` и ссылок на него; цвета совпадают с brand palette. | P1 |
| `tender_ai/lib/features/splash/splash_screen.dart` | Splash имел лишний бесконечный shine-loop и избыточную длительность ожидания. | Убран неиспользуемый loop; timeline сокращён до 1.6 с, token wait — до 1.4 с. | Splash завершается предсказуемо; `prefers-reduced-motion`/platform motion policy проверяются отдельно на устройстве. | P2 |
| `tender_ai/lib/features/tenders/tenders_screen.dart` | Ошибка ленты показывала технический `DEBUG ERROR`/сырое исключение. | Добавлено понятное offline/error-состояние с действием «Повторить». | При ошибке пользователь видит объяснение и retry, но не backend exception. | P0 |
| `tender_ai/lib/features/billing/paywall_screen.dart`, `TenderAI.API/appsettings.json`, `BillingOptions`, `PaymentService` | Цена в интерфейсе и billing-контуре могла расходиться. | Целевая цена унифицирована как `999 ₽/мес`; добавлено объяснение, что боевой платёж ещё не подключён. | UI/config/service используют `999`; секреты ЮKassa остаются placeholders; E2E payment не объявляется подтверждённым. | P0 |
| `docs/pitch/pitch-deck.html` | Print-правило было A4 landscape и отличалось от практических презентаций 16:9. | Печать переведена на `16in 9in`, один слайд на страницу, controls скрываются. | В print CSS: `@page size:16in 9in`, slide `100vw × 56.25vw`, последний слайд без лишнего page break. | P1 |
| `docs/practicals/*/slides.html` №9/11/13/15/17/19 | Разный font/print/export baseline затруднял единый просмотр и PDF. | Добавлены Manrope/brand overrides и общий 16:9 print contract; controls скрываются. | Все шесть HTML открываются без console errors; `<style>`/`<html>` сбалансированы; print rule присутствует. | P1 |

## Проверенные критерии

- Лендинг открыт локально в Chromium: accessibility tree содержит skip-link, landmark-навигацию, form и pricing copy; console errors отсутствуют. CSS mobile-breakpoints проверены статически, но отдельный mobile viewport/физическое устройство в этой среде не запускались.
- Lighthouse для лендинга после правок: Accessibility `1.00`, Best Practices `1.00`, SEO `1.00`; failures отсутствуют.
- Шесть практических презентаций №9/11/13/15/17/19 открываются локально без console errors; в каждой есть Manrope и 16:9 print rule.
- .NET API после восстановления зависимостей собирается: `dotnet build TenderAI.API/TenderAI.API.csproj --no-restore` — успешно, 0 ошибок.
- Parser tests запускаются через `dotnet test TenderAI.ParserTests/TenderAI.ParserTests.csproj --no-restore` без ошибок.
- Сборка предупреждает о зависимостях с advisory и об obsolete Hangfire API; это отдельные технические P1/P2-задачи, не визуальные исправления.

## Неподтверждённые возможности и placeholders

- Flutter `flutter analyze`/`flutter test` не выполнены: Flutter SDK отсутствует в PATH.
- `node --check landing/script.js` не выполнен: Node.js отсутствует в PATH; JS проверен браузерным smoke-load.
- Реальная Firebase/push-доставка, физическое устройство, публичный deployment и backend E2E не проверены.
- ЮKassa: кабинет, реальные credentials, webhook, receipt и боевой платёж не проверены. `999 ₽` — целевая цена, не подтверждённая подключённая оплата.
- Landing form открывает prefilled `mailto:hello@tenderscope.ru`; это не backend lead storage.
- Legal pages, ФИО, реквизиты, роли основателей и данные регистрации остаются placeholders/черновиками.
- Метрики, клиенты, выручка, победы в закупках, push E2E и международные продажи не считаются подтверждёнными.

## Рекомендуемый порядок следующей проверки

1. Подключить Flutter SDK и выполнить `flutter analyze` и `flutter test`.
2. Установить Node.js и выполнить `node --check landing/script.js`.
3. В Chrome/Edge вручную открыть print preview лендинга и всех deck-файлов, проверить фон, разрывы страниц и читаемость.
4. Прогнать auth/feed/paywall на физическом или эмулированном устройстве.
5. Выполнить staging E2E для Firebase/push и ЮKassa с тестовыми секретами, не добавляя их в репозиторий.
