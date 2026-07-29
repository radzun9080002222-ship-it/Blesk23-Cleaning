import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ConsentCheckbox from '@/components/ConsentCheckbox';
import Contacts from '@/components/Contacts';
import PublicCleaningCalculator from '@/components/calculator/PublicCleaningCalculator';
import FurnitureLeadForm from '@/components/furniture/FurnitureLeadForm';
import RepairLeadForm from '@/components/repair/RepairLeadForm';
import WindowsLeadForm from '@/components/windows/WindowsLeadForm';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('lead form consent', () => {
  it('does not let native validation block the submit handler', () => {
    render(
      <ConsentCheckbox
        id="test-consent"
        checked={false}
        error
        onChange={() => undefined}
      />,
    );

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeRequired();
    expect(checkbox).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Подтвердите согласие, чтобы отправить заявку.')).toBeInTheDocument();
  });

  it.each([
    ['contacts', <Contacts />, 'Отправить заявку'],
    ['public calculator', <PublicCleaningCalculator />, 'Отправить заявку'],
    ['furniture', <FurnitureLeadForm />, 'Отправить заявку'],
    ['repair', <RepairLeadForm />, 'Получить точный расчёт'],
    ['windows', <WindowsLeadForm />, 'Получить расчёт'],
  ])('keeps the %s form submit button enabled before consent', (_name, form, buttonName) => {
    render(form);

    expect(screen.getByRole('button', { name: buttonName })).toBeEnabled();
    expect(screen.getByRole('checkbox')).not.toBeRequired();
  });

  it('submits the furniture form without a preliminary calculator selection', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    render(<FurnitureLeadForm total={0} />);

    fireEvent.change(screen.getByLabelText('Ваше имя'), { target: { value: 'Иван' } });
    fireEvent.change(screen.getByLabelText('Телефон'), { target: { value: '9001234567' } });
    fireEvent.click(screen.getByRole('button', { name: 'Отправить заявку' }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText('Подтвердите согласие, чтобы отправить заявку.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Отправить заявку' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const payload = new URLSearchParams(String(request.body));
    expect(payload.get('entry.1008164226')).toContain('Предварительный расчёт не выбран');
    expect(await screen.findByText('Спасибо!')).toBeInTheDocument();
  });
});
