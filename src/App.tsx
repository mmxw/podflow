import React, { useState, useEffect, useCallback } from 'react';
import {
    ViewType,
    Podcast,
    Episode,
    User,
    SortOrder
} from './types';
import {
    PodcastCard,
    AuthView,
    AudioPlayer,
    PlayIcon,
    PlusIcon
} from './components';
import {
    podcastService,
    localStorageService
} from './services';
import { useAudioPlayer } from './hooks';
import { formatTime } from './utils';

// Header component props interface
interface HeaderProps {
    searchTerm: string;
    onSearchTermChange: (term: string) => void;
    onSearch: (e: React.FormEvent) => void;
    onNavigateToExplore: () => void;
    onNavigateToLogin: () => void;
    onNavigateToRegister: () => void;
    onSignOut: () => void;
    currentUser: User | null;
    isAuthReady: boolean;
}

const Header = React.memo<HeaderProps>(({ 
    searchTerm, 
    onSearchTermChange, 
    onSearch, 
    onNavigateToExplore,
    onNavigateToLogin,
    onNavigateToRegister,
    onSignOut,
    currentUser, 
    isAuthReady 
}) => (
    <header className="bg-gradient-to-r from-purple-700 to-indigo-800 text-white p-4 shadow-lg fixed top-0 w-full z-20">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <h1
                className="text-3xl font-extrabold tracking-tight cursor-pointer"
                onClick={onNavigateToExplore}
            >
                PodFlow
            </h1>

            <form onSubmit={onSearch} className="w-full sm:w-1/2 flex">
                <input
                    type="search"
                    placeholder="Search for podcasts..."
                    className="w-full p-2 rounded-l-md border-0 text-gray-800 focus:ring-2 focus:ring-purple-400 focus:outline-none transition"
                    value={searchTerm}
                    onChange={(e) => onSearchTermChange(e.target.value)}
                />
                <button
                    type="submit"
                    className="bg-indigo-500 hover:bg-indigo-600 px-4 rounded-r-md font-semibold transition"
                >
                    Search
                </button>
            </form>

            <div>
                {isAuthReady && (
                    currentUser && !currentUser.isAnonymous ? (
                        <button
                            onClick={onSignOut}
                            className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md transition"
                        >
                            Logout
                        </button>
                    ) : (
                        <div className="flex space-x-2">
                            <button
                                onClick={onNavigateToLogin}
                                className="bg-indigo-500 hover:bg-indigo-600 font-semibold py-2 px-4 rounded-md transition"
                            >
                                Login
                            </button>
                            <button
                                onClick={onNavigateToRegister}
                                className="bg-green-600 hover:bg-green-700 font-semibold py-2 px-4 rounded-md transition"
                            >
                                Register
                            </button>
                        </div>
                    )
                )}
            </div>
        </div>
    </header>
));

// Main App component
const App: React.FC = () => {
    // Authentication state
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isAuthReady, setIsAuthReady] = useState(false);

    // UI state
    const [activeView, setActiveView] = useState<ViewType>('explore');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Data state
    const [podcasts, setPodcasts] = useState<Podcast[]>([]);
    const [selectedPodcast, setSelectedPodcast] = useState<Podcast | null>(null);
    const [subscribedPodcastIds, setSubscribedPodcastIds] = useState<Set<string>>(new Set());
    const [episodeProgress, setEpisodeProgress] = useState<Record<string, number>>({});
    const [episodeSortOrder, setEpisodeSortOrder] = useState<SortOrder>('newest');

    // Audio player with debounced progress updates
    const updateTimeProgress = useCallback((episodeId: string, time: number) => {
        if (!currentUser || !episodeId) return;

        const newProgress = { ...episodeProgress, [episodeId]: time };
        setEpisodeProgress(newProgress);

        // Update localStorage
        localStorageService.saveUserData({ episodeProgress: newProgress });
    }, [currentUser, episodeProgress]);

    const audioPlayer = useAudioPlayer({
        onTimeProgress: updateTimeProgress,
        episodeProgress
    });

    // Authentication effects
    useEffect(() => {
        // Simple offline mode - create a default user
        setCurrentUser({
            uid: 'offline-user',
            isAnonymous: false,
            email: 'offline@podflow.com'
        });
        setIsAuthReady(true);
    }, []);

    // User data syncing
    useEffect(() => {
        if (!isAuthReady || !currentUser || currentUser.isAnonymous) {
            setSubscribedPodcastIds(new Set());
            setEpisodeProgress({});
            return;
        }

        // Load data from localStorage
        const data = localStorageService.loadUserData();
        setSubscribedPodcastIds(new Set(data.subscribedPodcastIds));
        setEpisodeProgress(data.episodeProgress);
    }, [isAuthReady, currentUser]);

    // Data operations
    const fetchPodcasts = useCallback(async (query: string) => {
        setLoading(true);
        setError(null);

        try {
            const fetchedPodcasts = await podcastService.searchPodcasts(query);
            setPodcasts(fetchedPodcasts);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchEpisodes = useCallback(async (podcast: Podcast): Promise<Podcast> => {
        if (podcast.episodes && podcast.episodes.length > 0) return podcast;

        setLoading(true);
        try {
            const episodes = await podcastService.fetchEpisodes(podcast);
            const updatedPodcast = { ...podcast, episodes };

            setPodcasts(prev => prev.map(p => p.id === updatedPodcast.id ? updatedPodcast : p));
            return updatedPodcast;
        } catch (err: any) {
            setError(err.message);
            return podcast;
        } finally {
            setLoading(false);
        }
    }, []);

    const toggleSubscription = useCallback((podcastId: string) => {
        if (!currentUser || currentUser.isAnonymous) {
            setActiveView('login');
            return;
        }

        const newSubscribedIds = new Set(subscribedPodcastIds);
        if (newSubscribedIds.has(podcastId)) {
            newSubscribedIds.delete(podcastId);
        } else {
            newSubscribedIds.add(podcastId);
        }

        setSubscribedPodcastIds(newSubscribedIds);

        const subscribedArray = Array.from(newSubscribedIds);
        localStorageService.saveUserData({ subscribedPodcastIds: subscribedArray });
    }, [currentUser, subscribedPodcastIds]);

    // Event handlers
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            fetchPodcasts(searchTerm.trim());
        }
    };

    const handleCategoryClick = (category: string) => {
        setSearchTerm(category);
        fetchPodcasts(category);
        setActiveView('explore');
    };

    const handlePodcastSelect = async (podcast: Podcast) => {
        const podcastWithEpisodes = await fetchEpisodes(podcast);
        setSelectedPodcast(podcastWithEpisodes);
        setActiveView('podcast-detail');
    };

    const handlePlayEpisode = (podcast: Podcast, episode: Episode) => {
        const episodeWithMeta = {
            ...episode,
            podcastTitle: podcast.title,
            podcastImageUrl: podcast.imageUrl
        };
        audioPlayer.actions.playEpisode(episodeWithMeta);
    };

    const handleAddToQueue = (podcast: Podcast, episode: Episode) => {
        const episodeWithMeta = {
            ...episode,
            podcastTitle: podcast.title,
            podcastImageUrl: podcast.imageUrl
        };
        audioPlayer.actions.addToQueue(episodeWithMeta);
    };

    const handleAuthSuccess = (user: User) => {
        setCurrentUser(user);
        setActiveView('explore');
    };

    const handleAuthError = (error: string) => {
        setError(error);
    };

    const handleSignOut = async () => {
        // Clear user data and return to offline user
        localStorageService.clearUserData();
        setCurrentUser({
            uid: 'offline-user',
            isAnonymous: false,
            email: 'offline@podflow.com'
        });
        setActiveView('explore');
    };

    // Header callback functions
    const handleNavigateToExplore = useCallback(() => {
        setActiveView('explore');
        setSelectedPodcast(null);
    }, []);

    const handleNavigateToLogin = useCallback(() => {
        setActiveView('login');
    }, []);

    const handleNavigateToRegister = useCallback(() => {
        setActiveView('register');
    }, []);

    const handleSearchTermChange = useCallback((term: string) => {
        setSearchTerm(term);
    }, []);

    // Initial fetch
    useEffect(() => {
        fetchPodcasts('top podcasts');
    }, [fetchPodcasts]);

    const Navigation = () => (
        <nav className="bg-gray-800 p-3 shadow-md sticky top-[100px] sm:top-[68px] z-10">
            <div className="container mx-auto flex justify-center space-x-4">
                <button
                    onClick={() => {
                        setActiveView('explore');
                        setSelectedPodcast(null);
                    }}
                    className={`px-4 py-2 rounded-md font-semibold transition ${activeView === 'explore'
                            ? 'bg-indigo-600 text-white'
                            : 'text-gray-300 hover:bg-gray-700'
                        }`}
                >
                    Explore
                </button>

                {(currentUser && !currentUser.isAnonymous) && (
                    <>
                        <button
                            onClick={() => {
                                setActiveView('my-podcasts');
                                setSelectedPodcast(null);
                            }}
                            className={`px-4 py-2 rounded-md font-semibold transition ${activeView === 'my-podcasts'
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-gray-300 hover:bg-gray-700'
                                }`}
                        >
                            My Podcasts
                        </button>

                        <button
                            onClick={() => {
                                setActiveView('queue');
                                setSelectedPodcast(null);
                            }}
                            className={`px-4 py-2 rounded-md font-semibold transition ${activeView === 'queue'
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-gray-300 hover:bg-gray-700'
                                }`}
                        >
                            Queue {audioPlayer.state.queue.length > 0 && (
                                <span className="bg-indigo-500 text-xs px-2 py-1 rounded-full ml-1">
                                    {audioPlayer.state.queue.length}
                                </span>
                            )}
                        </button>
                    </>
                )}
            </div>
        </nav>
    );

    const ExploreView = () => {
        const categories = ['News', 'Comedy', 'Technology', 'True Crime', 'Business', 'Health'];

        return (
            <div className="p-4">
                <div className="mb-8">
                    <h3 className="text-2xl font-bold text-gray-800 mb-4 text-center">Popular Categories</h3>
                    <div className="flex flex-wrap gap-3 justify-center">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => handleCategoryClick(cat)}
                                className="bg-white text-indigo-700 font-semibold px-4 py-2 rounded-full shadow-md hover:bg-indigo-100 transition duration-200"
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {loading && !podcasts.length ? (
                    <p className="text-center text-indigo-600 font-semibold py-10">Loading Podcasts...</p>
                ) : error ? (
                    <p className="text-center text-red-600 bg-red-100 p-4 rounded-md">{error}</p>
                ) : podcasts.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {podcasts.map(p => (
                            <PodcastCard key={p.id} podcast={p} onSelect={handlePodcastSelect} />
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-gray-600 py-10">No podcasts found. Try another search!</p>
                )}
            </div>
        );
    };

    const MyPodcastsView = () => {
        const mySubs = podcasts.filter(p => subscribedPodcastIds.has(p.id));

        return (
            <div className="p-4">
                <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">My Subscriptions</h2>
                {mySubs.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {mySubs.map(p => (
                            <PodcastCard key={p.id} podcast={p} onSelect={handlePodcastSelect} />
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-gray-600 py-10">
                        You haven't subscribed to any podcasts yet.
                    </p>
                )}
            </div>
        );
    };

    const QueueView = () => {
        const { queue, currentQueueIndex } = audioPlayer.state;

        return (
            <div className="p-4 max-w-4xl mx-auto">
                <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">Up Next</h2>
                {queue.length > 0 ? (
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <ul className="space-y-3">
                            {queue.map((episode, index) => (
                                <li
                                    key={`${episode.id}-${index}`}
                                    className={`p-3 rounded-lg transition flex items-center justify-between ${index === currentQueueIndex
                                            ? 'bg-indigo-100 border-l-4 border-indigo-600'
                                            : 'bg-gray-50 hover:bg-gray-100'
                                        }`}
                                >
                                    <div className="flex items-center gap-3 flex-grow">
                                        <img
                                            src={episode.podcastImageUrl}
                                            alt={episode.title}
                                            className="w-12 h-12 rounded-md object-cover"
                                        />
                                        <div className="min-w-0 flex-grow">
                                            <h4 className="font-semibold text-gray-800 truncate">{episode.title}</h4>
                                            <p className="text-sm text-gray-600 truncate">{episode.podcastTitle}</p>
                                            {index === currentQueueIndex && (
                                                <p className="text-xs text-indigo-600 font-semibold">Now Playing</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {index !== currentQueueIndex && (
                                            <button
                                                onClick={() => {
                                                    // Find the podcast for this episode
                                                    const podcast = podcasts.find(p =>
                                                        p.episodes.some(ep => ep.id === episode.id)
                                                    );
                                                    if (podcast) {
                                                        handlePlayEpisode(podcast, episode);
                                                    }
                                                }}
                                                className="bg-green-600 hover:bg-green-700 text-white font-bold px-3 py-1 rounded-full transition text-sm"
                                            >
                                                Play
                                            </button>
                                        )}
                                        <button
                                            onClick={() => audioPlayer.actions.removeFromQueue(index)}
                                            className="bg-red-500 hover:bg-red-600 text-white font-bold px-3 py-1 rounded-full transition text-sm"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>

                        <div className="mt-4 flex justify-center">
                            <button
                                onClick={audioPlayer.actions.clearQueue}
                                className="bg-gray-600 hover:bg-gray-700 text-white font-bold px-4 py-2 rounded-md transition"
                            >
                                Clear Queue
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-10">
                        <p className="text-gray-600 mb-4">Your queue is empty.</p>
                        <p className="text-sm text-gray-500">Add episodes to your queue from any podcast page!</p>
                    </div>
                )}
            </div>
        );
    };

    const PodcastDetailView = () => {
        if (!selectedPodcast) return null;

        const isSubscribed = subscribedPodcastIds.has(selectedPodcast.id);
        const sortedEpisodes = [...selectedPodcast.episodes].sort((a, b) => {
            if (episodeSortOrder === 'newest') {
                return b.pubDate.getTime() - a.pubDate.getTime();
            }
            return a.pubDate.getTime() - b.pubDate.getTime();
        });

        return (
            <div className="p-4 max-w-5xl mx-auto">
                <div className="bg-white rounded-xl shadow-xl overflow-hidden">
                    <div className="p-6 md:flex gap-6 bg-gray-50">
                        <img
                            src={selectedPodcast.imageUrl}
                            alt={selectedPodcast.title}
                            className="w-40 h-40 object-cover rounded-lg shadow-md mx-auto md:mx-0 flex-shrink-0"
                        />
                        <div className="flex-grow mt-4 md:mt-0 text-center md:text-left">
                            <h2 className="text-3xl font-extrabold text-gray-900">{selectedPodcast.title}</h2>
                            <p className="text-md text-gray-600 mt-1">{selectedPodcast.publisher}</p>
                            <p className="text-sm text-gray-500 mt-3 line-clamp-3">{selectedPodcast.description}</p>
                            <button
                                onClick={() => toggleSubscription(selectedPodcast.id)}
                                className={`mt-4 px-6 py-2 rounded-full font-bold transition-all ${isSubscribed
                                        ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                    }`}
                            >
                                {isSubscribed ? 'Subscribed' : 'Subscribe'}
                            </button>
                        </div>
                    </div>

                    <div className="p-6">
                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                            <h3 className="text-2xl font-bold text-gray-900">Episodes</h3>
                            <div>
                                <button
                                    onClick={() => setEpisodeSortOrder('newest')}
                                    className={`px-3 py-1 text-sm rounded-l-md ${episodeSortOrder === 'newest' ? 'bg-indigo-600 text-white' : 'bg-gray-200'
                                        }`}
                                >
                                    Newest
                                </button>
                                <button
                                    onClick={() => setEpisodeSortOrder('oldest')}
                                    className={`px-3 py-1 text-sm rounded-r-md ${episodeSortOrder === 'oldest' ? 'bg-indigo-600 text-white' : 'bg-gray-200'
                                        }`}
                                >
                                    Oldest
                                </button>
                            </div>
                        </div>

                        {loading ? (
                            <p>Loading episodes...</p>
                        ) : error ? (
                            <p className="text-red-500">{error}</p>
                        ) : (
                            <ul className="space-y-3">
                                {sortedEpisodes.map(ep => (
                                    <li
                                        key={ep.id}
                                        className="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition flex flex-col sm:flex-row justify-between items-start sm:items-center"
                                    >
                                        <div className="flex-grow mb-2 sm:mb-0">
                                            <h4 className="font-semibold text-gray-800">{ep.title}</h4>
                                            <p className="text-xs text-gray-500">{ep.pubDate.toLocaleDateString()}</p>
                                            {episodeProgress[ep.id] > 1 && (
                                                <p className="text-xs text-indigo-600 font-semibold">
                                                    Resumes at {formatTime(episodeProgress[ep.id])}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleAddToQueue(selectedPodcast, ep)}
                                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-2 rounded-full transition flex items-center gap-1 text-sm"
                                            >
                                                <PlusIcon /> Queue
                                            </button>
                                            <button
                                                onClick={() => handlePlayEpisode(selectedPodcast, ep)}
                                                className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-full transition flex items-center gap-2 flex-shrink-0"
                                            >
                                                <PlayIcon /> Play
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // Main render switch
    const renderView = () => {
        switch (activeView) {
            case 'explore':
                return <ExploreView />;
            case 'my-podcasts':
                return (currentUser && !currentUser.isAnonymous)
                    ? <MyPodcastsView />
                    : <AuthView isLogin={true} onSuccess={handleAuthSuccess} onError={handleAuthError} />;
            case 'queue':
                return (currentUser && !currentUser.isAnonymous)
                    ? <QueueView />
                    : <AuthView isLogin={true} onSuccess={handleAuthSuccess} onError={handleAuthError} />;
            case 'podcast-detail':
                return <PodcastDetailView />;
            case 'login':
                return <AuthView isLogin={true} onSuccess={handleAuthSuccess} onError={handleAuthError} />;
            case 'register':
                return <AuthView isLogin={false} onSuccess={handleAuthSuccess} onError={handleAuthError} />;
            default:
                return <ExploreView />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 font-sans pb-32">
            <style>{`body { font-family: 'Inter', sans-serif; }`}</style>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap" rel="stylesheet" />

            <Header 
                searchTerm={searchTerm}
                onSearchTermChange={handleSearchTermChange}
                onSearch={handleSearch}
                onNavigateToExplore={handleNavigateToExplore}
                onNavigateToLogin={handleNavigateToLogin}
                onNavigateToRegister={handleNavigateToRegister}
                onSignOut={handleSignOut}
                currentUser={currentUser}
                isAuthReady={isAuthReady}
            />
            <div className="pt-[140px] sm:pt-[120px]">
                <Navigation />
                <main className="container mx-auto mt-4">
                    {isAuthReady ? renderView() : (
                        <p className="text-center p-10 font-semibold">Initializing App...</p>
                    )}
                </main>
            </div>

            <AudioPlayer
                audioRef={audioPlayer.audioRef}
                state={audioPlayer.state}
                onPlayPause={audioPlayer.actions.togglePlayPause}
                onSeek={audioPlayer.actions.seek}
                onVolumeChange={audioPlayer.actions.setVolume}
                onSpeedChange={() => {
                    const currentSpeed = audioPlayer.state.playbackSpeed;
                    const newSpeed = currentSpeed >= 2 ? 0.5 : currentSpeed + 0.5;
                    audioPlayer.actions.setPlaybackSpeed(newSpeed);
                }}
                onNext={audioPlayer.actions.playNext}
                onPrevious={audioPlayer.actions.playPrevious}
                onSkip={audioPlayer.actions.skipTime}
                onTimeUpdate={audioPlayer.handlers.handleTimeUpdate}
                onLoadedMetadata={audioPlayer.handlers.handleLoadedMetadata}
                onEnded={audioPlayer.handlers.handleEnded}
            />
        </div>
    );
};

export default App;
