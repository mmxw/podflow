import { describe, it, expect, beforeEach, vi } from 'vitest'
import { localStorageService } from '../services/localStorage'

describe('LocalStorageService', () => {
    beforeEach(() => {
        // Clear all mocks before each test
        vi.clearAllMocks()
        localStorage.clear()
    })

    describe('saveUserData', () => {
        it('saves subscription data to localStorage', () => {
            const testData = {
                subscribedPodcastIds: ['podcast1', 'podcast2'],
            }

            localStorageService.saveUserData(testData)

            expect(localStorage.setItem).toHaveBeenCalledWith(
                'podflow-subscriptions',
                JSON.stringify(['podcast1', 'podcast2'])
            )
        })

        it('saves episode progress data to localStorage', () => {
            const testData = {
                episodeProgress: { 'episode1': 120, 'episode2': 300 },
            }

            localStorageService.saveUserData(testData)

            expect(localStorage.setItem).toHaveBeenCalledWith(
                'podflow-progress',
                JSON.stringify({ 'episode1': 120, 'episode2': 300 })
            )
        })

        it('saves both subscription and progress data', () => {
            const testData = {
                subscribedPodcastIds: ['podcast1'],
                episodeProgress: { 'episode1': 120 },
            }

            localStorageService.saveUserData(testData)

            expect(localStorage.setItem).toHaveBeenCalledTimes(2)
            expect(localStorage.setItem).toHaveBeenCalledWith(
                'podflow-subscriptions',
                JSON.stringify(['podcast1'])
            )
            expect(localStorage.setItem).toHaveBeenCalledWith(
                'podflow-progress',
                JSON.stringify({ 'episode1': 120 })
            )
        })

        it('handles localStorage errors gracefully', () => {
            // Mock localStorage.setItem to throw an error
            vi.mocked(localStorage.setItem).mockImplementation(() => {
                throw new Error('Storage quota exceeded')
            })

            const testData = {
                subscribedPodcastIds: ['podcast1'],
            }

            expect(() => localStorageService.saveUserData(testData)).toThrow(
                'Your changes could not be saved locally.'
            )
        })
    })

    describe('loadUserData', () => {
        it('loads data from localStorage successfully', () => {
            // Mock localStorage.getItem to return test data
            vi.mocked(localStorage.getItem).mockImplementation((key: string) => {
                if (key === 'podflow-subscriptions') {
                    return JSON.stringify(['podcast1', 'podcast2'])
                }
                if (key === 'podflow-progress') {
                    return JSON.stringify({ 'episode1': 120 })
                }
                return null
            })

            const result = localStorageService.loadUserData()

            expect(result).toEqual({
                subscribedPodcastIds: ['podcast1', 'podcast2'],
                episodeProgress: { 'episode1': 120 },
            })
        })

        it('returns empty data when localStorage is empty', () => {
            vi.mocked(localStorage.getItem).mockReturnValue(null)

            const result = localStorageService.loadUserData()

            expect(result).toEqual({
                subscribedPodcastIds: [],
                episodeProgress: {},
            })
        })

        it('handles corrupted localStorage data gracefully', () => {
            // Mock localStorage.getItem to return invalid JSON
            vi.mocked(localStorage.getItem).mockReturnValue('invalid json')

            const result = localStorageService.loadUserData()

            // Should return empty data when JSON parsing fails
            expect(result).toEqual({
                subscribedPodcastIds: [],
                episodeProgress: {},
            })
        })
    })

    describe('clearUserData', () => {
        it('removes both subscription and progress data from localStorage', () => {
            localStorageService.clearUserData()

            expect(localStorage.removeItem).toHaveBeenCalledWith('podflow-subscriptions')
            expect(localStorage.removeItem).toHaveBeenCalledWith('podflow-progress')
            expect(localStorage.removeItem).toHaveBeenCalledTimes(2)
        })
    })
})
