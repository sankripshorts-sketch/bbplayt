import { afterEach, describe, expect, it } from 'vitest';
import { requestSmsPathCandidates } from '../../src/api/registrationApi';

describe('requestSmsPathCandidates', () => {
  afterEach(() => {
    delete process.env.EXPO_PUBLIC_REQUEST_SMS_PATH;
  });

  it('defaults to request-sms then requestsms', () => {
    expect(requestSmsPathCandidates()).toEqual(['request-sms', 'requestsms']);
  });

  it('puts explicit path first and appends the other canonical', () => {
    process.env.EXPO_PUBLIC_REQUEST_SMS_PATH = 'requestsms';
    expect(requestSmsPathCandidates()).toEqual(['requestsms', 'request-sms']);
  });

  it('dedupes when explicit equals first canonical', () => {
    process.env.EXPO_PUBLIC_REQUEST_SMS_PATH = 'request-sms';
    expect(requestSmsPathCandidates()).toEqual(['request-sms', 'requestsms']);
  });
});
