'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Check, X, ArrowLeft, Clock, User, BookOpen, AlertCircle } from 'lucide-react';
import { CourseInvitationControllerService } from '@/lib/services/CourseInvitationControllerService';
import {
    StoredNotification,
    getNotifications,
    removeNotification,
    markNotificationRead,
} from '@/hooks/useGlobalNotifications';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function NotificationValidationPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const id = params?.id as string;

    const [notification, setNotification] = useState<StoredNotification | null>(null);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        if (!id || !user?.id) return;
        const all = getNotifications(user.id);
        const found = all.find((n) => n.id === id);
        if (found) {
            setNotification(found);
            markNotificationRead(user.id, id);
        } else {
            setErrorMsg('Invitation non trouvée ou déjà traitée.');
        }
    }, [id, user?.id]);

    const formatDate = (dateString?: string) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const handleAccept = async () => {
        if (!notification) return;
        if (!notification.token) {
            toast.error("Token d'invitation manquant. Impossible d'accepter.");
            return;
        }
        setIsActionLoading(true);
        setErrorMsg('');
        try {
            await CourseInvitationControllerService.acceptInvitation({ token: notification.token });
            toast.success('Invitation acceptée ! Vous êtes maintenant co-éditeur.', {
                icon: '✅',
                duration: 5000,
            });
            removeNotification(user!.id!, notification.id);
            // Redirect to editor if courseId is available, otherwise back to list
            if (notification.courseId) {
                router.push(`/editor?courseId=${notification.courseId}`);
            } else {
                router.push('/profdashboard/notifications');
            }
        } catch (error: any) {
            const msg = error?.body?.message || error?.message || "Erreur lors de l'acceptation.";
            setErrorMsg(msg);
            toast.error(`Échec: ${msg}`);
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleDecline = () => {
        if (!notification || !user?.id) return;
        removeNotification(user.id, notification.id);
        toast('Invitation déclinée.', { icon: '🚫' });
        router.push('/profdashboard/notifications');
    };

    if (errorMsg || !notification) {
        return (
            <div className="max-w-3xl mx-auto p-4 md:p-8">
                <Link
                    href="/profdashboard/notifications"
                    className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-6 font-medium transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Retour aux notifications</span>
                </Link>
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-8 rounded-2xl flex flex-col items-center justify-center text-center border border-red-100 dark:border-red-800">
                    <AlertCircle className="w-12 h-12 mb-3 opacity-60" />
                    <h2 className="text-xl font-bold mb-2">Notification introuvable</h2>
                    <p>{errorMsg || "Cette invitation n'existe plus ou a déjà été traitée."}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Link
                href="/profdashboard/notifications"
                className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 font-medium transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                <span>Retour aux notifications</span>
            </Link>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-purple-100 dark:border-gray-700 overflow-hidden">
                {/* Top banner */}
                <div className="p-8 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 text-center">
                    <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-purple-200 dark:border-purple-800">
                        <BookOpen className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Demande de collaboration
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        Vous avez reçu une demande pour collaborer sur un cours.
                    </p>
                </div>

                {/* Details grid */}
                <div className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-gray-50 dark:bg-gray-900/50 p-6 rounded-xl border border-gray-100 dark:border-gray-800">
                        {notification.courseName && (
                            <div className="flex items-start gap-3">
                                <BookOpen className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1 tracking-wider">
                                        Cours concerné
                                    </p>
                                    <p className="text-base font-medium text-gray-900 dark:text-white">
                                        {notification.courseName}
                                    </p>
                                </div>
                            </div>
                        )}
                        {notification.inviterName && (
                            <div className="flex items-start gap-3">
                                <User className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1 tracking-wider">
                                        Expéditeur
                                    </p>
                                    <p className="text-base font-medium text-gray-800 dark:text-gray-200">
                                        {notification.inviterName}
                                    </p>
                                </div>
                            </div>
                        )}
                        <div className="flex items-start gap-3 md:col-span-2">
                            <Clock className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1 tracking-wider">
                                    Reçue le
                                </p>
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                    {formatDate(notification.createdAt)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Full message */}
                    {(notification.message || notification.content) && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-5">
                            <p className="text-xs text-blue-600 dark:text-blue-400 uppercase font-semibold mb-2 tracking-wider">
                                Message
                            </p>
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                {notification.message || notification.content}
                            </p>
                        </div>
                    )}

                    {/* Error */}
                    {errorMsg && (
                        <p className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-lg border border-red-100 dark:border-red-800">
                            {errorMsg}
                        </p>
                    )}

                    {/* CTA buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 pt-2 border-t border-gray-100 dark:border-gray-700">
                        <button
                            onClick={handleAccept}
                            disabled={isActionLoading}
                            className="flex-1 flex justify-center items-center gap-2 py-3 px-6 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-all focus:ring-4 focus:ring-purple-500/20 shadow-sm shadow-purple-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Check className="w-5 h-5" />
                            <span>{isActionLoading ? 'Traitement…' : 'Accepter la collaboration'}</span>
                        </button>
                        <button
                            onClick={handleDecline}
                            disabled={isActionLoading}
                            className="flex-1 flex justify-center items-center gap-2 py-3 px-6 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 border border-gray-200 dark:border-gray-700 hover:border-red-200 dark:hover:border-red-800 rounded-xl font-medium transition-all disabled:opacity-50"
                        >
                            <X className="w-5 h-5" />
                            <span>Décliner l'invitation</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
