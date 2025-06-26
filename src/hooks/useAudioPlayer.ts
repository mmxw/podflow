import { useState, useRef, useCallback, useEffect } from 'react';
import { Episode, AudioPlayerState } from '../types';

interface UseAudioPlayerOptions {
    onTimeProgress?: (episodeId: string, time: number) => void;
    episodeProgress?: Record<string, number>;
}

export const useAudioPlayer = ({ onTimeProgress, episodeProgress = {} }: UseAudioPlayerOptions = {}) => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const debouncedUpdateTimeRef = useRef<NodeJS.Timeout>();

    const [state, setState] = useState<AudioPlayerState>({
        currentEpisode: null,
        isPlaying: false,
        playbackSpeed: 1.0,
        volume: 1.0,
        currentTime: 0,
        duration: 0,
        queue: [],
        currentQueueIndex: -1,
    });

    // Update time progress with debouncing
    const updateTimeProgress = useCallback((episodeId: string, time: number) => {
        if (!episodeId || !onTimeProgress) return;

        clearTimeout(debouncedUpdateTimeRef.current);
        debouncedUpdateTimeRef.current = setTimeout(() => {
            onTimeProgress(episodeId, time);
        }, 2000);
    }, [onTimeProgress]);

    // Audio event handlers
    const handleTimeUpdate = useCallback(() => {
        if (!audioRef.current || !state.currentEpisode) return;

        const time = audioRef.current.currentTime;
        setState(prev => ({ ...prev, currentTime: time }));
        updateTimeProgress(state.currentEpisode.id, time);
    }, [state.currentEpisode, updateTimeProgress]);

    const handleLoadedMetadata = useCallback(() => {
        if (audioRef.current) {
            setState(prev => ({ ...prev, duration: audioRef.current!.duration }));
        }
    }, []);

    const handleEnded = useCallback(() => {
        setState(prev => ({ ...prev, isPlaying: false }));
        // Auto-play next episode in queue
        if (state.currentQueueIndex < state.queue.length - 1) {
            playNext();
        }
    }, [state.currentQueueIndex, state.queue.length]);

    // Control functions
    const playEpisode = useCallback((episode: Episode) => {
        const episodeWithMeta = { ...episode };

        setState(prev => {
            const existingQueueIndex = prev.queue.findIndex(q => q.id === episode.id);
            if (existingQueueIndex !== -1) {
                return {
                    ...prev,
                    currentEpisode: episodeWithMeta,
                    currentQueueIndex: existingQueueIndex,
                    isPlaying: true
                };
            } else {
                const newQueueIndex = prev.queue.length;
                return {
                    ...prev,
                    currentEpisode: episodeWithMeta,
                    queue: [...prev.queue, episodeWithMeta],
                    currentQueueIndex: newQueueIndex,
                    isPlaying: true
                };
            }
        });

        if (audioRef.current) {
            const audio = audioRef.current;
            audio.src = '';
            audio.load();
            audio.src = episode.audioUrl;

            const handleLoadedMetadata = () => {
                const savedTime = episodeProgress[episode.id] || 0;
                if (audio) {
                    audio.currentTime = savedTime;
                    audio.play().catch(e => {
                        console.error("Autoplay failed:", e);
                        setState(prev => ({ ...prev, isPlaying: false }));
                    });
                }
            };

            const handleError = (e: Event) => {
                console.error("Audio load error:", e);
                setState(prev => ({ ...prev, isPlaying: false }));
            };

            audio.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
            audio.addEventListener('error', handleError, { once: true });
            audio.load();
        }
    }, [episodeProgress]);

    const addToQueue = useCallback((episode: Episode) => {
        setState(prev => ({
            ...prev,
            queue: [...prev.queue, episode]
        }));
    }, []);

    const removeFromQueue = useCallback((index: number) => {
        setState(prev => {
            const newQueue = prev.queue.filter((_, i) => i !== index);
            let newCurrentQueueIndex = prev.currentQueueIndex;
            let newCurrentEpisode = prev.currentEpisode;
            let newIsPlaying = prev.isPlaying;

            if (index < prev.currentQueueIndex) {
                newCurrentQueueIndex = prev.currentQueueIndex - 1;
            } else if (index === prev.currentQueueIndex) {
                newIsPlaying = false;
                newCurrentEpisode = null;
                newCurrentQueueIndex = -1;
            }

            return {
                ...prev,
                queue: newQueue,
                currentQueueIndex: newCurrentQueueIndex,
                currentEpisode: newCurrentEpisode,
                isPlaying: newIsPlaying
            };
        });
    }, []);

    const playNext = useCallback(() => {
        if (state.currentQueueIndex < state.queue.length - 1) {
            const nextIndex = state.currentQueueIndex + 1;
            const nextEpisode = state.queue[nextIndex];
            playEpisode(nextEpisode);
        }
    }, [state.currentQueueIndex, state.queue, playEpisode]);

    const playPrevious = useCallback(() => {
        if (state.currentQueueIndex > 0) {
            const prevIndex = state.currentQueueIndex - 1;
            const prevEpisode = state.queue[prevIndex];
            playEpisode(prevEpisode);
        }
    }, [state.currentQueueIndex, state.queue, playEpisode]);

    const togglePlayPause = useCallback(() => {
        setState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
    }, []);

    const seek = useCallback((time: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            setState(prev => ({ ...prev, currentTime: time }));
        }
    }, []);

    const skipTime = useCallback((amount: number) => {
        if (audioRef.current && state.duration) {
            const newTime = Math.max(0, Math.min(state.duration, audioRef.current.currentTime + amount));
            seek(newTime);
        }
    }, [state.duration, seek]);

    const setVolume = useCallback((volume: number) => {
        setState(prev => ({ ...prev, volume }));
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, []);

    const setPlaybackSpeed = useCallback((speed: number) => {
        setState(prev => ({ ...prev, playbackSpeed: speed }));
        if (audioRef.current) {
            audioRef.current.playbackRate = speed;
        }
    }, []);

    const clearQueue = useCallback(() => {
        setState(prev => ({
            ...prev,
            queue: [],
            currentQueueIndex: -1,
            currentEpisode: null,
            isPlaying: false
        }));
    }, []);

    // Effects
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.playbackRate = state.playbackSpeed;
            audioRef.current.volume = state.volume;
        }
    }, [state.playbackSpeed, state.volume]);

    useEffect(() => {
        if (audioRef.current) {
            if (state.isPlaying && state.currentEpisode) {
                if (audioRef.current.src.includes(state.currentEpisode.audioUrl) && audioRef.current.readyState >= 2) {
                    audioRef.current.play().catch(e => {
                        console.error("Play failed:", e);
                        setState(prev => ({ ...prev, isPlaying: false }));
                    });
                }
            } else if (!state.isPlaying) {
                audioRef.current.pause();
            }
        }
    }, [state.isPlaying, state.currentEpisode]);

    // Sync with actual audio state
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handlePlay = () => setState(prev => ({ ...prev, isPlaying: true }));
        const handlePause = () => setState(prev => ({ ...prev, isPlaying: false }));

        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);

        return () => {
            audio.removeEventListener('play', handlePlay);
            audio.removeEventListener('pause', handlePause);
        };
    }, []);

    return {
        audioRef,
        state,
        actions: {
            playEpisode,
            addToQueue,
            removeFromQueue,
            playNext,
            playPrevious,
            togglePlayPause,
            seek,
            skipTime,
            setVolume,
            setPlaybackSpeed,
            clearQueue,
        },
        handlers: {
            handleTimeUpdate,
            handleLoadedMetadata,
            handleEnded,
        }
    };
};
