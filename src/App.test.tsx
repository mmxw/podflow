import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { podcastService } from './services/podcast'

// Mock the services
vi.mock('./services/podcast', () => ({
  podcastService: {
    searchPodcasts: vi.fn(),
    fetchEpisodes: vi.fn(),
  },
}))

vi.mock('./services/localStorage', () => ({
  localStorageService: {
    loadUserData: vi.fn(() => ({
      subscribedPodcastIds: [],
      episodeProgress: {},
    })),
    saveUserData: vi.fn(),
    clearUserData: vi.fn(),
  },
}))

const mockPodcasts = [
  {
    id: '1',
    title: 'Test Podcast 1',
    publisher: 'Test Publisher 1',
    imageUrl: 'https://example.com/image1.jpg',
    feedUrl: 'https://example.com/feed1.xml',
    episodes: [],
  },
  {
    id: '2',
    title: 'Test Podcast 2',
    publisher: 'Test Publisher 2',
    imageUrl: 'https://example.com/image2.jpg',
    feedUrl: 'https://example.com/feed2.xml',
    episodes: [],
  },
]

describe('App Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default mock for podcast search
    vi.mocked(podcastService.searchPodcasts).mockResolvedValue(mockPodcasts)
  })

  it('renders the main app components', async () => {
    render(<App />)

    // Check for main header elements
    expect(screen.getByText('PodFlow')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search for podcasts...')).toBeInTheDocument()
    expect(screen.getByText('Search')).toBeInTheDocument()

    // Check for navigation
    await waitFor(() => {
      expect(screen.getByText('Explore')).toBeInTheDocument()
    })

    // Check for auth buttons (offline mode)
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument()
  })

  it('loads initial podcast content', async () => {
    render(<App />)

    // Wait for initial fetch to complete
    await waitFor(() => {
      expect(screen.getByText('Test Podcast 1')).toBeInTheDocument()
      expect(screen.getByText('Test Podcast 2')).toBeInTheDocument()
    })

    expect(podcastService.searchPodcasts).toHaveBeenCalledWith('top podcasts')
  })

  it('handles search functionality', async () => {
    const user = userEvent.setup()
    render(<App />)

    const searchInput = screen.getByPlaceholderText('Search for podcasts...')
    const searchButton = screen.getByText('Search')

    // Type in search input
    await user.type(searchInput, 'comedy podcasts')
    await user.click(searchButton)

    await waitFor(() => {
      expect(podcastService.searchPodcasts).toHaveBeenCalledWith('comedy podcasts')
    })
  })

  it('clears search and returns to explore page', async () => {
    const user = userEvent.setup()
    render(<App />)

    const searchInput = screen.getByPlaceholderText('Search for podcasts...')

    // Type in search
    await user.type(searchInput, 'test search')
    
    // Clear search
    await user.clear(searchInput)

    await waitFor(() => {
      expect(podcastService.searchPodcasts).toHaveBeenLastCalledWith('top podcasts')
    })
  })

  it('navigates between different views', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Explore')).toBeInTheDocument()
    })

    // Click Login button
    await user.click(screen.getByRole('button', { name: /login/i }))

    // Should show auth view
    await waitFor(() => {
      expect(screen.getByText(/running in offline mode/i)).toBeInTheDocument()
    })

    // Click PodFlow title to go back to explore
    await user.click(screen.getByText('PodFlow'))

    // Should be back on explore page
    await waitFor(() => {
      expect(screen.getByText('Popular Categories')).toBeInTheDocument()
    })
  })

  it('displays category buttons and handles category clicks', async () => {
    const user = userEvent.setup()
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Popular Categories')).toBeInTheDocument()
    })

    // Check for category buttons
    expect(screen.getByText('News')).toBeInTheDocument()
    expect(screen.getByText('Comedy')).toBeInTheDocument()
    expect(screen.getByText('Technology')).toBeInTheDocument()

    // Click on a category
    await user.click(screen.getByText('Comedy'))

    await waitFor(() => {
      expect(podcastService.searchPodcasts).toHaveBeenCalledWith('Comedy')
    })

    // Search input should update
    expect(screen.getByDisplayValue('Comedy')).toBeInTheDocument()
  })

  it('handles podcast selection', async () => {
    const user = userEvent.setup()
    
    // Mock fetchEpisodes
    const mockEpisodes = [
      {
        id: 'ep1',
        title: 'Test Episode 1',
        description: 'Test episode description',
        pubDate: new Date('2024-01-01'),
        audioUrl: 'https://example.com/episode1.mp3',
      },
    ]
    
    vi.mocked(podcastService.fetchEpisodes).mockResolvedValue(mockEpisodes)

    render(<App />)

    // Wait for podcasts to load
    await waitFor(() => {
      expect(screen.getByText('Test Podcast 1')).toBeInTheDocument()
    })

    // Click on a podcast
    await user.click(screen.getByText('Test Podcast 1'))

    // Should navigate to podcast detail view and fetch episodes
    await waitFor(() => {
      expect(podcastService.fetchEpisodes).toHaveBeenCalledWith(mockPodcasts[0])
    })

    // Should show episode details
    await waitFor(() => {
      expect(screen.getByText('Episodes')).toBeInTheDocument()
      expect(screen.getByText('Test Episode 1')).toBeInTheDocument()
    })
  })

  it('shows loading state', async () => {
    // Mock a delayed response
    vi.mocked(podcastService.searchPodcasts).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockPodcasts), 100))
    )

    render(<App />)

    // Should show loading state
    expect(screen.getByText('Loading Podcasts...')).toBeInTheDocument()

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText('Test Podcast 1')).toBeInTheDocument()
    }, { timeout: 200 })
  })

  it('handles API errors gracefully', async () => {
    vi.mocked(podcastService.searchPodcasts).mockRejectedValue(
      new Error('API Error: Service unavailable')
    )

    render(<App />)

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText('API Error: Service unavailable')).toBeInTheDocument()
    })
  })

  it('manages audio player state', async () => {
    render(<App />)

    // Audio player should not be visible initially
    expect(screen.queryByRole('audio')).not.toBeInTheDocument()

    // The audio element should be present in the DOM but hidden
    const audioElements = document.querySelectorAll('audio')
    expect(audioElements).toHaveLength(1)
  })

  it('handles responsive navigation', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Explore')).toBeInTheDocument()
    })

    // All main navigation should be present
    expect(screen.getByText('Explore')).toBeInTheDocument()
    
    // Login/Register buttons should be visible (offline mode)
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument()
  })

  it('handles logout functionality correctly', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Initially should show login/register buttons
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument()
    })

    // Click the header login button 
    const headerLoginButton = screen.getAllByRole('button', { name: /login/i })[0]
    await user.click(headerLoginButton)

    // Fill out login form
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Email Address')).toBeInTheDocument()
    })
    
    const emailInput = screen.getByPlaceholderText('Email Address')
    const passwordInput = screen.getByPlaceholderText('Password')

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    
    // Submit the form by pressing Enter on the password field
    await user.keyboard('{Enter}')

    // Should be logged in and show logout button
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument()
    }, { timeout: 2000 })

    // Header Login/Register buttons should not be visible when logged in
    expect(screen.queryByRole('button', { name: /login/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /register/i })).not.toBeInTheDocument()

    // Click logout
    await user.click(screen.getByRole('button', { name: /logout/i }))

    // Should return to logged out state
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument()
    })

    // Logout button should not be visible
    expect(screen.queryByRole('button', { name: /logout/i })).not.toBeInTheDocument()
  })
})
