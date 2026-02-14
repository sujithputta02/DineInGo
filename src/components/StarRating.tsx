import React from 'react';
import { Star, StarHalf } from 'lucide-react';

interface StarRatingProps {
    rating: number | string;
    size?: number;
    className?: string;
}

const StarRating: React.FC<StarRatingProps> = ({ rating, size = 16, className = "" }) => {
    const numericRating = typeof rating === 'string' ? parseFloat(rating) : rating;
    const fullStars = Math.floor(numericRating);
    const hasHalfStar = numericRating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
        <div className={`flex items-center gap-0.5 ${className}`}>
            {[...Array(fullStars)].map((_, i) => (
                <Star key={`full-${i}`} size={size} className="text-emerald-400 fill-current" />
            ))}
            {hasHalfStar && <StarHalf size={size} className="text-emerald-400 fill-current" />}
            {[...Array(emptyStars > 0 ? emptyStars : 0)].map((_, i) => (
                <Star key={`empty-${i}`} size={size} className="text-gray-200" />
            ))}
        </div>
    );
};

export default StarRating;
