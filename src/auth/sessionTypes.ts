import type { SessionUser } from '../api/types';

export type PersistedSession = {
  user: SessionUser;
  /** Bearer или другой токен, если сервер отдал */
  authToken?: string;
  /** Заголовок Cookie для запросов, если сервер выставил сессию */
  cookie?: string;
};
