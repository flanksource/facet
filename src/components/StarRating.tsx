import { IoStar as IconStar, IoStarOutline as IconStarOutline } from 'react-icons/io5';

type StarRating = 1 | 2 | 3 | 4 | 5;

interface StarRatingProps {
  mode?: 'display' | 'interactive';
  value: StarRating;
  onChange?: (rating: StarRating) => void;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const RATING_LABELS: Record<StarRating, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very Good',
  5: 'Excellent',
};

const RATING_COLORS: Record<StarRating, string> = {
  1: 'text-red-500',
  2: 'text-orange-500',
  3: 'text-yellow-500',
  4: 'text-lime-500',
  5: 'text-green-500',
};

const SIZE_CLASSES = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

export function StarRating({
  mode = 'display',
  value,
  onChange,
  size = 'md',
  showLabel = false,
  className = '',
}: StarRatingProps) {
  const getStarColor = (starPosition: number): string => {
    if (starPosition > value) {
      return 'text-gray-300';
    }
    return RATING_COLORS[value];
  };

  const handleStarClick = (rating: StarRating) => {
    if (mode === 'interactive' && onChange) {
      onChange(rating);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, rating: StarRating) => {
    if (mode === 'interactive' && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      handleStarClick(rating);
    }
  };

  const sizeClass = SIZE_CLASSES[size];
  const isInteractive = mode === 'interactive';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`flex gap-0.5 items-center ${isInteractive ? 'cursor-pointer' : ''}`}>
        {([1, 2, 3, 4, 5] as const).map((star) => {
          const isFilled = star <= value;
          const starColor = getStarColor(star);

          return (
            <span
              key={star}
              className={`${starColor} ${isInteractive ? 'hover:scale-110 transition-transform' : ''}`}
              onClick={() => handleStarClick(star)}
              onKeyDown={(e) => handleKeyDown(e, star)}
              role={isInteractive ? 'button' : undefined}
              tabIndex={isInteractive ? 0 : undefined}
              aria-label={isInteractive ? `Rate ${star} star${star > 1 ? 's' : ''}` : undefined}
            >
              {isFilled ? <IconStar className={sizeClass} /> : <IconStarOutline className={sizeClass} />}
            </span>
          );
        })}
      </div>
      {showLabel && <span className="text-sm font-medium text-gray-700">{RATING_LABELS[value]}</span>}
    </div>
  );
}
