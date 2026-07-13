import { afterEach, describe, expect, it, vi } from 'vitest';
import { installAutomaticGoalTracking } from '@/lib/metrika';

describe('automatic Metrika goals', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    delete window.ym;
    window.history.replaceState({}, '', '/');
  });

  it('separates WhatsApp clicks from the aggregate messenger goal', () => {
    const ym = vi.fn();
    window.ym = ym;
    document.body.innerHTML = '<a href="https://wa.me/79002885255" data-track-placement="hero">WhatsApp</a>';
    const dispose = installAutomaticGoalTracking();

    const link = document.querySelector('a');
    link?.addEventListener('click', (event) => event.preventDefault());
    link?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(ym).toHaveBeenCalledWith(
      107216997,
      'reachGoal',
      'whatsapp_click',
      expect.objectContaining({ page: '/', placement: 'hero' })
    );
    dispose();
  });

  it('tracks the first interaction with each form once', () => {
    const ym = vi.fn();
    window.ym = ym;
    document.body.innerHTML = '<form data-track-form="main"><input name="phone"></form>';
    const dispose = installAutomaticGoalTracking();
    const input = document.querySelector('input');

    input?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    input?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

    expect(ym).toHaveBeenCalledTimes(1);
    expect(ym).toHaveBeenCalledWith(
      107216997,
      'reachGoal',
      'form_start',
      expect.objectContaining({ page: '/', form: 'main' })
    );
    dispose();
  });

  it('does not track staff activity in the internal calculator', () => {
    const ym = vi.fn();
    window.ym = ym;
    window.history.replaceState({}, '', '/calc');
    document.body.innerHTML = '<form><input name="pin"></form>';

    const dispose = installAutomaticGoalTracking();
    document.querySelector('input')?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

    expect(ym).not.toHaveBeenCalled();
    dispose();
  });
});
