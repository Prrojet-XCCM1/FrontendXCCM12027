'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Page de callback OAuth2 (Google / GitHub).
 *
 * Le backend Spring redirige ici après authentification réussie :
 *   {FRONTEND_URL}/oauth2/callback?token=eyJ...
 *
 * FRONTEND_URL doit être configuré dans le .env du backend avec le locale inclus,
 * ex: FRONTEND_URL=http://localhost:3000/fr
 */
export default function OAuthCallbackPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { loginWithToken, user } = useAuth();
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        const token = searchParams.get('token');

        if (!token) {
            setErrorMsg('Aucun token reçu. Veuillez réessayer.');
            return;
        }

        try {
            loginWithToken(token);
        } catch {
            setErrorMsg('Connexion échouée. Le token est peut-être invalide ou expiré.');
        }
    }, [searchParams, loginWithToken]);

    // Redirection après connexion
    useEffect(() => {
        if (!user) return;
        if (user.role === 'student') router.replace('/etudashboard');
        else if (user.role === 'teacher') router.replace('/profdashboard');
        else if (user.role === 'admin') router.replace('/admindashboard');
        else router.replace('/');
    }, [user, router]);

    if (errorMsg) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">✗</div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Échec de la connexion</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">{errorMsg}</p>
                    <button
                        onClick={() => router.push('/login')}
                        className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all"
                    >
                        Retour à la connexion
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 font-medium">Connexion en cours...</p>
            </div>
        </div>
    );
}
