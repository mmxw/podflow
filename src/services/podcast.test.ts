import { describe, it, expect, vi, beforeEach } from 'vitest'
import { podcastService } from '../services/podcast'

// Mock fetch
const mockFetch = vi.mocked(fetch)

describe('PodcastService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('searchPodcasts', () => {
    it('searches for podcasts and returns formatted results', async () => {
      const mockResponse = {
        results: [
          {
            collectionId: 123456,
            collectionName: 'Test Podcast',
            artistName: 'Test Artist',
            artworkUrl600: 'https://example.com/artwork.jpg',
            feedUrl: 'https://example.com/feed.xml',
          },
          {
            collectionId: 789012,
            collectionName: 'Another Podcast',
            artistName: 'Another Artist',
            artworkUrl600: 'https://example.com/artwork2.jpg',
            feedUrl: 'https://example.com/feed2.xml',
          },
        ],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const result = await podcastService.searchPodcasts('test query')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://itunes.apple.com/search?term=test%20query&entity=podcast&limit=20'
      )

      expect(result).toEqual([
        {
          id: '123456',
          title: 'Test Podcast',
          publisher: 'Test Artist',
          imageUrl: 'https://example.com/artwork.jpg',
          feedUrl: 'https://example.com/feed.xml',
          episodes: [],
        },
        {
          id: '789012',
          title: 'Another Podcast',
          publisher: 'Another Artist',
          imageUrl: 'https://example.com/artwork2.jpg',
          feedUrl: 'https://example.com/feed2.xml',
          episodes: [],
        },
      ])
    })

    it('handles API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      } as Response)

      await expect(podcastService.searchPodcasts('test query')).rejects.toThrow(
        'Failed to fetch podcasts: iTunes API Error: Internal Server Error'
      )
    })

    it('handles network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(podcastService.searchPodcasts('test query')).rejects.toThrow(
        'Failed to fetch podcasts: Network error'
      )
    })

    it('properly encodes search query', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      } as Response)

      await podcastService.searchPodcasts('test & special chars')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://itunes.apple.com/search?term=test%20%26%20special%20chars&entity=podcast&limit=20'
      )
    })
  })

  describe('fetchEpisodes', () => {
    const mockPodcast = {
      id: '1',
      title: 'Test Podcast',
      publisher: 'Test Publisher',
      imageUrl: 'https://example.com/image.jpg',
      feedUrl: 'https://example.com/feed.xml',
      episodes: [],
    }

    it('fetches and parses RSS feed episodes', async () => {
      const mockRSSData = `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <title>Test Podcast</title>
            <item>
              <title>Episode 1</title>
              <description><![CDATA[<p>This is the first episode</p>]]></description>
              <pubDate>Mon, 01 Jan 2024 12:00:00 GMT</pubDate>
              <guid>episode-1</guid>
              <enclosure url="https://example.com/episode1.mp3" type="audio/mpeg" length="12345"/>
            </item>
            <item>
              <title>Episode 2</title>
              <description>This is the second episode</description>
              <pubDate>Mon, 08 Jan 2024 12:00:00 GMT</pubDate>
              <guid>episode-2</guid>
              <enclosure url="https://example.com/episode2.mp3" type="audio/mpeg" length="23456"/>
            </item>
          </channel>
        </rss>`

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockRSSData,
      } as Response)

      const result = await podcastService.fetchEpisodes(mockPodcast)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://corsproxy.io/?https%3A%2F%2Fexample.com%2Ffeed.xml'
      )

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        id: 'episode-1',
        title: 'Episode 1',
        description: 'This is the first episode',
        pubDate: new Date('Mon, 01 Jan 2024 12:00:00 GMT'),
        audioUrl: 'https://example.com/episode1.mp3',
      })
      expect(result[1]).toEqual({
        id: 'episode-2',
        title: 'Episode 2',
        description: 'This is the second episode',
        pubDate: new Date('Mon, 08 Jan 2024 12:00:00 GMT'),
        audioUrl: 'https://example.com/episode2.mp3',
      })
    })

    it('filters out episodes without audio URLs', async () => {
      const mockRSSData = `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <item>
              <title>Episode 1</title>
              <description>Episode with audio</description>
              <enclosure url="https://example.com/episode1.mp3" type="audio/mpeg"/>
            </item>
            <item>
              <title>Episode 2</title>
              <description>Episode without audio</description>
            </item>
          </channel>
        </rss>`

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockRSSData,
      } as Response)

      const result = await podcastService.fetchEpisodes(mockPodcast)

      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Episode 1')
    })

    it('handles malformed RSS gracefully', async () => {
      const invalidRSS = 'This is not valid XML'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => invalidRSS,
      } as Response)

      await expect(podcastService.fetchEpisodes(mockPodcast)).rejects.toThrow(
        /Failed to load episodes.*RSS feed may be invalid/
      )
    })

    it('handles RSS fetch errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      } as Response)

      await expect(podcastService.fetchEpisodes(mockPodcast)).rejects.toThrow(
        'Failed to load episodes. The RSS feed may be invalid or unavailable. (RSS Feed Error: Not Found)'
      )
    })

    it('handles missing feed URL', async () => {
      const podcastWithoutFeed = {
        ...mockPodcast,
        feedUrl: '',
      }

      await expect(podcastService.fetchEpisodes(podcastWithoutFeed)).rejects.toThrow(
        'This podcast does not have a valid RSS feed.'
      )
    })

    it('provides fallback values for missing episode data', async () => {
      const mockRSSData = `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <item>
              <!-- Episode with minimal data -->
              <enclosure url="https://example.com/episode.mp3" type="audio/mpeg"/>
            </item>
          </channel>
        </rss>`

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockRSSData,
      } as Response)

      const result = await podcastService.fetchEpisodes(mockPodcast)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        id: 'https://example.com/episode.mp3', // Falls back to audioUrl
        title: 'Untitled Episode',
        description: 'No description available.',
        pubDate: expect.any(Date),
        audioUrl: 'https://example.com/episode.mp3',
      })
    })

    it('strips HTML from episode descriptions', async () => {
      const mockRSSData = `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <item>
              <title>Episode 1</title>
              <description><![CDATA[<p>This has <strong>HTML</strong> tags</p>]]></description>
              <enclosure url="https://example.com/episode1.mp3" type="audio/mpeg"/>
            </item>
          </channel>
        </rss>`

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockRSSData,
      } as Response)

      const result = await podcastService.fetchEpisodes(mockPodcast)

      expect(result[0].description).toBe('This has HTML tags')
    })
  })
})
