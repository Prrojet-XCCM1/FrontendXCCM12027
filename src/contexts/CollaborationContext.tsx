'use client';

import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { Client } from '@stomp/stompjs';
import { useSocket } from '@/hooks/useSocket';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

export interface Collaborator {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    status?: 'ONLINE' | 'OFFLINE';
    type?: 'JOIN' | 'LEAVE';
}

export interface CollaborationMessage {
    type: 'MOVE' | 'LOCK' | 'UNLOCK' | 'CURSOR' | 'ERROR' | 'JOIN' | 'LEAVE';
    content?: string;
    senderEmail?: string;
    granuleId?: number;
    payload?: any;
}

interface CollaborationContextType {
    stompClient: Client | null;
    isConnected: boolean;
    courseId: number | null;
    collaborators: Collaborator[];
    sendAction: (action: CollaborationMessage) => void;
    lastMessage: CollaborationMessage | null;
}

const CollaborationContext = createContext<CollaborationContextType | undefined>(undefined);

export const CollaborationProvider = ({
    children,
    courseId
}: {
    children: ReactNode,
    courseId: number | null
}) => {
    const { stompClient, isConnected } = useSocket(courseId);
    const { user } = useAuth();
    const [collaborators, setCollaborators] = useState<Collaborator[]>([]);

    const [lastMessage, setLastMessage] = useState<CollaborationMessage | null>(null);

    useEffect(() => {
        if (!isConnected || !stompClient || !courseId) return;

        // 1. Abonnement au topic du projet (Réception)
        const subscription = stompClient.subscribe(
            `/topic/projet/${courseId}`,
            (message) => {
                try {
                    const body: CollaborationMessage = JSON.parse(message.body);
                    setLastMessage(body);

                    // Gestion de la présence via le topic unifié
                    if (body.type === 'JOIN' || body.type === 'LEAVE') {
                        const collab = body.payload as Collaborator;
                        if (!collab || collab.id === user?.id) return;

                        if (body.type === 'JOIN') {
                            setCollaborators(prev => {
                                if (prev.find(c => c.id === collab.id)) return prev;
                                return [...prev, collab];
                            });
                        } else {
                            setCollaborators(prev => prev.filter(c => c.id !== collab.id));
                        }
                    }
                } catch (e) {
                    console.error("Erreur de parsing collaboration:", e);
                }
            }
        );

        // 2. Abonnement aux erreurs personnelles
        const errorSub = stompClient.subscribe('/user/topic/errors', (error) => {
            try {
                const errorBody = JSON.parse(error.body);
                toast.error(`Erreur collaboration : ${errorBody.content || 'Action impossible'}`);
            } catch (e) { }
        });

        // 3. Annonce de présence (facultatif mais recommandé)
        if (user) {
            stompClient.publish({
                destination: `/app/projet/${courseId}/action`,
                body: JSON.stringify({
                    type: 'JOIN',
                    senderEmail: user.email,
                    payload: {
                        id: user.id,
                        email: user.email,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        status: 'ONLINE'
                    }
                })
            });
        }

        return () => {
            if (user && isConnected && stompClient.active) {
                stompClient.publish({
                    destination: `/app/projet/${courseId}/action`,
                    body: JSON.stringify({
                        type: 'LEAVE',
                        senderEmail: user.email,
                        payload: { id: user.id }
                    })
                });
            }
            subscription.unsubscribe();
            errorSub.unsubscribe();
        };
    }, [stompClient, isConnected, courseId, user]);

    const sendAction = (action: CollaborationMessage) => {
        if (stompClient?.connected && courseId) {
            stompClient.publish({
                destination: `/app/projet/${courseId}/action`,
                body: JSON.stringify({
                    ...action,
                    senderEmail: user?.email
                }),
            });
        }
    };

    return (
        <CollaborationContext.Provider value={{ stompClient, isConnected, courseId, collaborators, sendAction, lastMessage }}>
            {children}
        </CollaborationContext.Provider>
    );
};

export const useCollaboration = () => {
    const context = useContext(CollaborationContext);
    if (context === undefined) {
        throw new Error('useCollaboration doit être utilisé à l\'intérieur de CollaborationProvider');
    }
    return context;
};
