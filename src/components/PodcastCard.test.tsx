import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PodcastCard from '../components/PodcastCard'
import { Podcast } from '../types'

const mockPodcast: Podcast = {
  id: '1',
  title: 'Test Podcast',
  publisher: 'Test Publisher',
  imageUrl: 'https://example.com/image.jpg',
  feedUrl: 'https://example.com/feed.xml',
  description: 'Test description',
  episodes: [],
}

describe('PodcastCard', () => {
  it('renders podcast information correctly', () => {
    const mockOnSelect = vi.fn()

    render(<PodcastCard podcast={mockPodcast} onSelect={mockOnSelect} />)

    expect(screen.getByText('Test Podcast')).toBeInTheDocument()
    expect(screen.getByText('Test Publisher')).toBeInTheDocument()
    expect(screen.getByAltText('Test Podcast')).toBeInTheDocument()
  })

  it('calls onSelect when clicked', () => {
    const mockOnSelect = vi.fn()

    render(<PodcastCard podcast={mockPodcast} onSelect={mockOnSelect} />)

    const card = screen.getByRole('img').closest('div')
    fireEvent.click(card!)

    expect(mockOnSelect).toHaveBeenCalledWith(mockPodcast)
    expect(mockOnSelect).toHaveBeenCalledTimes(1)
  })

  it('handles image loading errors', () => {
    const mockOnSelect = vi.fn()

    render(<PodcastCard podcast={mockPodcast} onSelect={mockOnSelect} />)

    const image = screen.getByAltText('Test Podcast') as HTMLImageElement

    // Simulate image load error
    fireEvent.error(image)

    // Check if fallback image is set
    expect(image.src).toContain('placehold.co')
  })

  it('applies correct CSS classes for styling', () => {
    const mockOnSelect = vi.fn()

    render(<PodcastCard podcast={mockPodcast} onSelect={mockOnSelect} />)

    const card = screen.getByRole('img').closest('div')
    
    expect(card).toHaveClass('bg-white', 'rounded-xl', 'shadow-lg')
  })

  it('truncates long titles appropriately', () => {
    const longTitlePodcast: Podcast = {
      ...mockPodcast,
      title: 'This is a very long podcast title that should be truncated when displayed in the card component to prevent layout issues',
    }

    const mockOnSelect = vi.fn()

    render(<PodcastCard podcast={longTitlePodcast} onSelect={mockOnSelect} />)

    const titleElement = screen.getByText(longTitlePodcast.title)
    expect(titleElement).toHaveClass('line-clamp-2')
  })

  it('truncates long publisher names appropriately', () => {
    const longPublisherPodcast: Podcast = {
      ...mockPodcast,
      publisher: 'This is a very long publisher name that should be truncated',
    }

    const mockOnSelect = vi.fn()

    render(<PodcastCard podcast={longPublisherPodcast} onSelect={mockOnSelect} />)

    const publisherElement = screen.getByText(longPublisherPodcast.publisher)
    expect(publisherElement).toHaveClass('line-clamp-1')
  })
})
