import type { ApiErrorBody } from './types';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: ApiErrorBody
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
