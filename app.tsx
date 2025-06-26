import React, { useState, useEffect, useRef, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import {
    getAuth,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    signInWithCustomToken,
    signInAnonymously
} from 'firebase/auth';
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    onSnapshot
} from 'firebase/firestore';

// --- Helper to get globally provided variables ---
const getGlobalVar = (name, defaultValue) => {
    if (typeof window !== 'undefined' && window[name]) {
        return window[name];
    }
    return defaultValue;
};

// --- Firebase Configuration ---
// These variables are expected to be injected by the environment.
const firebaseConfigString = getGlobalVar('__firebase_config', '{}');
const initialAuthToken = getGlobalVar('__initial_auth_token', null);
const appId = getGlobalVar('__app_id', 'default-podflow-app');

// Check if Firebase config is available
let firebaseConfig: any = {};
let isFirebaseAvailable = false;
try {
    firebaseConfig = JSON.parse(firebaseConfigString);
    // Check if config has required fields
    isFirebaseAvailable = firebaseConfig.apiKey && firebaseConfig.projectId;
} catch (e) {
    console.warn("Firebase config not available, using localStorage fallback:", e);
}

// Initialize Firebase only if config is available
let app, auth, db;
if (isFirebaseAvailable) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
} else {
    console.info("Running in offline mode with localStorage");
}

// --- API Constants ---
const ITUNES_SEARCH_API_URL = 'https://itunes.apple.com/search';
const CORS_PROXY_URL = 'https://corsproxy.io/?';

// --- Main App Component ---
export default function App() {    // --- State Management ---
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [isAuthReady, setIsAuthReady] = useState(false);

    // UI Navigation State
    const [activeView, setActiveView] = useState('explore'); // 'explore', 'my-podcasts', 'podcast-detail', 'queue', 'login', 'register'

    // Data State
    const [podcasts, setPodcasts] = useState<any[]>([]);
    const [selectedPodcast, setSelectedPodcast] = useState<any>(null);

    // User-specific Data State (synced with Firestore or localStorage)
    const [subscribedPodcastIds, setSubscribedPodcastIds] = useState(new Set());
    const [episodeProgress, setEpisodeProgress] = useState<any>({});

    // Audio Player State
    const [currentEpisode, setCurrentEpisode] = useState<any>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
    const [volume, setVolume] = useState(1.0);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [queue, setQueue] = useState<any[]>([]); // Episode queue for "Up Next"
    const [currentQueueIndex, setCurrentQueueIndex] = useState(-1);

    // App Status State
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [episodeSortOrder, setEpisodeSortOrder] = useState('newest'); // 'newest' or 'oldest'

    const audioRef = useRef<HTMLAudioElement | null>(null);    // --- Authentication and Data Syncing ---
    useEffect(() => {
        const handleAuth = async () => {
            if (isFirebaseAvailable && auth) {
                try {
                    if (initialAuthToken) {
                        await signInWithCustomToken(auth, initialAuthToken);
                    } else {
                        await signInAnonymously(auth);
                    }
                } catch (error) {
                    console.error("Authentication Error:", error);
                    await signInAnonymously(auth); // Fallback to anonymous
                }
            } else {
                // Offline mode - create a mock user
                setCurrentUser({
                    uid: 'offline-user',
                    isAnonymous: false,
                    email: 'offline@podflow.com'
                });
                setIsAuthReady(true);
            }
        };

        handleAuth();

        if (isFirebaseAvailable && auth) {
            const unsubscribeAuth = onAuthStateChanged(auth, user => {
                setCurrentUser(user);
                setIsAuthReady(true);
            });
            return () => unsubscribeAuth();
        }
    }, []);

    useEffect(() => {
        let unsubscribeDb = () => { };
        if (isAuthReady && currentUser && !currentUser.isAnonymous) {
            if (isFirebaseAvailable && db) {
                // Firebase mode
                const userDocRef = doc(db, "artifacts", appId, "users", currentUser.uid);
                unsubscribeDb = onSnapshot(userDocRef, (docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setSubscribedPodcastIds(new Set(data.subscribedPodcastIds || []));
                        setEpisodeProgress(data.episodeProgress || {});
                    } else {
                        // Initialize data for a new user
                        setSubscribedPodcastIds(new Set());
                        setEpisodeProgress({});
                    }
                }, (err) => {
                    console.error("Firestore onSnapshot error:", err);
                    setError("Could not sync your data. Please refresh.");
                });
            } else {
                // LocalStorage mode
                const savedSubs = localStorage.getItem('podflow-subscriptions');
                const savedProgress = localStorage.getItem('podflow-progress');

                if (savedSubs) {
                    try {
                        setSubscribedPodcastIds(new Set(JSON.parse(savedSubs)));
                    } catch (e) {
                        console.error("Error loading subscriptions:", e);
                    }
                }

                if (savedProgress) {
                    try {
                        setEpisodeProgress(JSON.parse(savedProgress));
                    } catch (e) {
                        console.error("Error loading progress:", e);
                    }
                }
            }
        } else {
            // For logged-out or anonymous users, clear any synced data.
            setSubscribedPodcastIds(new Set());
            setEpisodeProgress({});
        }
        return () => unsubscribeDb();
    }, [isAuthReady, currentUser]);    // --- Data Update Functions ---
    const updateFirestore = async (data: any) => {
        if (!currentUser || currentUser.isAnonymous) return;

        if (isFirebaseAvailable && db) {
            // Firebase mode
            const userDocRef = doc(db, "artifacts", appId, "users", currentUser.uid);
            try {
                await setDoc(userDocRef, data, { merge: true });
            } catch (err) {
                console.error("Failed to update Firestore:", err);
                setError("Your changes could not be saved.");
            }
        } else {
            // LocalStorage mode
            try {
                if (data.subscribedPodcastIds) {
                    localStorage.setItem('podflow-subscriptions', JSON.stringify(data.subscribedPodcastIds));
                }
                if (data.episodeProgress) {
                    localStorage.setItem('podflow-progress', JSON.stringify(data.episodeProgress));
                }
            } catch (err) {
                console.error("Failed to save to localStorage:", err);
                setError("Your changes could not be saved locally.");
            }
        }
    };

    // Debounce updates for time progress
    const debouncedUpdateTimeRef = useRef<NodeJS.Timeout>();
    const updateTimeProgress = useCallback((episodeId: string, time: number) => {
        if (!currentUser || !episodeId) return;
        const newProgress = { ...episodeProgress, [episodeId]: time };
        setEpisodeProgress(newProgress); // Update local state for immediate UI feedback

        clearTimeout(debouncedUpdateTimeRef.current);
        debouncedUpdateTimeRef.current = setTimeout(() => {
            updateFirestore({ episodeProgress: newProgress });
        }, 2000); // Update every 2 seconds of listening
    }, [currentUser, episodeProgress]);

    // --- Podcast & Episode Fetching ---
    const fetchPodcasts = useCallback(async (query) => {
        setLoading(true);
        setError(null);
        try {
            const itunesResponse = await fetch(`${ITUNES_SEARCH_API_URL}?term=${encodeURIComponent(query)}&entity=podcast&limit=20`);
            if (!itunesResponse.ok) throw new Error(`iTunes API Error: ${itunesResponse.statusText}`);
            const iTunesData = await itunesResponse.json();

            const fetchedPodcasts = iTunesData.results.map(p => ({
                id: p.collectionId.toString(),
                title: p.collectionName,
                publisher: p.artistName,
                imageUrl: p.artworkUrl600,
                feedUrl: p.feedUrl,
                episodes: [] // Episodes fetched on demand
            }));

            setPodcasts(fetchedPodcasts);
        } catch (apiError) {
            console.error('API Fetch Error:', apiError);
            setError(`Failed to fetch podcasts: ${apiError.message}`);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchEpisodes = async (podcast) => {
        if (!podcast.feedUrl) {
            setError("This podcast does not have a valid RSS feed.");
            return podcast;
        }
        if (podcast.episodes && podcast.episodes.length > 0) return podcast;

        setLoading(true);
        try {
            const rssResponse = await fetch(`${CORS_PROXY_URL}${encodeURIComponent(podcast.feedUrl)}`);
            if (!rssResponse.ok) throw new Error(`RSS Feed Error: ${rssResponse.statusText}`);
            const rssData = await rssResponse.text();

            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(rssData, "text/xml");

            const items = Array.from(xmlDoc.querySelectorAll('item')); const episodes = items.map(item => {
                const audioUrl = item.querySelector('enclosure')?.getAttribute('url');
                const pubDateText = item.querySelector('pubDate')?.textContent;
                return {
                    id: item.querySelector('guid')?.textContent || audioUrl || Math.random().toString(),
                    title: item.querySelector('title')?.textContent || 'Untitled Episode',
                    description: item.querySelector('description')?.textContent?.replace(/<[^>]*>?/gm, '') || 'No description available.',
                    pubDate: pubDateText ? new Date(pubDateText) : new Date(),
                    audioUrl: audioUrl,
                };
            }).filter(ep => ep.audioUrl);

            const updatedPodcast = { ...podcast, episodes };
            setPodcasts(prev => prev.map(p => p.id === updatedPodcast.id ? updatedPodcast : p));
            return updatedPodcast;
        } catch (e) {
            console.error("Error fetching episodes:", e);
            setError(`Failed to load episodes. The RSS feed may be invalid or unavailable. (${e.message})`);
            return podcast;
        } finally {
            setLoading(false);
        }
    };

    // Initial fetch
    useEffect(() => {
        fetchPodcasts('top podcasts');
    }, [fetchPodcasts]);

    // --- Event Handlers ---
    const handleSearch = (e) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            fetchPodcasts(searchTerm.trim());
        }
    };

    const handleCategoryClick = (category) => {
        setSearchTerm(category);
        fetchPodcasts(category);
        setActiveView('explore');
    };

    const toggleSubscription = (podcastId: string) => {
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
        updateFirestore({ subscribedPodcastIds: Array.from(newSubscribedIds) });
    };

    const playEpisode = (podcast, episode) => {
        const episodeWithMeta = { ...episode, podcastTitle: podcast.title, podcastImageUrl: podcast.imageUrl };
        setCurrentEpisode(episodeWithMeta);
        setIsPlaying(true);

        // Update queue - either add this episode or use existing queue
        const existingQueueIndex = queue.findIndex(q => q.id === episode.id);
        if (existingQueueIndex !== -1) {
            // Episode is already in queue, just play it
            setCurrentQueueIndex(existingQueueIndex);
        } else {
            // Add to queue and play - set index to the new length
            const newQueueIndex = queue.length;
            setQueue(prev => [...prev, episodeWithMeta]);
            setCurrentQueueIndex(newQueueIndex);
        }

        if (audioRef.current) {
            console.log('Setting audio source:', episode.audioUrl);
            const audio = audioRef.current;

            // Clear any existing event listeners by setting src to empty first
            audio.src = '';
            audio.load();

            // Set the new source
            audio.src = episode.audioUrl;

            // Define handlers to avoid multiple listener issues
            const handleLoadedMetadata = () => {
                const savedTime = episodeProgress[episode.id] || 0;
                console.log('Audio loaded, setting time to:', savedTime);
                if (audio) {
                    audio.currentTime = savedTime;
                    audio.play().catch(e => {
                        console.error("Autoplay failed:", e);
                        setIsPlaying(false);
                    });
                }
            };

            const handleError = (e) => {
                console.error("Audio load error:", e);
                setError("Failed to load episode audio. The audio file may be unavailable.");
                setIsPlaying(false);
            };

            // Add event listeners
            audio.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
            audio.addEventListener('error', handleError, { once: true });

            // Trigger loading
            audio.load();
        }
    };

    const addToQueue = (podcast, episode) => {
        const episodeWithMeta = { ...episode, podcastTitle: podcast.title, podcastImageUrl: podcast.imageUrl };
        setQueue(prev => [...prev, episodeWithMeta]);
    };

    const removeFromQueue = (index) => {
        setQueue(prev => prev.filter((_, i) => i !== index));
        if (index < currentQueueIndex) {
            setCurrentQueueIndex(prev => prev - 1);
        } else if (index === currentQueueIndex) {
            // If removing current episode, stop playback
            setIsPlaying(false);
            setCurrentEpisode(null);
            setCurrentQueueIndex(-1);
        }
    };

    const playNext = () => {
        if (currentQueueIndex < queue.length - 1) {
            const nextIndex = currentQueueIndex + 1;
            const nextEpisode = queue[nextIndex];
            setCurrentQueueIndex(nextIndex);
            setCurrentEpisode(nextEpisode);
            setIsPlaying(true);

            if (audioRef.current) {
                console.log('Playing next episode:', nextEpisode.audioUrl);
                const audio = audioRef.current;

                // Clear any existing source and load new one
                audio.src = '';
                audio.load();
                audio.src = nextEpisode.audioUrl;

                const handleLoadedMetadata = () => {
                    const savedTime = episodeProgress[nextEpisode.id] || 0;
                    if (audio) {
                        audio.currentTime = savedTime;
                        audio.play().catch(e => {
                            console.error("Next autoplay failed:", e);
                            setIsPlaying(false);
                        });
                    }
                };

                audio.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
                audio.load();
            }
        }
    };

    const playPrevious = () => {
        if (currentQueueIndex > 0) {
            const prevIndex = currentQueueIndex - 1;
            const prevEpisode = queue[prevIndex];
            setCurrentQueueIndex(prevIndex);
            setCurrentEpisode(prevEpisode);
            setIsPlaying(true);

            if (audioRef.current) {
                console.log('Playing previous episode:', prevEpisode.audioUrl);
                const audio = audioRef.current;

                // Clear any existing source and load new one
                audio.src = '';
                audio.load();
                audio.src = prevEpisode.audioUrl;

                const handleLoadedMetadata = () => {
                    const savedTime = episodeProgress[prevEpisode.id] || 0;
                    if (audio) {
                        audio.currentTime = savedTime;
                        audio.play().catch(e => {
                            console.error("Previous autoplay failed:", e);
                            setIsPlaying(false);
                        });
                    }
                };

                audio.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
                audio.load();
            }
        }
    };

    // --- Audio Player Handlers ---
    const handleTimeUpdate = () => {
        if (!audioRef.current || !currentEpisode) return;
        const time = audioRef.current.currentTime;
        setCurrentTime(time);
        updateTimeProgress(currentEpisode.id, time);
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) setDuration(audioRef.current.duration);
    };

    const handleEnded = () => {
        setIsPlaying(false);
        // Auto-play next episode in queue
        if (currentQueueIndex < queue.length - 1) {
            playNext();
        }
    };

    // Apply playback speed and volume changes to audio element
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.playbackRate = playbackSpeed;
        }
    }, [playbackSpeed]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, [volume]);

    // Handle play/pause state - simplified approach
    useEffect(() => {
        console.log('Play/pause useEffect triggered:', { isPlaying, currentEpisode: !!currentEpisode, audioRefAvailable: !!audioRef.current });
        
        if (audioRef.current) {
            if (isPlaying && currentEpisode) {
                // Only try to play if audio is ready and has the correct source
                if (audioRef.current.src.includes(currentEpisode.audioUrl) && audioRef.current.readyState >= 2) {
                    console.log('Attempting to play audio');
                    audioRef.current.play().catch(e => {
                        console.error("Play failed:", e);
                        setIsPlaying(false);
                    });
                } else {
                    console.log('Audio not ready or source mismatch:', { 
                        srcIncludes: audioRef.current.src.includes(currentEpisode.audioUrl),
                        readyState: audioRef.current.readyState,
                        src: audioRef.current.src,
                        expectedUrl: currentEpisode.audioUrl
                    });
                }
                // If audio is not ready, the playEpisode/playNext/playPrevious functions will handle it
            } else if (!isPlaying) {
                console.log('Attempting to pause audio');
                audioRef.current.pause();
            }
        }
        
        if (isPlaying && !currentEpisode) {
            // If trying to play but no episode is set, try to play first item in queue
            if (queue.length > 0) {
                const firstEpisode = queue[0];
                setCurrentEpisode(firstEpisode);
                setCurrentQueueIndex(0);
                // The useEffect will trigger again with the new currentEpisode
            } else {
                setIsPlaying(false);
                setError("No episode selected. Please choose an episode to play.");
            }
        }
    }, [isPlaying, currentEpisode, queue]);

    // Sync isPlaying state with actual audio element state
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handlePlay = () => {
            console.log('Audio play event detected');
            if (!isPlaying) {
                setIsPlaying(true);
            }
        };

        const handlePause = () => {
            console.log('Audio pause event detected');
            if (isPlaying) {
                setIsPlaying(false);
            }
        };

        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);

        return () => {
            audio.removeEventListener('play', handlePlay);
            audio.removeEventListener('pause', handlePause);
        };
    }, [isPlaying]);

    const handleSeek = (e) => {
        if (audioRef.current) {
            const time = Number(e.target.value);
            audioRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const skipTime = (amount) => {
        if (audioRef.current) {
            audioRef.current.currentTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + amount));
        }
    };

    // --- UI Component Definitions ---

    const Header = () => (
        <header className="bg-gradient-to-r from-purple-700 to-indigo-800 text-white p-4 shadow-lg fixed top-0 w-full z-20">
            <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                <h1 className="text-3xl font-extrabold tracking-tight cursor-pointer" onClick={() => { setActiveView('explore'); setSelectedPodcast(null); }}>PodFlow</h1>
                <form onSubmit={handleSearch} className="w-full sm:w-1/2 flex">
                    <input
                        type="search"
                        placeholder="Search for podcasts..."
                        className="w-full p-2 rounded-l-md border-0 text-gray-800 focus:ring-2 focus:ring-purple-400 focus:outline-none transition"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button type="submit" className="bg-indigo-500 hover:bg-indigo-600 px-4 rounded-r-md font-semibold transition">Search</button>
                </form>
                <div>
                    {isAuthReady && (
                        currentUser && !currentUser.isAnonymous ? (
                            <button
                                onClick={() => {
                                    if (isFirebaseAvailable && auth) {
                                        signOut(auth);
                                    } else {
                                        setCurrentUser({ uid: 'offline-user', isAnonymous: false, email: 'offline@podflow.com' });
                                        setActiveView('explore');
                                    }
                                }}
                                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md transition"
                            >
                                Logout
                            </button>
                        ) : (
                            <div className="flex space-x-2">
                                <button onClick={() => setActiveView('login')} className="bg-indigo-500 hover:bg-indigo-600 font-semibold py-2 px-4 rounded-md transition">Login</button>
                                <button onClick={() => setActiveView('register')} className="bg-green-600 hover:bg-green-700 font-semibold py-2 px-4 rounded-md transition">Register</button>
                            </div>
                        )
                    )}
                </div>
            </div>
        </header>
    );

    const Navigation = () => (
        <nav className="bg-gray-800 p-3 shadow-md sticky top-[100px] sm:top-[68px] z-10">
            <div className="container mx-auto flex justify-center space-x-4">
                <button onClick={() => { setActiveView('explore'); setSelectedPodcast(null); }} className={`px-4 py-2 rounded-md font-semibold transition ${activeView === 'explore' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>Explore</button>
                {(currentUser && !currentUser.isAnonymous) && (
                    <>
                        <button onClick={() => { setActiveView('my-podcasts'); setSelectedPodcast(null); }} className={`px-4 py-2 rounded-md font-semibold transition ${activeView === 'my-podcasts' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>My Podcasts</button>
                        <button onClick={() => { setActiveView('queue'); setSelectedPodcast(null); }} className={`px-4 py-2 rounded-md font-semibold transition ${activeView === 'queue' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                            Queue {queue.length > 0 && <span className="bg-indigo-500 text-xs px-2 py-1 rounded-full ml-1">{queue.length}</span>}
                        </button>
                    </>
                )}
            </div>
        </nav>
    );

    const AuthView = ({ isLogin }: { isLogin: boolean }) => {
        const [email, setEmail] = useState('');
        const [password, setPassword] = useState('');
        const [authError, setAuthError] = useState('');

        const handleSubmit = async (e: React.FormEvent) => {
            e.preventDefault();
            setAuthError('');

            if (isFirebaseAvailable && auth) {
                // Firebase authentication
                try {
                    if (isLogin) {
                        await signInWithEmailAndPassword(auth, email, password);
                    } else {
                        await createUserWithEmailAndPassword(auth, email, password);
                    }
                    setActiveView('explore');
                } catch (err: any) {
                    setAuthError(err.message.replace('Firebase: ', ''));
                }
            } else {
                // Offline mode - simulate authentication
                try {
                    setCurrentUser({
                        uid: `user_${Date.now()}`,
                        email: email,
                        isAnonymous: false
                    });
                    setActiveView('explore');
                } catch (err: any) {
                    setAuthError('Authentication failed in offline mode');
                }
            }
        };

        return (
            <div className="max-w-md mx-auto mt-10 p-8 bg-white rounded-xl shadow-2xl">
                <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">{isLogin ? 'Login' : 'Register'}</h2>
                {!isFirebaseAvailable && (
                    <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 rounded-md">
                        <p className="text-yellow-800 text-sm">Running in offline mode - your data will be saved locally</p>
                    </div>
                )}
                <form onSubmit={handleSubmit}>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email Address" required className="w-full p-3 mb-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required className="w-full p-3 mb-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                    {authError && <p className="text-red-500 text-center mb-4">{authError}</p>}
                    <button type="submit" className={`w-full text-white font-bold py-3 rounded-md transition ${isLogin ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-green-600 hover:bg-green-700'}`}>{isLogin ? 'Login' : 'Create Account'}</button>
                </form>
            </div>
        );
    };

    const PodcastCard = ({ podcast }) => (
        <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer overflow-hidden flex flex-col"
            onClick={async () => {
                const podcastWithEpisodes = await fetchEpisodes(podcast);
                setSelectedPodcast(podcastWithEpisodes);
                setActiveView('podcast-detail');
            }}>
            <img src={podcast.imageUrl} alt={podcast.title} className="w-full h-48 object-cover" onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = `https://placehold.co/300x300/6366F1/FFFFFF?text=Image+Error`;
            }} />
            <div className="p-4 flex-grow flex flex-col">
                <h3 className="text-lg font-bold text-gray-900 line-clamp-2 flex-grow">{podcast.title}</h3>
                <p className="text-sm text-gray-600 line-clamp-1">{podcast.publisher}</p>
            </div>
        </div>
    );

    const ExploreView = () => {
        const categories = ['News', 'Comedy', 'Technology', 'True Crime', 'Business', 'Health'];
        return (
            <div className="p-4">
                <div className="mb-8">
                    <h3 className="text-2xl font-bold text-gray-800 mb-4 text-center">Popular Categories</h3>
                    <div className="flex flex-wrap gap-3 justify-center">
                        {categories.map(cat => (
                            <button key={cat} onClick={() => handleCategoryClick(cat)} className="bg-white text-indigo-700 font-semibold px-4 py-2 rounded-full shadow-md hover:bg-indigo-100 transition duration-200">{cat}</button>
                        ))}
                    </div>
                </div>
                {loading && !podcasts.length ? (
                    <p className="text-center text-indigo-600 font-semibold py-10">Loading Podcasts...</p>
                ) : error ? (
                    <p className="text-center text-red-600 bg-red-100 p-4 rounded-md">{error}</p>
                ) : podcasts.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {podcasts.map(p => <PodcastCard key={p.id} podcast={p} />)}
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
                        {mySubs.map(p => <PodcastCard key={p.id} podcast={p} />)}
                    </div>
                ) : (
                    <p className="text-center text-gray-600 py-10">You haven't subscribed to any podcasts yet.</p>
                )}
            </div>
        );
    };

    const QueueView = () => {
        return (
            <div className="p-4 max-w-4xl mx-auto">
                <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">Up Next</h2>
                {queue.length > 0 ? (
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <ul className="space-y-3">
                            {queue.map((episode, index) => (
                                <li key={`${episode.id}-${index}`} className={`p-3 rounded-lg transition flex items-center justify-between ${index === currentQueueIndex ? 'bg-indigo-100 border-l-4 border-indigo-600' : 'bg-gray-50 hover:bg-gray-100'}`}>
                                    <div className="flex items-center gap-3 flex-grow">
                                        <img src={episode.podcastImageUrl} alt={episode.title} className="w-12 h-12 rounded-md object-cover" />
                                        <div className="min-w-0 flex-grow">
                                            <h4 className="font-semibold text-gray-800 truncate">{episode.title}</h4>
                                            <p className="text-sm text-gray-600 truncate">{episode.podcastTitle}</p>
                                            {index === currentQueueIndex && <p className="text-xs text-indigo-600 font-semibold">Now Playing</p>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {index !== currentQueueIndex && (
                                            <button
                                                onClick={() => {
                                                    const episodeWithMeta = { ...episode, podcastTitle: episode.podcastTitle, podcastImageUrl: episode.podcastImageUrl };
                                                    setCurrentQueueIndex(index);
                                                    setCurrentEpisode(episodeWithMeta);
                                                    setIsPlaying(true);

                                                    if (audioRef.current) {
                                                        console.log('Playing queue episode:', episode.audioUrl);
                                                        const audio = audioRef.current;

                                                        // Clear any existing source and load new one
                                                        audio.src = '';
                                                        audio.load();
                                                        audio.src = episode.audioUrl;

                                                        // Define handlers
                                                        const handleLoadedMetadata = () => {
                                                            const savedTime = episodeProgress[episode.id] || 0;
                                                            console.log('Queue audio loaded, setting time to:', savedTime);
                                                            if (audio) {
                                                                audio.currentTime = savedTime;
                                                                audio.play().catch(e => {
                                                                    console.error("Queue autoplay failed:", e);
                                                                    setIsPlaying(false);
                                                                });
                                                            }
                                                        };

                                                        const handleError = (e) => {
                                                            console.error("Queue audio load error:", e);
                                                            setError("Failed to load episode audio. The audio file may be unavailable.");
                                                            setIsPlaying(false);
                                                        };

                                                        // Add event listeners
                                                        audio.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
                                                        audio.addEventListener('error', handleError, { once: true });

                                                        // Trigger loading
                                                        audio.load();
                                                    }
                                                }}
                                                className="bg-green-600 hover:bg-green-700 text-white font-bold px-3 py-1 rounded-full transition text-sm"
                                            >
                                                Play
                                            </button>
                                        )}
                                        <button
                                            onClick={() => removeFromQueue(index)}
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
                                onClick={() => {
                                    setQueue([]);
                                    setCurrentQueueIndex(-1);
                                    setIsPlaying(false);
                                    setCurrentEpisode(null);
                                }}
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
                return b.pubDate - a.pubDate;
            }
            return a.pubDate - b.pubDate;
        });

        return (
            <div className="p-4 max-w-5xl mx-auto">
                <div className="bg-white rounded-xl shadow-xl overflow-hidden">
                    <div className="p-6 md:flex gap-6 bg-gray-50">
                        <img src={selectedPodcast.imageUrl} alt={selectedPodcast.title} className="w-40 h-40 object-cover rounded-lg shadow-md mx-auto md:mx-0 flex-shrink-0" />
                        <div className="flex-grow mt-4 md:mt-0 text-center md:text-left">
                            <h2 className="text-3xl font-extrabold text-gray-900">{selectedPodcast.title}</h2>
                            <p className="text-md text-gray-600 mt-1">{selectedPodcast.publisher}</p>
                            <p className="text-sm text-gray-500 mt-3 line-clamp-3">{selectedPodcast.description}</p>
                            <button onClick={() => toggleSubscription(selectedPodcast.id)} className={`mt-4 px-6 py-2 rounded-full font-bold transition-all ${isSubscribed ? 'bg-gray-200 text-gray-800 hover:bg-gray-300' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                                {isSubscribed ? 'Subscribed' : 'Subscribe'}
                            </button>
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                            <h3 className="text-2xl font-bold text-gray-900">Episodes</h3>
                            <div>
                                <button onClick={() => setEpisodeSortOrder('newest')} className={`px-3 py-1 text-sm rounded-l-md ${episodeSortOrder === 'newest' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}>Newest</button>
                                <button onClick={() => setEpisodeSortOrder('oldest')} className={`px-3 py-1 text-sm rounded-r-md ${episodeSortOrder === 'oldest' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}>Oldest</button>
                            </div>
                        </div>
                        {loading ? <p>Loading episodes...</p> : error ? <p className="text-red-500">{error}</p> :
                            <ul className="space-y-3">
                                {sortedEpisodes.map(ep => (
                                    <li key={ep.id} className="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition flex flex-col sm:flex-row justify-between items-start sm:items-center">
                                        <div className="flex-grow mb-2 sm:mb-0">
                                            <h4 className="font-semibold text-gray-800">{ep.title}</h4>
                                            <p className="text-xs text-gray-500">{ep.pubDate.toLocaleDateString()}</p>
                                            {episodeProgress[ep.id] > 1 && <p className="text-xs text-indigo-600 font-semibold">Resumes at {formatTime(episodeProgress[ep.id])}</p>}
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => addToQueue(selectedPodcast, ep)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-2 rounded-full transition flex items-center gap-1 text-sm">
                                                <PlusIcon /> Queue
                                            </button>
                                            <button onClick={() => playEpisode(selectedPodcast, ep)} className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-full transition flex items-center gap-2 flex-shrink-0">
                                                <PlayIcon /> Play
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>}
                    </div>
                </div>
            </div>
        );
    };

    const formatTime = (seconds) => {
        if (isNaN(seconds) || seconds < 0) return '0:00';
        const date = new Date(seconds * 1000);
        const hh = date.getUTCHours();
        const mm = date.getUTCMinutes();
        const ss = date.getUTCSeconds().toString().padStart(2, '0');
        if (hh) {
            return `${hh}:${mm.toString().padStart(2, '0')}:${ss}`;
        }
        return `${mm}:${ss}`;
    };

    const AudioPlayer = () => {
        return (
            <>
                {/* Keep audio element in DOM at all times to prevent removal errors */}
                <audio ref={audioRef} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} onEnded={handleEnded} />

                {/* Only show player UI when there's a current episode */}
                {currentEpisode && (
                    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-3 shadow-[0_-5px_15px_rgba(0,0,0,0.3)] z-30">
                        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3 w-full md:w-1/4">
                                <img src={currentEpisode.podcastImageUrl} alt={currentEpisode.title} className="w-14 h-14 rounded-md object-cover" />
                                <div className="min-w-0">
                                    <h4 className="font-semibold truncate">{currentEpisode.title}</h4>
                                    <p className="text-sm text-gray-400 truncate">{currentEpisode.podcastTitle}</p>
                                </div>
                            </div>

                            <div className="flex flex-col items-center w-full md:w-1/2">
                                <div className="flex items-center space-x-4">
                                    <button
                                        onClick={() => playPrevious()}
                                        disabled={currentQueueIndex <= 0}
                                        className={`${currentQueueIndex <= 0 ? 'opacity-50 cursor-not-allowed' : 'hover:text-indigo-300'}`}
                                        title="Previous Episode"
                                    >
                                        <PreviousIcon />
                                    </button>
                                    <button onClick={() => skipTime(-10)} title="Rewind 10s"><RewindIcon /></button>
                                    <button 
                                        onClick={() => {
                                            console.log('Play/pause button clicked. Current state:', { isPlaying, audioRef: !!audioRef.current });
                                            if (isPlaying && audioRef.current) {
                                                // Force pause immediately, then update state
                                                audioRef.current.pause();
                                            }
                                            setIsPlaying(!isPlaying);
                                        }} 
                                        className="p-2 bg-indigo-600 rounded-full"
                                    >
                                        {isPlaying ? <PauseIcon /> : <PlayIcon />}
                                    </button>
                                    <button onClick={() => skipTime(30)} title="Forward 30s"><ForwardIcon /></button>
                                    <button
                                        onClick={() => playNext()}
                                        disabled={currentQueueIndex >= queue.length - 1}
                                        className={`${currentQueueIndex >= queue.length - 1 ? 'opacity-50 cursor-not-allowed' : 'hover:text-indigo-300'}`}
                                        title="Next Episode"
                                    >
                                        <NextIcon />
                                    </button>
                                </div>
                                <div className="flex items-center gap-2 w-full mt-2">
                                    <span className="text-xs w-12 text-center">{formatTime(currentTime)}</span>
                                    <input type="range" min="0" max={duration || 100} value={currentTime} onChange={handleSeek} className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer range-sm accent-indigo-500" />
                                    <span className="text-xs w-12 text-center">{formatTime(duration)}</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-4 w-full md:w-1/4">
                                <button onClick={() => setPlaybackSpeed(s => (s >= 2 ? 0.5 : s + 0.5))} className="font-bold text-sm w-12 h-8 rounded-md bg-gray-700 hover:bg-gray-600 transition">{playbackSpeed}x</button>
                                <div className="flex items-center gap-2">
                                    <VolumeIcon />
                                    <input type="range" min="0" max="1" step="0.05" value={volume} onChange={e => setVolume(Number(e.target.value))} className="w-20 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer range-sm accent-indigo-500" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    };

    // --- Main Render Switch ---
    const renderView = () => {
        switch (activeView) {
            case 'explore': return <ExploreView />;
            case 'my-podcasts': return (currentUser && !currentUser.isAnonymous) ? <MyPodcastsView /> : <AuthView isLogin={true} />;
            case 'queue': return (currentUser && !currentUser.isAnonymous) ? <QueueView /> : <AuthView isLogin={true} />;
            case 'podcast-detail': return <PodcastDetailView />;
            case 'login': return <AuthView isLogin={true} />;
            case 'register': return <AuthView isLogin={false} />;
            default: return <ExploreView />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 font-sans pb-32">
            <style>{`body { font-family: 'Inter', sans-serif; }`}</style>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap" rel="stylesheet" />

            <Header />
            <div className="pt-[140px] sm:pt-[120px]">
                <Navigation />
                <main className="container mx-auto mt-4">
                    {isAuthReady ? renderView() : <p className="text-center p-10 font-semibold">Initializing App...</p>}
                </main>
            </div>
            <AudioPlayer />
        </div>
    );
}

// --- SVG Icons ---
const PlayIcon = () => <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M4.52 3.11L14.05 9.18a1.25 1.25 0 010 2.14L4.52 17.39A1.25 1.25 0 012.5 16.32V4.18a1.25 1.25 0 012.02-1.07z"></path></svg>;
const PauseIcon = () => <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .41.34.75.75.75h2a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-2zM12.25 3a.75.75 0 00-.75.75v12.5c0 .41.34.75.75.75h2a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-2z"></path></svg>;
const RewindIcon = () => <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M8.05 9.61L4.53 6.86a.75.75 0 00-1.06 1.06l2.9 2.9-2.9 2.9a.75.75 0 101.06 1.06l3.52-2.75a.75.75 0 000-1.52zm5.47-2.75a.75.75 0 00-1.06-1.06L9.56 8.7a.75.75 0 000 1.52l2.9 2.9a.75.75 0 101.06-1.06l-2.6-2.6 2.6-2.6z"></path></svg>;
const ForwardIcon = () => <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M11.95 9.61l3.52-2.75a.75.75 0 00-1.06-1.06L11.51 8.7a.75.75 0 000 1.52l2.9 2.9a.75.75 0 101.06-1.06l-3.52-2.75zm-5.47-2.75a.75.75 0 00-1.06 1.06l2.6 2.6-2.6 2.6a.75.75 0 101.06 1.06l2.9-2.9a.75.75 0 000-1.52L6.48 6.86z"></path></svg>;
const VolumeIcon = () => <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M9.25 4.75a.75.75 0 00-1.06.02L4.72 8.25H3a.75.75 0 00-.75.75v2c0 .41.34.75.75.75h1.72l3.47 3.48a.75.75 0 001.06-.02V4.75zM12 7.75a.75.75 0 110 1.5.75.75 0 010-1.5zM14.5 6.25a.75.75 0 10-1.5 0v4a.75.75 0 101.5 0v-4z"></path></svg>;
const PlusIcon = () => <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"></path></svg>;
const PreviousIcon = () => <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z"></path></svg>;
const NextIcon = () => <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4A1 1 0 0010 6v2.798L4.555 5.168z"></path></svg>;
