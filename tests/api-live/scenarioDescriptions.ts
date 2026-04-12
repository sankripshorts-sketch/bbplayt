/**
 * Человекочитаемые подписи к сценариям api-live (slug = имя папки в artifacts/).
 */
export const SCENARIO_DESCRIPTIONS: Record<
  string,
  { title: string; purpose: string }
> = {
  'vibe-post-login': {
    title: 'Логин',
    purpose: 'POST /login — получить сессию, member_id, private_key; сохранить токен для последующих запросов.',
  },
  'vibe-get-cafes': {
    title: 'Список клубов',
    purpose: 'GET /cafes — адреса и icafe_id клубов BlackBears.',
  },
  'vibe-get-icafe-id-for-member': {
    title: 'Клуб участника',
    purpose: 'GET /icafe-id-for-member — к какому icafe_id привязан текущий аккаунт.',
  },
  'vibe-get-struct-rooms-icafe': {
    title: 'Схема зала',
    purpose: 'GET /struct-rooms-icafe — зоны/комнаты для карты зала и брони.',
  },
  'vibe-get-all-prices-icafe': {
    title: 'Тарифы и продукты',
    purpose: 'GET /all-prices-icafe — цены, пакеты, продукты (в т.ч. для пополнения).',
  },
  'vibe-get-available-pcs-for-booking': {
    title: 'Свободные ПК на слот',
    purpose: 'GET /available-pcs-for-booking — какие ПК свободны на дату/время/длительность.',
  },
  'vibe-get-all-books-cafes': {
    title: 'Мои брони',
    purpose: 'GET all-books — список броней пользователя по клубам.',
  },
  'icafe-get-live-pcs': {
    title: 'ПК онлайн',
    purpose: 'GET /api/v2/cafe/{id}/pcs — текущее состояние ПК в клубе (занятость сейчас).',
  },
  'icafe-get-member-pc-status': {
    title: 'Сессия на ПК (memberPcStatus)',
    purpose:
      'GET /api/v2/cafe/{cafeId}/memberPcStatus?member_id=… — на каком ПК сейчас участник (iCafe Cloud).',
  },
  'icafe-get-members-balance': {
    title: 'Баланс через список members',
    purpose:
      'GET /api/v2/cafe/{id}/members с поиском — надёжное чтение баланса по member_id (iCafe).',
  },
  'icafe-get-member-row': {
    title: 'Строка участника (members)',
    purpose: 'Тот же GET members — полная строка профиля участника для отображения.',
  },
  'icafe-load-member-profile': {
    title: 'Профиль для редактирования',
    purpose:
      'Сначала GET /api/v2/cafe/{id}/memberSelf (профиль «я»); при ошибке — fallback GET /members?search_field=member_account — данные для формы редактирования.',
  },
  'icafe-get-member-balance-history': {
    title: 'История движений по счёту',
    purpose: 'GET /api/v2/cafe/{id}/memberBalanceHistory — аудит операций по балансу.',
  },
  'icafe-post-pc-sessions': {
    title: 'Игровые сессии',
    purpose: 'POST /api/v2/cafe/{id}/pcSessions — история игровых сессий участника.',
  },
  'vibe-get-customer-analysis': {
    title: 'Аналитика клиента',
    purpose: 'GET /customer-analysis — агрегаты (визиты, часы и т.д.) на прокси vibe.',
  },
  'icafe-get-ranking-url': {
    title: 'Рейтинг',
    purpose: 'GET /api/v2/cafe/{id}/members/action/rankingUrl — данные/URL рейтинга клуба.',
  },
  'memberMoney-topup-with-bonus': {
    title: 'Пополнение с бонусом (fetchBonus → topup)',
    purpose:
      'POST fetchBonus, затем POST topup с topup_balance_bonus из ответа (TEST_ENABLE_TOPUP_FLOW=1).',
  },
  'memberMoney-topup-without-bonus': {
    title: 'Пополнение без бонуса (только topup)',
    purpose:
      'POST .../members/action/topup без fetchBonus (TEST_ENABLE_TOPUP_FLOW=1).',
  },
  'registration-create-member': {
    title: 'Регистрация участника',
    purpose: 'POST /api/v2/cafe/{id}/members — создание нового аккаунта (TEST_ENABLE_REGISTRATION=1).',
  },
  'random-flow-get-bundle': {
    title: 'Случайный набор GET (как пользователь)',
    purpose:
      'Один прогон: available-pcs + struct + prices + live pcs + memberPcStatus со случайными датой/временем/минутами.',
  },
};
