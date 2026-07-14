import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

type AppsScriptPhoneHelpers = {
  normalizePhone_: (value: unknown) => string;
  extractRussianPhones_: (text: unknown) => string[];
  collectWazzupMessageEvents_: (payload: unknown) => Array<Record<string, unknown>>;
};

const loadPhoneHelpers = (): AppsScriptPhoneHelpers => {
  const source = readFileSync(
    resolve(process.cwd(), 'integrations/google-apps-script/Code.gs'),
    'utf8'
  );
  const exposed = `${source}\nthis.__phoneHelpers = { normalizePhone_, extractRussianPhones_, collectWazzupMessageEvents_ };`;
  const context: Record<string, unknown> = {};
  runInNewContext(exposed, context);
  return context.__phoneHelpers as AppsScriptPhoneHelpers;
};

describe('Apps Script Russian phone parsing', () => {
  const { normalizePhone_, extractRussianPhones_, collectWazzupMessageEvents_ } =
    loadPhoneHelpers();

  it.each([
    ['+7 960 966-61-61', '+79609666161'],
    ['8 (960) 966-61-61', '+79609666161'],
    ['7 960 966 61 61', '+79609666161'],
    ['9609666161', '+79609666161'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizePhone_(input)).toBe(expected);
  });

  it('extracts either +7 or 8 notation from a client message', () => {
    expect(extractRussianPhones_('Позвоните мне: 8 (960) 966-61-61')).toEqual([
      '+79609666161',
    ]);
    expect(extractRussianPhones_('Мой номер +7 960 966 61 61')).toEqual([
      '+79609666161',
    ]);
  });

  it('deduplicates equivalent +7 and 8 spellings', () => {
    expect(
      extractRussianPhones_('Основной +7 960 966-61-61, тот же 8 960 966 61 61')
    ).toEqual(['+79609666161']);
  });

  it('does not mistake order numbers for Russian phone numbers', () => {
    expect(extractRussianPhones_('Заказ 123456789012, квартира 78')).toEqual([]);
  });

  it('normalizes a Wazzup user API v3 inbound MAX message', () => {
    const messages = collectWazzupMessageEvents_({
      messages: [
        {
          messageId: 'message-1',
          channelId: 'channel-1',
          chatType: 'max',
          chatId: 'max-user-1',
          isEcho: false,
          status: 'inbound',
          contact: { name: 'Клиент', phone: '89609666161' },
          text: 'Мой номер +7 960 966-61-61',
        },
      ],
    });

    expect(messages).toEqual([
      expect.objectContaining({
        message_id: 'message-1',
        direction: 'inbound',
        text: 'Мой номер +7 960 966-61-61',
        recipient: expect.objectContaining({
          chat_type: 'max',
          chat_id: 'max-user-1',
          phone: '89609666161',
        }),
      }),
    ]);
  });
});
