import type { CategoryRating } from '../types/poc';
import { StarRating } from './StarRating';

interface RatingCategoryInputProps {
  rating: CategoryRating;
  className?: string;
}

export default function RatingCategoryInput({ rating, className = '' }: RatingCategoryInputProps) {
  return (
    <div className={`flex items-center justify-between p-3 border border-gray-200 rounded ${className}`}>
      <div className="flex-1">
        <h3 className="text-sm font-semibold text-gray-900">{rating.category}</h3>
        {rating.notes && <p className="text-xs text-gray-600 mt-1">{rating.notes}</p>}
      </div>
      <div className="flex items-center gap-2">
        <StarRating value={rating.rating} showLabel className="min-w-[180px]" />
      </div>
    </div>
  );
}
