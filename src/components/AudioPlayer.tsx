import React from 'react';
import { AudioPlayerState } from '../types';
import { formatTime } from '../utils';
import {
    PlayIcon,
    PauseIcon,
    RewindIcon,
    ForwardIcon,
    VolumeIcon,
    PreviousIcon,
    NextIcon
} from './Icons';

interface AudioPlayerProps {
    audioRef: React.RefObject<HTMLAudioElement>;
    state: AudioPlayerState;
    onPlayPause: () => void;
    onSeek: (time: number) => void;
    onVolumeChange: (volume: number) => void;
    onSpeedChange: () => void;
    onNext: () => void;
    onPrevious: () => void;
    onSkip: (amount: number) => void;
    onTimeUpdate: () => void;
    onLoadedMetadata: () => void;
    onEnded: () => void;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({
    audioRef,
    state,
    onPlayPause,
    onSeek,
    onVolumeChange,
    onSpeedChange,
    onNext,
    onPrevious,
    onSkip,
    onTimeUpdate,
    onLoadedMetadata,
    onEnded
}) => {
    const { currentEpisode, isPlaying, playbackSpeed, volume, currentTime, duration, queue, currentQueueIndex } = state;

    const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = Number(e.target.value);
        onSeek(time);
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = Number(e.target.value);
        onVolumeChange(newVolume);
    };

    return (
        <>
            {/* Keep audio element in DOM at all times */}
            <audio
                ref={audioRef}
                onTimeUpdate={onTimeUpdate}
                onLoadedMetadata={onLoadedMetadata}
                onEnded={onEnded}
            />

            {/* Only show player UI when there's a current episode */}
            {currentEpisode && (
                <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-3 shadow-[0_-5px_15px_rgba(0,0,0,0.3)] z-30">
                    <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                        {/* Episode Info */}
                        <div className="flex items-center gap-3 w-full md:w-1/4">
                            <img
                                src={currentEpisode.podcastImageUrl}
                                alt={currentEpisode.title}
                                className="w-14 h-14 rounded-md object-cover"
                            />
                            <div className="min-w-0">
                                <h4 className="font-semibold truncate">{currentEpisode.title}</h4>
                                <p className="text-sm text-gray-400 truncate">{currentEpisode.podcastTitle}</p>
                            </div>
                        </div>

                        {/* Player Controls */}
                        <div className="flex flex-col items-center w-full md:w-1/2">
                            <div className="flex items-center space-x-4">
                                <button
                                    onClick={onPrevious}
                                    disabled={currentQueueIndex <= 0}
                                    className={`${currentQueueIndex <= 0 ? 'opacity-50 cursor-not-allowed' : 'hover:text-indigo-300'}`}
                                    title="Previous Episode"
                                >
                                    <PreviousIcon />
                                </button>

                                <button
                                    onClick={() => onSkip(-10)}
                                    title="Rewind 10s"
                                    className="hover:text-indigo-300"
                                >
                                    <RewindIcon />
                                </button>

                                <button
                                    onClick={onPlayPause}
                                    className="p-2 bg-indigo-600 rounded-full hover:bg-indigo-700 transition"
                                >
                                    {isPlaying ? <PauseIcon /> : <PlayIcon />}
                                </button>

                                <button
                                    onClick={() => onSkip(30)}
                                    title="Forward 30s"
                                    className="hover:text-indigo-300"
                                >
                                    <ForwardIcon />
                                </button>

                                <button
                                    onClick={onNext}
                                    disabled={currentQueueIndex >= queue.length - 1}
                                    className={`${currentQueueIndex >= queue.length - 1 ? 'opacity-50 cursor-not-allowed' : 'hover:text-indigo-300'}`}
                                    title="Next Episode"
                                >
                                    <NextIcon />
                                </button>
                            </div>

                            {/* Progress Bar */}
                            <div className="flex items-center gap-2 w-full mt-2">
                                <span className="text-xs w-12 text-center">{formatTime(currentTime)}</span>
                                <input
                                    type="range"
                                    min="0"
                                    max={duration || 100}
                                    value={currentTime}
                                    onChange={handleSeekChange}
                                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer range-sm accent-indigo-500"
                                />
                                <span className="text-xs w-12 text-center">{formatTime(duration)}</span>
                            </div>
                        </div>

                        {/* Volume and Speed Controls */}
                        <div className="flex items-center justify-end gap-4 w-full md:w-1/4">
                            <button
                                onClick={onSpeedChange}
                                className="font-bold text-sm w-12 h-8 rounded-md bg-gray-700 hover:bg-gray-600 transition"
                            >
                                {playbackSpeed}x
                            </button>

                            <div className="flex items-center gap-2">
                                <VolumeIcon />
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.05"
                                    value={volume}
                                    onChange={handleVolumeChange}
                                    className="w-20 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer range-sm accent-indigo-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default AudioPlayer;
