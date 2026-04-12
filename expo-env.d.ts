/// <reference types="expo/types" />

declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_API_BASE_URL?: string;
    EXPO_PUBLIC_ICAFE_API_BASE_URL?: string;
    EXPO_PUBLIC_BOOKING_SIGN_SECRET?: string;
    EXPO_PUBLIC_VERIFY_SIGN_SECRET?: string;
    EXPO_PUBLIC_REQUEST_SMS_PATH?: string;
    /** 1 — история баланса/сессий по путям iCafe Cloud; по умолчанию — пути прокси vibe (см. docs/API_VIBE_LOGIC.md). */
    EXPO_PUBLIC_INSIGHTS_USE_ICAFE_CLOUD_PATHS?: string;
    /** Ключ API из лицензии iCafe Cloud; для запросов на `*.icafecloud.com` вместо Bearer сессии логина (см. dev.icafecloud.com/docs). */
    EXPO_PUBLIC_ICAFE_CLOUD_API_KEY?: string;
  }
}
