'use client';

import { useEffect, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { Bell, ArrowRight } from 'lucide-react';
import React from 'react';
import { useRouter } from 'next/navigation';

/** Shape of a notification stored in localStorage */
export interface StoredNotification {
    id: string;
    courseId?: number;
    courseName?: string;
    inviterName?: string;
    token?: string;
    message?: string;
    content?: string;
    createdAt: string;
    read: boolean;
}

const STORAGE_KEY_PREFIX = 'notifications_';

/** Save a new notification to localStorage for the given userId */
export function saveNotification(userId: string | number, notif: StoredNotification) {
    if (typeof window === 'undefined') return;
    const key = `${STORAGE_KEY_PREFIX}${userId}`;
    const existing: StoredNotification[] = JSON.parse(localStorage.getItem(key) || '[]');
    // Avoid duplicates by id
    const alreadyExists = existing.some((n) => n.id === notif.id);
    if (!alreadyExists) {
        localStorage.setItem(key, JSON.stringify([notif, ...existing]));
    }
}

/** Get all notifications from localStorage for a given userId */
export function getNotifications(userId: string | number): StoredNotification[] {
    if (typeof window === 'undefined') return [];
    const key = `${STORAGE_KEY_PREFIX}${userId}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
}

/** Remove a notification by id from localStorage */
export function removeNotification(userId: string | number, notifId: string) {
    if (typeof window === 'undefined') return;
    const key = `${STORAGE_KEY_PREFIX}${userId}`;
    const existing: StoredNotification[] = JSON.parse(localStorage.getItem(key) || '[]');
    localStorage.setItem(key, JSON.stringify(existing.filter((n) => n.id !== notifId)));
}

/** Mark a notification as read */
export function markNotificationRead(userId: string | number, notifId: string) {
    if (typeof window === 'undefined') return;
    const key = `${STORAGE_KEY_PREFIX}${userId}`;
    const existing: StoredNotification[] = JSON.parse(localStorage.getItem(key) || '[]');
    localStorage.setItem(
        key,
        JSON.stringify(existing.map((n) => (n.id === notifId ? { ...n, read: true } : n)))
    );
}

export const useGlobalNotifications = () => {
    const { token, user } = useAuth();
    const [stompClient, setStompClient] = useState<Client | null>(null);
    const router = useRouter();

    useEffect(() => {
        if (!token || !user?.id) return;

        const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080').replace(/\/$/, '');

        const client = new Client({
            webSocketFactory: () => new SockJS(`${baseUrl}/ws`),
            connectHeaders: {
                Authorization: `Bearer ${token}`
            },
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
        });

        client.onConnect = () => {
            console.log(`✅ Système de notifications actif pour l'utilisateur: ${user.id}`);

            client.subscribe(`/topic/notifications/${user.id}`, (message) => {
                try {
                    const raw = JSON.parse(message.body);

                    // Build a stable ID for this notification
                    const notifId = raw.id ? String(raw.id) : `${Date.now()}-${Math.random()}`;

                    const notif: StoredNotification = {
                        id: notifId,
                        courseId: raw.courseId,
                        courseName: raw.courseName || raw.courseTitle,
                        inviterName: raw.inviterName || raw.senderName,
                        token: raw.token,
                        message: raw.message || raw.content,
                        content: raw.content || raw.message,
                        createdAt: raw.createdAt || new Date().toISOString(),
                        read: false,
                    };

                    // Persist in localStorage
                    saveNotification(user.id!, notif);

                    // Show a rich toast
                    toast.custom(
                        (t) => (
                            <div
                                className={`${t.visible ? 'animate-enter' : 'animate-leave'
                                    } max-w-md w-full bg-white dark:bg-gray-800 shadow-xl rounded-2xl pointer-events-auto flex flex-col ring-1 ring-black ring-opacity-5 border-l-4 border-purple-500 overflow-hidden`}
                            >
                                {/* Header */}
                                <div className="flex items-center gap-3 px-4 pt-4 pb-2">
                                    <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                                        <Bell className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                            Nouvelle invitation collaborative
                                        </p>
                                        {notif.courseName && (
                                            <p className="text-xs text-purple-600 dark:text-purple-400 font-medium truncate">
                                                {notif.courseName}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Message */}
                                <div className="px-4 pb-3">
                                    <p className="text-sm text-gray-600 dark:text-gray-300">
                                        {notif.inviterName
                                            ? `${notif.inviterName} vous invite à collaborer sur ce cours.`
                                            : (notif.message || 'Vous avez reçu une nouvelle invitation collaborative.')}
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className="flex border-t border-gray-100 dark:border-gray-700">
                                    <button
                                        onClick={() => {
                                            toast.dismiss(t.id);
                                            router.push('/profdashboard/notifications');
                                        }}
                                        className="flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                                    >
                                        <span>Voir invitation</span>
                                        <ArrowRight className="h-4 w-4" />
                                    </button>
                                    <div className="w-px bg-gray-100 dark:bg-gray-700" />
                                    <button
                                        onClick={() => toast.dismiss(t.id)}
                                        className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        Fermer
                                    </button>
                                </div>
                            </div>
                        ),
                        { duration: 8000 }
                    );
                } catch (e) {
                    console.error('Erreur parsing notification STOMP:', e);
                }
            });
        };

        client.activate();
        setStompClient(client);

        return () => {
            client.deactivate();
        };
    }, [token, user?.id]);

    return { stompClient };
};
