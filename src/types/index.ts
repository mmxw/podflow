// Core data types
export interface Podcast {
    id: string;
    title: string;
    publisher: string;
    imageUrl: string;
    feedUrl: string;
    description?: string;
    episodes: Episode[];
}

export interface Episode {
    id: string;
    title: string;
    description: string;
    pubDate: Date;
    audioUrl: string;
    podcastTitle?: string;
    podcastImageUrl?: string;
}

// User and authentication types
export interface User {
    uid: string;
    email?: string;
    isAnonymous: boolean;
}

export interface UserData {
    subscribedPodcastIds: string[];
    episodeProgress: Record<string, number>;
}

// UI state types
export type ViewType = 'explore' | 'my-podcasts' | 'podcast-detail' | 'queue' | 'login' | 'register';

export type SortOrder = 'newest' | 'oldest';

// Audio player types
export interface AudioPlayerState {
    currentEpisode: Episode | null;
    isPlaying: boolean;
    playbackSpeed: number;
    volume: number;
    currentTime: number;
    duration: number;
    queue: Episode[];
    currentQueueIndex: number;
}

// App state types
export interface AppState {
    currentUser: User | null;
    isAuthReady: boolean;
    activeView: ViewType;
    podcasts: Podcast[];
    selectedPodcast: Podcast | null;
    subscribedPodcastIds: Set<string>;
    episodeProgress: Record<string, number>;
    searchTerm: string;
    loading: boolean;
    error: string | null;
    episodeSortOrder: SortOrder;
}

// Component prop types
export interface PodcastCardProps {
    podcast: Podcast;
    onSelect: (podcast: Podcast) => void;
}

export interface AuthViewProps {
    isLogin: boolean;
    onSuccess: () => void;
    onError: (error: string) => void;
}

export interface AudioPlayerProps {
    state: AudioPlayerState;
    onPlayPause: () => void;
    onSeek: (time: number) => void;
    onVolumeChange: (volume: number) => void;
    onSpeedChange: (speed: number) => void;
    onNext: () => void;
    onPrevious: () => void;
    onSkip: (amount: number) => void;
}
