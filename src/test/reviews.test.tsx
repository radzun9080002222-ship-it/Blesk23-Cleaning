import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Reviews from '@/components/Reviews';
import YandexReviewsSection from '@/components/YandexReviewsSection';
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

describe('Service Yandex reviews block', () => {
  beforeEach(() => {
    vi.mocked(reachGoal).mockClear();
  });

  it('uses live Yandex widgets instead of a hard-coded rating and review count', () => {
    render(
      <YandexReviewsSection
        placement="windows_reviews"
        title="Отзывы о мойке окон в Яндекс Картах"
        description="Живая лента отзывов"
      />
    );

    expect(screen.queryByText(/48 отзывов/i)).not.toBeInTheDocument();
    expect(screen.getByTitle('Актуальный рейтинг Империи Блеска на Яндекс Картах')).toHaveAttribute(
      'src',
      'https://yandex.ru/sprav/widget/rating-badge/21130859655?type=rating'
    );
    expect(screen.getByTitle('Отзывы об Империи Блеска на Яндекс Картах')).toHaveAttribute(
      'src',
      'https://yandex.ru/maps-reviews-widget/21130859655?comments'
    );
  });

  it('attributes service review actions to the current page', () => {
    render(
      <YandexReviewsSection
        placement="furniture_reviews"
        title="Отзывы о химчистке мебели в Яндекс Картах"
        description="Живая лента отзывов"
      />
    );

    fireEvent.click(screen.getByRole('link', { name: /^Все отзывы/i }));
    expect(reachGoal).toHaveBeenCalledWith('reviews_all_click', {
      placement: 'furniture_reviews',
    });

    fireEvent.click(screen.getByRole('link', { name: /Оставить отзыв/i }));
    expect(reachGoal).toHaveBeenCalledWith('review_create_click', {
      placement: 'furniture_reviews',
    });
  });
});
