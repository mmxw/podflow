import { initializeApp } from 'firebase/app';
import {
    getAuth,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    signInWithCustomToken,
    signInAnonymously,
    Auth,
    User as FirebaseUser
} from 'firebase/auth';
import {
    getFirestore,
    doc,
    setDoc,
    onSnapshot,
    Firestore
} from 'firebase/firestore';
import { getGlobalVar } from '../utils';
import { User, UserData } from '../types';

class FirebaseService {
    private app: any;
    private auth: Auth | null = null;
    private db: Firestore | null = null;
    private isAvailable: boolean = false;
    private appId: string;

    constructor() {
        this.appId = getGlobalVar('__app_id', 'default-podflow-app');
        this.initialize();
    }

    private initialize() {
        const firebaseConfigString = getGlobalVar('__firebase_config', '{}');

        try {
            const firebaseConfig = JSON.parse(firebaseConfigString);
            this.isAvailable = !!(firebaseConfig.apiKey && firebaseConfig.projectId);

            if (this.isAvailable) {
                this.app = initializeApp(firebaseConfig);
                this.auth = getAuth(this.app);
                this.db = getFirestore(this.app);
                console.info("Firebase initialized successfully");
            } else {
                console.info("Running in offline mode with localStorage");
            }
        } catch (e) {
            console.warn("Firebase config not available, using localStorage fallback:", e);
            this.isAvailable = false;
        }
    }

    public get isFirebaseAvailable(): boolean {
        return this.isAvailable;
    }

    public async initializeAuth(): Promise<void> {
        if (!this.isAvailable || !this.auth) return;

        const initialAuthToken = getGlobalVar('__initial_auth_token', null);

        try {
            if (initialAuthToken) {
                await signInWithCustomToken(this.auth, initialAuthToken);
            } else {
                await signInAnonymously(this.auth);
            }
        } catch (error) {
            console.error("Authentication Error:", error);
            await signInAnonymously(this.auth); // Fallback to anonymous
        }
    }

    public onAuthStateChanged(callback: (user: User | null) => void): (() => void) | null {
        if (!this.isAvailable || !this.auth) return null;

        return onAuthStateChanged(this.auth, (firebaseUser: FirebaseUser | null) => {
            if (firebaseUser) {
                const user: User = {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email || undefined,
                    isAnonymous: firebaseUser.isAnonymous
                };
                callback(user);
            } else {
                callback(null);
            }
        });
    }

    public async signIn(email: string, password: string): Promise<void> {
        if (!this.isAvailable || !this.auth) {
            throw new Error("Firebase not available");
        }
        await signInWithEmailAndPassword(this.auth, email, password);
    }

    public async signUp(email: string, password: string): Promise<void> {
        if (!this.isAvailable || !this.auth) {
            throw new Error("Firebase not available");
        }
        await createUserWithEmailAndPassword(this.auth, email, password);
    }

    public async signOut(): Promise<void> {
        if (!this.isAvailable || !this.auth) return;
        await signOut(this.auth);
    }

    public subscribeToUserData(
        userId: string,
        callback: (data: UserData) => void,
        onError: (error: string) => void
    ): (() => void) | null {
        if (!this.isAvailable || !this.db) return null;

        const userDocRef = doc(this.db, "artifacts", this.appId, "users", userId);

        return onSnapshot(
            userDocRef,
            (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    callback({
                        subscribedPodcastIds: data.subscribedPodcastIds || [],
                        episodeProgress: data.episodeProgress || {}
                    });
                } else {
                    // Initialize data for a new user
                    callback({
                        subscribedPodcastIds: [],
                        episodeProgress: {}
                    });
                }
            },
            (err) => {
                console.error("Firestore onSnapshot error:", err);
                onError("Could not sync your data. Please refresh.");
            }
        );
    }

    public async updateUserData(userId: string, data: Partial<UserData>): Promise<void> {
        if (!this.isAvailable || !this.db) {
            throw new Error("Firebase not available");
        }

        const userDocRef = doc(this.db, "artifacts", this.appId, "users", userId);

        try {
            await setDoc(userDocRef, data, { merge: true });
        } catch (err) {
            console.error("Failed to update Firestore:", err);
            throw new Error("Your changes could not be saved.");
        }
    }
}

export const firebaseService = new FirebaseService();
