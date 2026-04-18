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

        // Simplified subscription to the project topic as per backend guide
        const subscription = stompClient.subscribe(
            `/topic/projet/${courseId}`,
            (message) => {
                try {
                    const body: CollaborationMessage = JSON.parse(message.body);
                    setLastMessage(body);

                    // Presence handling logic integrated into the unified topic
                    if (body.type === 'JOIN' || body.type === 'LEAVE') {
                        const collab = body.payload as Collaborator;
                        if (!collab || collab.id === user?.id) return;

                        if (body.type === 'JOIN') {
                            toast.success(`${collab.firstName || 'Un collaborateur'} a rejoint la session`, { id: `join-${collab.id}` });
                            setCollaborators(prev => {
                                if (prev.find(c => c.id === collab.id)) return prev;
                                return [...prev, collab];
                            });
                        } else {
                            setCollaborators(prev => prev.filter(c => c.id !== collab.id));
                        }
                    }
                } catch (e) {
                    console.error("Erreur de parsing dans le flux de collaboration:", e);
                }
            }
        );

        // Subscription to personal errors
        const errorSub = stompClient.subscribe('/user/topic/errors', (error) => {
            try {
                const errorBody = JSON.parse(error.body);
                toast.error(`Erreur de collaboration : ${errorBody.content || 'Inconnue'}`);
            } catch (e) { }
        });

        // Announce our presence
        if (user) {
            try {
                stompClient.publish({
                    destination: `/app/projet/${courseId}/presence/join`,
                    body: JSON.stringify({
                        id: user.id,
                        email: user.email,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        status: 'ONLINE',
                        type: 'JOIN'
                    })
                });
            } catch (e) { }
        }

        return () => {
            if (user && isConnected && stompClient.active) {
                stompClient.publish({
                    destination: `/app/projet/${courseId}/presence/leave`,
                    body: JSON.stringify({ id: user.id, type: 'LEAVE', status: 'OFFLINE' })
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
