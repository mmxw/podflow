import { UserData } from '../types';

class LocalStorageService {
    private readonly SUBSCRIPTIONS_KEY = 'podflow-subscriptions';
    private readonly PROGRESS_KEY = 'podflow-progress';

    public saveUserData(data: Partial<UserData>): void {
        try {
            if (data.subscribedPodcastIds) {
                localStorage.setItem(this.SUBSCRIPTIONS_KEY, JSON.stringify(data.subscribedPodcastIds));
            }
            if (data.episodeProgress) {
                localStorage.setItem(this.PROGRESS_KEY, JSON.stringify(data.episodeProgress));
            }
        } catch (err) {
            console.error("Failed to save to localStorage:", err);
            throw new Error("Your changes could not be saved locally.");
        }
    }

    public loadUserData(): UserData {
        const subscribedPodcastIds: string[] = [];
        const episodeProgress: Record<string, number> = {};

        try {
            const savedSubs = localStorage.getItem(this.SUBSCRIPTIONS_KEY);
            if (savedSubs) {
                subscribedPodcastIds.push(...JSON.parse(savedSubs));
            }

            const savedProgress = localStorage.getItem(this.PROGRESS_KEY);
            if (savedProgress) {
                Object.assign(episodeProgress, JSON.parse(savedProgress));
            }
        } catch (e) {
            console.error("Error loading data from localStorage:", e);
        }

        return { subscribedPodcastIds, episodeProgress };
    }

    public clearUserData(): void {
        localStorage.removeItem(this.SUBSCRIPTIONS_KEY);
        localStorage.removeItem(this.PROGRESS_KEY);
    }
}

export const localStorageService = new LocalStorageService();
