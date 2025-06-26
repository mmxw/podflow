import React from 'react';
import { PodcastCardProps } from '../types';

const PodcastCard: React.FC<PodcastCardProps> = ({ podcast, onSelect }) => {
    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const target = e.target as HTMLImageElement;
        target.src = `https://placehold.co/300x300/6366F1/FFFFFF?text=Image+Error`;
    };

    return (
        <div
            className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer overflow-hidden flex flex-col"
            onClick={() => onSelect(podcast)}
        >
            <img
                src={podcast.imageUrl}
                alt={podcast.title}
                className="w-full h-48 object-cover"
                onError={handleImageError}
            />
            <div className="p-4 flex-grow flex flex-col">
                <h3 className="text-lg font-bold text-gray-900 line-clamp-2 flex-grow">
                    {podcast.title}
                </h3>
                <p className="text-sm text-gray-600 line-clamp-1">
                    {podcast.publisher}
                </p>
            </div>
        </div>
    );
};

export default PodcastCard;
