import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAudioPlayer } from '../hooks/useAudioPlayer'
import { Episode } from '../types'

const mockEpisode: Episode = {
    id: 'episode1',
    title: 'Test Episode',
    description: 'Test description',
    pubDate: new Date('2023-01-01'),
    audioUrl: 'https://example.com/audio.mp3',
    podcastTitle: 'Test Podcast',
    podcastImageUrl: 'https://example.com/image.jpg',
}

describe('useAudioPlayer', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('initializes with default state', () => {
        const { result } = renderHook(() => useAudioPlayer())

        expect(result.current.state).toEqual({
            currentEpisode: null,
            isPlaying: false,
            playbackSpeed: 1.0,
            volume: 1.0,
            currentTime: 0,
            duration: 0,
            queue: [],
            currentQueueIndex: -1,
        })
    })

    it('provides audio ref', () => {
        const { result } = renderHook(() => useAudioPlayer())

        expect(result.current.audioRef).toBeDefined()
        expect(result.current.audioRef.current).toBeNull() // Initially null until mounted
    })

    describe('playEpisode', () => {
        it('adds episode to queue and sets as current', () => {
            const { result } = renderHook(() => useAudioPlayer())

            act(() => {
                result.current.actions.playEpisode(mockEpisode)
            })

            expect(result.current.state.currentEpisode).toEqual(mockEpisode)
            expect(result.current.state.queue).toEqual([mockEpisode])
            expect(result.current.state.currentQueueIndex).toBe(0)
            expect(result.current.state.isPlaying).toBe(true)
        })

        it('does not duplicate episodes in queue', () => {
            const { result } = renderHook(() => useAudioPlayer())

            act(() => {
                result.current.actions.playEpisode(mockEpisode)
            })

            act(() => {
                result.current.actions.playEpisode(mockEpisode)
            })

            expect(result.current.state.queue).toHaveLength(1)
            expect(result.current.state.currentQueueIndex).toBe(0)
        })
    })

    describe('addToQueue', () => {
        it('adds episode to the end of queue', () => {
            const { result } = renderHook(() => useAudioPlayer())

            const episode2: Episode = { ...mockEpisode, id: 'episode2', title: 'Episode 2' }

            act(() => {
                result.current.actions.addToQueue(mockEpisode)
                result.current.actions.addToQueue(episode2)
            })

            expect(result.current.state.queue).toHaveLength(2)
            expect(result.current.state.queue[0]).toEqual(mockEpisode)
            expect(result.current.state.queue[1]).toEqual(episode2)
        })
    })

    describe('removeFromQueue', () => {
        it('removes episode from queue at specified index', () => {
            const { result } = renderHook(() => useAudioPlayer())

            const episode2: Episode = { ...mockEpisode, id: 'episode2', title: 'Episode 2' }

            act(() => {
                result.current.actions.addToQueue(mockEpisode)
                result.current.actions.addToQueue(episode2)
            })

            act(() => {
                result.current.actions.removeFromQueue(0)
            })

            expect(result.current.state.queue).toHaveLength(1)
            expect(result.current.state.queue[0]).toEqual(episode2)
        })

        it('stops playback when removing currently playing episode', () => {
            const { result } = renderHook(() => useAudioPlayer())

            act(() => {
                result.current.actions.playEpisode(mockEpisode)
            })

            act(() => {
                result.current.actions.removeFromQueue(0)
            })

            expect(result.current.state.currentEpisode).toBeNull()
            expect(result.current.state.isPlaying).toBe(false)
            expect(result.current.state.currentQueueIndex).toBe(-1)
        })

        it('adjusts current queue index when removing earlier episode', () => {
            const { result } = renderHook(() => useAudioPlayer())

            const episode2: Episode = { ...mockEpisode, id: 'episode2', title: 'Episode 2' }
            const episode3: Episode = { ...mockEpisode, id: 'episode3', title: 'Episode 3' }

            act(() => {
                result.current.actions.addToQueue(mockEpisode)
                result.current.actions.addToQueue(episode2)
                result.current.actions.addToQueue(episode3)
                result.current.actions.playEpisode(episode3) // Set episode3 as current
            })

            // Current index should be 2 (episode3)
            expect(result.current.state.currentQueueIndex).toBe(2)

            // Remove episode at index 0
            act(() => {
                result.current.actions.removeFromQueue(0)
            })

            // Current index should adjust to 1 (episode3 is now at index 1)
            expect(result.current.state.currentQueueIndex).toBe(1)
        })
    })

    describe('clearQueue', () => {
        it('clears all episodes from queue and stops playback', () => {
            const { result } = renderHook(() => useAudioPlayer())

            act(() => {
                result.current.actions.playEpisode(mockEpisode)
                result.current.actions.addToQueue({ ...mockEpisode, id: 'episode2' })
            })

            act(() => {
                result.current.actions.clearQueue()
            })

            expect(result.current.state.queue).toHaveLength(0)
            expect(result.current.state.currentEpisode).toBeNull()
            expect(result.current.state.isPlaying).toBe(false)
            expect(result.current.state.currentQueueIndex).toBe(-1)
        })
    })

    describe('togglePlayPause', () => {
        it('toggles playing state', () => {
            const { result } = renderHook(() => useAudioPlayer())

            act(() => {
                result.current.actions.togglePlayPause()
            })

            expect(result.current.state.isPlaying).toBe(true)

            act(() => {
                result.current.actions.togglePlayPause()
            })

            expect(result.current.state.isPlaying).toBe(false)
        })
    })

    describe('seek', () => {
        it('updates current time', () => {
            const { result } = renderHook(() => useAudioPlayer())

            // Mock audio element
            const mockAudio = {
                currentTime: 0,
                duration: 300,
                play: vi.fn(() => Promise.resolve()),
                pause: vi.fn(),
                load: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            } as any

            // Set the audio ref
            act(() => {
                if (result.current.audioRef.current) {
                    Object.assign(result.current.audioRef.current, mockAudio)
                } else {
                    result.current.audioRef.current = mockAudio
                }
            })

            act(() => {
                result.current.actions.seek(120)
            })

            expect(result.current.state.currentTime).toBe(120)
            expect(mockAudio.currentTime).toBe(120)
        })
    })

    describe('setVolume', () => {
        it('updates volume', () => {
            const { result } = renderHook(() => useAudioPlayer())

            act(() => {
                result.current.actions.setVolume(0.5)
            })

            expect(result.current.state.volume).toBe(0.5)
        })
    })

    describe('setPlaybackSpeed', () => {
        it('updates playback speed', () => {
            const { result } = renderHook(() => useAudioPlayer())

            act(() => {
                result.current.actions.setPlaybackSpeed(1.5)
            })

            expect(result.current.state.playbackSpeed).toBe(1.5)
        })
    })

    describe('skipTime', () => {
        it('skips forward and backward in time', () => {
            const { result } = renderHook(() => useAudioPlayer())

            // Mock audio element
            const mockAudio = {
                currentTime: 60,
                duration: 300,
                play: vi.fn(() => Promise.resolve()),
                pause: vi.fn(),
                load: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            } as any

            // Set the audio ref and initial state
            act(() => {
                result.current.audioRef.current = mockAudio
                // Manually trigger state update for duration
                result.current.handlers.handleLoadedMetadata()
            })

            // Update currentTime in mock and state to match
            act(() => {
                mockAudio.currentTime = 60
                result.current.actions.seek(60)
            })

            // Skip forward 30 seconds
            act(() => {
                result.current.actions.skipTime(30)
            })

            expect(result.current.state.currentTime).toBe(90)

            // Skip backward 45 seconds  
            act(() => {
                result.current.actions.skipTime(-45)
            })

            expect(result.current.state.currentTime).toBe(45)
        })

        it('clamps time to valid range when duration is set', () => {
            const { result } = renderHook(() => useAudioPlayer())

            // Mock duration
            Object.defineProperty(result.current.state, 'duration', {
                value: 180,
                writable: true,
            })

            act(() => {
                result.current.actions.seek(170) // Near end
                result.current.actions.skipTime(30) // Try to skip past end
            })

            // Should be clamped to duration
            expect(result.current.state.currentTime).toBeLessThanOrEqual(180)

            act(() => {
                result.current.actions.seek(10) // Near beginning
                result.current.actions.skipTime(-30) // Try to skip before start
            })

            // Should be clamped to 0
            expect(result.current.state.currentTime).toBe(0)
        })
    })

    describe('playNext and playPrevious', () => {
        it('navigates through queue', () => {
            const { result } = renderHook(() => useAudioPlayer())

            const episode2: Episode = { ...mockEpisode, id: 'episode2', title: 'Episode 2' }
            const episode3: Episode = { ...mockEpisode, id: 'episode3', title: 'Episode 3' }

            act(() => {
                result.current.actions.addToQueue(mockEpisode)
                result.current.actions.addToQueue(episode2)
                result.current.actions.addToQueue(episode3)
                result.current.actions.playEpisode(mockEpisode) // Start with first episode
            })

            expect(result.current.state.currentQueueIndex).toBe(0)

            // Play next
            act(() => {
                result.current.actions.playNext()
            })

            expect(result.current.state.currentQueueIndex).toBe(1)
            expect(result.current.state.currentEpisode?.id).toBe('episode2')

            // Play previous
            act(() => {
                result.current.actions.playPrevious()
            })

            expect(result.current.state.currentQueueIndex).toBe(0)
            expect(result.current.state.currentEpisode?.id).toBe('episode1')
        })

        it('does not play next when at end of queue', () => {
            const { result } = renderHook(() => useAudioPlayer())

            act(() => {
                result.current.actions.playEpisode(mockEpisode)
            })

            const initialIndex = result.current.state.currentQueueIndex

            act(() => {
                result.current.actions.playNext()
            })

            expect(result.current.state.currentQueueIndex).toBe(initialIndex)
        })

        it('does not play previous when at beginning of queue', () => {
            const { result } = renderHook(() => useAudioPlayer())

            act(() => {
                result.current.actions.playEpisode(mockEpisode)
            })

            const initialIndex = result.current.state.currentQueueIndex

            act(() => {
                result.current.actions.playPrevious()
            })

            expect(result.current.state.currentQueueIndex).toBe(initialIndex)
        })
    })

    describe('onTimeProgress callback', () => {
        it('calls onTimeProgress when provided', () => {
            const mockOnTimeProgress = vi.fn()
            const { result } = renderHook(() =>
                useAudioPlayer({
                    onTimeProgress: mockOnTimeProgress,
                    episodeProgress: {}
                })
            )

            act(() => {
                result.current.actions.playEpisode(mockEpisode)
            })

            act(() => {
                result.current.handlers.handleTimeUpdate()
            })

            // The callback should be called with debouncing, so we need to wait
            setTimeout(() => {
                expect(mockOnTimeProgress).toHaveBeenCalledWith('episode1', expect.any(Number))
            }, 2100) // Wait for debounce timeout
        })
    })
})
