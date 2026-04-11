import { useEffect, useRef, useCallback } from 'react';
import SockJS from 'sockjs-client';
import { Client, IMessage } from '@stomp/stompjs';
import { useCollaborationStore } from '../store/useCollaborationStore';
import { Message, Collaborator, SharedResource } from '../types/collaboration';

interface UseCollaborationProps {
    spaceId: string | null;
    userId: string;
    userName: string;
    userImage: string;
}

export const useCollaboration = ({ spaceId, userId, userName, userImage }: UseCollaborationProps) => {
    const stompClient = useRef<Client | null>(null);
    const {
        setConnected,
        addMessage,
        setCollaborators,
        addResource,
        setTyping,
        setActiveSpaceId,
        clearState
    } = useCollaborationStore();

    const connect = useCallback(() => {
        if (!spaceId) return;

        const socket = new SockJS('http://localhost:8080/ws');
        stompClient.current = new Client({
            webSocketFactory: () => socket,
            debug: (str) => {
                console.log(str);
            },
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
        });

        stompClient.current.onConnect = (frame) => {
            setConnected(true);
            setActiveSpaceId(spaceId);
            console.log('Connected: ' + frame);

            // Subscribe to messages
            stompClient.current?.subscribe(`/topic/messages/${spaceId}`, (message: IMessage) => {
                const payload = JSON.parse(message.body);
                addMessage(payload);
            });

            // Subscribe to presence
            stompClient.current?.subscribe(`/topic/presence/${spaceId}`, (message: IMessage) => {
                const payload = JSON.parse(message.body);
                if (Array.isArray(payload)) {
                    setCollaborators(payload);
                }
            });

            // Subscribe to resources
            stompClient.current?.subscribe(`/topic/resources/${spaceId}`, (message: IMessage) => {
                const payload = JSON.parse(message.body);
                addResource(payload);
            });

            // Subscribe to typing indicators
            stompClient.current?.subscribe(`/topic/typing/${spaceId}`, (message: IMessage) => {
                const payload = JSON.parse(message.body);
                setTyping(payload.userId, payload.isTyping);
            });

            // Notify joining
            stompClient.current?.publish({
                destination: '/app/chat.addUser',
                body: JSON.stringify({
                    userId,
                    name: userName,
                    image: userImage,
                    spaceId,
                    type: 'USER_JOIN'
                })
            });
        };

        stompClient.current.onStompError = (frame) => {
            console.error('Broker reported error: ' + frame.headers['message']);
            console.error('Additional details: ' + frame.body);
            setConnected(false);
        };

        stompClient.current.onDisconnect = () => {
            setConnected(false);
        };

        stompClient.current.activate();
    }, [spaceId, userId, userName, userImage, addMessage, addResource, setActiveSpaceId, setCollaborators, setConnected, setTyping]);

    const disconnect = useCallback(() => {
        if (stompClient.current) {
            stompClient.current.deactivate();
            setConnected(false);
            clearState();
        }
    }, [clearState, setConnected]);

    const sendMessage = useCallback((content: string) => {
        if (stompClient.current?.connected && spaceId) {
            const messageObj: Message = {
                id: crypto.randomUUID(),
                type: 'MESSAGE_CREATE',
                content,
                sender: userId,
                senderName: userName,
                senderImage: userImage,
                timestamp: Date.now(),
                likes: 0
            };

            // Optimistic UI
            addMessage(messageObj);

            stompClient.current.publish({
                destination: '/app/chat.sendMessage',
                body: JSON.stringify(messageObj)
            });
        }
    }, [spaceId, userId, userName, userImage, addMessage]);

    const sendTyping = useCallback((isTyping: boolean) => {
        if (stompClient.current?.connected && spaceId) {
            stompClient.current.publish({
                destination: `/app/chat.typing`,
                body: JSON.stringify({ userId, spaceId, isTyping })
            });
        }
    }, [spaceId, userId]);

    useEffect(() => {
        connect();
        return () => disconnect();
    }, [connect, disconnect]);

    return {
        sendMessage,
        sendTyping,
        isConnected: stompClient.current?.connected || false,
    };
};
