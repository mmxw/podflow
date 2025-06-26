import React from 'react';

export const PlayIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
        <path d="M4.52 3.11L14.05 9.18a1.25 1.25 0 010 2.14L4.52 17.39A1.25 1.25 0 012.5 16.32V4.18a1.25 1.25 0 012.02-1.07z"></path>
    </svg>
);

export const PauseIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
        <path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .41.34.75.75.75h2a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-2zM12.25 3a.75.75 0 00-.75.75v12.5c0 .41.34.75.75.75h2a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-2z"></path>
    </svg>
);

export const RewindIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
        <path d="M8.05 9.61L4.53 6.86a.75.75 0 00-1.06 1.06l2.9 2.9-2.9 2.9a.75.75 0 101.06 1.06l3.52-2.75a.75.75 0 000-1.52zm5.47-2.75a.75.75 0 00-1.06-1.06L9.56 8.7a.75.75 0 000 1.52l2.9 2.9a.75.75 0 101.06-1.06l-2.6-2.6 2.6-2.6z"></path>
    </svg>
);

export const ForwardIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
        <path d="M11.95 9.61l3.52-2.75a.75.75 0 00-1.06-1.06L11.51 8.7a.75.75 0 000 1.52l2.9 2.9a.75.75 0 101.06-1.06l-3.52-2.75zm-5.47-2.75a.75.75 0 00-1.06 1.06l2.6 2.6-2.6 2.6a.75.75 0 101.06 1.06l2.9-2.9a.75.75 0 000-1.52L6.48 6.86z"></path>
    </svg>
);

export const VolumeIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.25 4.75a.75.75 0 00-1.06.02L4.72 8.25H3a.75.75 0 00-.75.75v2c0 .41.34.75.75.75h1.72l3.47 3.48a.75.75 0 001.06-.02V4.75zM12 7.75a.75.75 0 110 1.5.75.75 0 010-1.5zM14.5 6.25a.75.75 0 10-1.5 0v4a.75.75 0 101.5 0v-4z"></path>
    </svg>
);

export const PlusIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
        <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"></path>
    </svg>
);

export const PreviousIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
        <path d="M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z"></path>
    </svg>
);

export const NextIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
        <path d="M4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4A1 1 0 0010 6v2.798L4.555 5.168z"></path>
    </svg>
);
