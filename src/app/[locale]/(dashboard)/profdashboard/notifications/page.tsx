'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, Clock, CheckCircle, XCircle, BookOpen, User, AlertCircle, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { CourseInvitationControllerService } from '@/lib/services/CourseInvitationControllerService';
import {
    StoredNotification,
    getNotifications,
    removeNotification,
    markNotificationRead,
    STORAGE_KEY_PREFIX,
} from '@/hooks/useGlobalNotifications';
import toast from 'react-hot-toast';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

export default function NotificationsPage() {
    const { user, token } = useAuth();
    const [notifications, setNotifications] = useState<StoredNotification[]>([]);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    // Load notifications from localStorage
    const loadNotifications = useCallback(() => {
        if (!user?.id) return;
        setNotifications(getNotifications(user.id));
    }, [user?.id]);

    useEffect(() => {
        loadNotifications();
    }, [loadNotifications]);

    // Refresh list automatically if localStorage changes (e.g. a new STOMP notification arrives)
    useEffect(() => {
        const handleStorage = (e: StorageEvent) => {
            if (user?.id && e.key === `${STORAGE_KEY_PREFIX}${user.id}`) {
                loadNotifications();
            }
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, [user?.id, loadNotifications]);

    // Local WebSocket subscription to receive notifications directly on this page
    useEffect(() => {
        if (!token || !user?.id) return;

        const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
        const client = new Client({
            webSocketFactory: () => new SockJS(`${baseUrl}/ws`),
            connectHeaders: { Authorization: `Bearer ${token}` },
            reconnectDelay: 5000,
        });

        client.onConnect = () => {
            setIsConnected(true);
            client.subscribe(`/topic/notifications/${user.id}`, () => {
                // A new notification arrived — reload from localStorage
                // (useGlobalNotifications already stored it)
                setTimeout(loadNotifications, 100);
            });
        };

        client.onDisconnect = () => setIsConnected(false);
        client.onWebSocketClose = () => setIsConnected(false);

        client.activate();
        return () => { client.deactivate(); };
    }, [token, user?.id, loadNotifications]);

    const formatDate = (dateString?: string) => {
        if (!dateString) return '';
        const options: Intl.DateTimeFormatOptions = {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        };
        return new Date(dateString).toLocaleDateString('fr-FR', options);
    };

    const handleAccept = async (notif: StoredNotification) => {
        if (!notif.token) {
            toast.error("Token d'invitation manquant. Impossible d'accepter.");
            return;
        }
        setLoadingId(notif.id);
        try {
            await CourseInvitationControllerService.acceptInvitation({ token: notif.token });
            toast.success('Invitation acceptée ! Vous êtes maintenant co-éditeur de ce cours.', {
                icon: '✅',
                duration: 5000,
            });
            // Remove from local storage after action
            removeNotification(user!.id!, notif.id);
            loadNotifications();
        } catch (err: any) {
            const msg =
                err?.body?.message || err?.message || "Erreur lors de l'acceptation.";
            toast.error(`Échec: ${msg}`);
        } finally {
            setLoadingId(null);
        }
    };

    const handleDecline = (notif: StoredNotification) => {
        removeNotification(user!.id!, notif.id);
        toast('Invitation déclinée.', { icon: '🚫' });
        loadNotifications();
    };

    const handleToggleExpand = (id: string) => {
        setExpandedId((prev) => (prev === id ? null : id));
        if (user?.id) markNotificationRead(user.id, id);
    };

    const unreadCount = notifications.filter((n) => !n.read).length;

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
                <div className="relative p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                    <Bell className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center">
                            {unreadCount}
                        </span>
                    )}
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Gérez vos invitations et alertes collaboratives
                    </p>
                </div>
            </div>

            {/* List */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-purple-100 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                        Invitations reçues
                    </h2>
                    {notifications.length > 0 && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            {notifications.length} invitation{notifications.length > 1 ? 's' : ''}
                        </span>
                    )}
                </div>

                <div className="divide-y divide-purple-50 dark:divide-gray-700/50">
                    {notifications.length === 0 ? (
                        <div className="p-16 text-center text-gray-500">
                            <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertCircle className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                                Aucune notification
                            </h3>
                            <p className="text-gray-400">
                                Vous êtes à jour ! Toutes vos invitations apparaîtront ici.
                            </p>
                        </div>
                    ) : (
                        notifications.map((notif) => (
                            <div
                                key={notif.id}
                                className={`transition-colors ${!notif.read
                                    ? 'bg-purple-50/40 dark:bg-purple-900/10'
                                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/80'
                                    }`}
                            >
                                {/* Summary row – clickable to expand */}
                                <button
                                    onClick={() => handleToggleExpand(notif.id)}
                                    className="w-full text-left px-6 py-5 flex items-start gap-4"
                                >
                                    {/* Icon */}
                                    <div className="flex-shrink-0 mt-0.5">
                                        <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                            <BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                        </div>
                                    </div>

                                    {/* Text content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            {!notif.read && (
                                                <span className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0" />
                                            )}
                                            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                                                Nouvelle invitation collaborative
                                            </h3>
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                                            {notif.inviterName
                                                ? `${notif.inviterName} vous invite à collaborer`
                                                : (notif.message || 'Cliquez pour voir les détails')}
                                            {notif.courseName && (
                                                <> sur <span className="font-medium text-gray-800 dark:text-gray-200">"{notif.courseName}"</span></>
                                            )}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {formatDate(notif.createdAt)}
                                        </p>
                                    </div>

                                    {/* Expand chevron */}
                                    <span className={`text-gray-400 mt-1 text-xs transition-transform duration-200 ${expandedId === notif.id ? 'rotate-180' : ''}`}>
                                        ▼
                                    </span>
                                </button>

                                {/* Expanded detail section */}
                                {expandedId === notif.id && (
                                    <div className="px-6 pb-6 border-t border-purple-100 dark:border-gray-700 bg-white dark:bg-gray-800/50">
                                        <div className="pt-5 space-y-4">
                                            {/* Full message */}
                                            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                                                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                                                    Détails de l'invitation
                                                </p>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {notif.courseName && (
                                                        <div className="flex items-start gap-2">
                                                            <BookOpen className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                                                            <div>
                                                                <p className="text-xs text-gray-400 uppercase font-semibold mb-0.5">Cours</p>
                                                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                                                    {notif.courseName}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {notif.inviterName && (
                                                        <div className="flex items-start gap-2">
                                                            <User className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                                            <div>
                                                                <p className="text-xs text-gray-400 uppercase font-semibold mb-0.5">Expéditeur</p>
                                                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                                                    {notif.inviterName}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                {(notif.message || notif.content) && (
                                                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                                        <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Message</p>
                                                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                                            {notif.message || notif.content}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action buttons */}
                                            <div className="flex flex-col sm:flex-row gap-3">
                                                <button
                                                    onClick={() => handleAccept(notif)}
                                                    disabled={loadingId === notif.id}
                                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-all shadow-sm shadow-purple-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <CheckCircle className="w-4 h-4" />
                                                    {loadingId === notif.id ? 'Traitement…' : 'Accepter la collaboration'}
                                                </button>
                                                <button
                                                    onClick={() => handleDecline(notif)}
                                                    disabled={loadingId === notif.id}
                                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-5 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 border border-gray-200 dark:border-gray-700 hover:border-red-200 dark:hover:border-red-800 rounded-xl font-medium transition-all disabled:opacity-50"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                    Décliner
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
