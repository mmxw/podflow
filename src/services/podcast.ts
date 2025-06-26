import { Podcast, Episode } from '../types';
import { stripHtml } from '../utils';

const ITUNES_SEARCH_API_URL = 'https://itunes.apple.com/search';
const CORS_PROXY_URL = 'https://corsproxy.io/?';

class PodcastService {
    public async searchPodcasts(query: string): Promise<Podcast[]> {
        try {
            const response = await fetch(
                `${ITUNES_SEARCH_API_URL}?term=${encodeURIComponent(query)}&entity=podcast&limit=20`
            );

            if (!response.ok) {
                throw new Error(`iTunes API Error: ${response.statusText}`);
            }

            const data = await response.json();

            return data.results.map((p: any) => ({
                id: p.collectionId.toString(),
                title: p.collectionName,
                publisher: p.artistName,
                imageUrl: p.artworkUrl600,
                feedUrl: p.feedUrl,
                episodes: [] // Episodes fetched on demand
            }));
        } catch (error) {
            console.error('API Fetch Error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to fetch podcasts: ${errorMessage}`);
        }
    }

    public async fetchEpisodes(podcast: Podcast): Promise<Episode[]> {
        if (!podcast.feedUrl) {
            throw new Error("This podcast does not have a valid RSS feed.");
        }

        try {
            const response = await fetch(`${CORS_PROXY_URL}${encodeURIComponent(podcast.feedUrl)}`);

            if (!response.ok) {
                throw new Error(`RSS Feed Error: ${response.statusText}`);
            }

            const rssData = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(rssData, "text/xml");

            // Check for parsing errors
            const parserError = xmlDoc.querySelector('parsererror');
            if (parserError) {
                throw new Error('RSS feed contains invalid XML');
            }

            const items = Array.from(xmlDoc.querySelectorAll('item'));

            const episodes = items.map(item => {
                const audioUrl = item.querySelector('enclosure')?.getAttribute('url');
                const pubDateText = item.querySelector('pubDate')?.textContent;

                return {
                    id: item.querySelector('guid')?.textContent || audioUrl || Math.random().toString(),
                    title: item.querySelector('title')?.textContent || 'Untitled Episode',
                    description: stripHtml(item.querySelector('description')?.textContent || 'No description available.'),
                    pubDate: pubDateText ? new Date(pubDateText) : new Date(),
                    audioUrl: audioUrl!,
                };
            }).filter(ep => ep.audioUrl);

            return episodes;
        } catch (error) {
            console.error("Error fetching episodes:", error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to load episodes. The RSS feed may be invalid or unavailable. (${errorMessage})`);
        }
    }
}

export const podcastService = new PodcastService();
