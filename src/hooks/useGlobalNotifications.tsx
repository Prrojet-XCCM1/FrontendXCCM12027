'use client';

import { useEffect, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { Bell } from 'lucide-react';
import React from 'react';

export const useGlobalNotifications = () => {
    const { token, user } = useAuth();
    const [stompClient, setStompClient] = useState<Client | null>(null);

    useEffect(() => {
        if (!token || !user?.id) return;

        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';
        const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

        const client = new Client({
            webSocketFactory: () => new SockJS(`${cleanBaseUrl}/ws`),
            connectHeaders: {
                Authorization: `Bearer ${token}`
            },
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
        });

        client.onConnect = () => {
            console.log(`✅ Systèmes de notifications actif pour l'utilisateur: ${user.id}`);

            // S'abonner au topic des notifications personnelles
            client.subscribe(`/topic/notifications/${user.id}`, (message) => {
                try {
                    const notification = JSON.parse(message.body);

                    // Afficher un toast élégant pour la nouvelle notification
                    toast.custom((t) => (
                        <div
                            className={`${t.visible ? 'animate-enter' : 'animate-leave'
                                } max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 border-l-4 border-purple-500`}
                        >
                            <div className="flex-1 w-0 p-4">
                                <div className="flex items-start">
                                    <div className="flex-shrink-0 pt-0.5">
                                        <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                            <Bell className="h-6 h-6 text-purple-600 dark:text-purple-400" />
                                        </div>
                                    </div>
                                    <div className="ml-3 flex-1">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                            Nouvelle notification
                                        </p>
                                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                            {notification.message || notification.content || "Vous avez reçu une nouvelle invitation collaborative."}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex border-l border-gray-200 dark:border-gray-700">
                                <button
                                    onClick={() => toast.dismiss(t.id)}
                                    className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-purple-600 hover:text-purple-500 focus:outline-none"
                                >
                                    Fermer
                                </button>
                            </div>
                        </div>
                    ), { duration: 6000 });

                } catch (e) {
                    console.error("Erreur parsing notification STOMP:", e);
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
