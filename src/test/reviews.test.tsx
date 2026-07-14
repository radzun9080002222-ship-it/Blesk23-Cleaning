import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Reviews from '@/components/Reviews';
import { reachGoal } from '@/lib/metrika';

vi.mock('@/lib/metrika', () => ({
  reachGoal: vi.fn(),
}));

describe('Yandex reviews block', () => {
  beforeEach(() => {
    vi.mocked(reachGoal).mockClear();
  });

  it('embeds the official Yandex reviews widget lazily', () => {
    render(<Reviews />);

    const widget = screen.getByTitle('Отзывы об Империи Блеска на Яндекс Картах');
    const rating = screen.getByTitle('Актуальный рейтинг Империи Блеска на Яндекс Картах');
    expect(widget).toHaveAttribute(
      'src',
      'https://yandex.ru/maps-reviews-widget/21130859655?comments'
    );
    expect(widget).toHaveAttribute('loading', 'lazy');
    expect(rating).toHaveAttribute(
      'src',
      'https://yandex.ru/sprav/widget/rating-badge/21130859655?type=rating'
    );
  });

  it('tracks the review list and review creation actions separately', () => {
    render(<Reviews />);

    fireEvent.click(screen.getByRole('link', { name: /Все отзывы/i }));
    expect(reachGoal).toHaveBeenCalledWith('reviews_all_click', {
      placement: 'home_reviews',
    });

    fireEvent.click(screen.getByRole('link', { name: /Оставить отзыв/i }));
    expect(reachGoal).toHaveBeenCalledWith('review_create_click', {
      placement: 'home_reviews',
    });
  });
});
