import React, { useState } from 'react';
import { User } from '../types';

interface AuthViewProps {
    isLogin: boolean;
    onSuccess: (user: User) => void;
    onError: (error: string) => void;
}

const AuthView: React.FC<AuthViewProps> = ({ isLogin, onSuccess, onError }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [authError, setAuthError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthError('');
        setLoading(true);

        try {
            // Simple offline authentication - just create a user with the email
            const user: User = {
                uid: `user_${Date.now()}`,
                email: email,
                isAnonymous: false
            };
            onSuccess(user);
        } catch (err: any) {
            const errorMessage = err.message || 'Authentication failed';
            setAuthError(errorMessage);
            onError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto mt-10 p-8 bg-white rounded-xl shadow-2xl">        <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">
            {isLogin ? 'Login' : 'Register'}
        </h2>

        <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 rounded-md">
            <p className="text-yellow-800 text-sm">
                Running in offline mode - your data will be saved locally
            </p>
        </div>

            <form onSubmit={handleSubmit}>
                <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Email Address"
                    required
                    disabled={loading}
                    className="w-full p-3 mb-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-50"
                />

                <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Password"
                    required
                    disabled={loading}
                    className="w-full p-3 mb-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-50"
                />

                {authError && (
                    <p className="text-red-500 text-center mb-4">{authError}</p>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className={`w-full text-white font-bold py-3 rounded-md transition disabled:opacity-50 ${isLogin
                            ? 'bg-indigo-600 hover:bg-indigo-700'
                            : 'bg-green-600 hover:bg-green-700'
                        }`}
                >
                    {loading ? 'Processing...' : (isLogin ? 'Login' : 'Create Account')}
                </button>
            </form>
        </div>
    );
};

export default AuthView;
