import { beforeEach, describe, expect, it } from 'vitest';
import { appendLeadTracking, captureLeadAttribution } from '@/lib/leadTracking';

describe('lead attribution', () => {
  beforeEach(() => {
    sessionStorage.clear();
    window.history.replaceState({}, '', '/?utm_source=yandex&utm_campaign=cleaning&yclid=123');
  });

  it('keeps initial campaign parameters after navigation', () => {
    captureLeadAttribution();
    window.history.replaceState({}, '', '/moyka-okon-sochi');

    const message = appendLeadTracking('Заявка');

    expect(message).toContain('utm_source: yandex');
    expect(message).toContain('utm_campaign: cleaning');
    expect(message).toContain('yclid: 123');
    expect(message).toContain('landing_page: /?utm_source=yandex&utm_campaign=cleaning&yclid=123');
  });
});
