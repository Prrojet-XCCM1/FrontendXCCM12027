import { create } from 'zustand';
import { Message, Collaborator, SharedResource, UserStatus } from '../types/collaboration';

interface CollaborationStore {
    isConnected: boolean;
    activeSpaceId: string | null;
    collaborators: Collaborator[];
    messages: Message[];
    resources: SharedResource[];
    typingUsers: string[];

    // Actions
    setConnected: (connected: boolean) => void;
    setActiveSpaceId: (spaceId: string | null) => void;
    setCollaborators: (collaborators: Collaborator[]) => void;
    addMessage: (message: Message) => void;
    updateMessage: (messageId: string, updates: Partial<Message>) => void;
    setResources: (resources: SharedResource[]) => void;
    addResource: (resource: SharedResource) => void;
    setTyping: (userId: string, isTyping: boolean) => void;
    clearState: () => void;
}

export const useCollaborationStore = create<CollaborationStore>((set) => ({
    isConnected: false,
    activeSpaceId: null,
    collaborators: [],
    messages: [],
    resources: [],
    typingUsers: [],

    setConnected: (connected) => set({ isConnected: connected }),

    setActiveSpaceId: (spaceId) => set({ activeSpaceId: spaceId }),

    setCollaborators: (collaborators) => set({ collaborators }),

    addMessage: (message) => set((state) => {
        // Eviter les duplicatas (Last-Write-Wins simplifié ou dédoublonnage par ID)
        const exists = state.messages.find((m) => m.id === message.id);
        if (exists && exists.timestamp >= message.timestamp) {
            return state;
        }

        if (exists) {
            return {
                messages: state.messages.map((m) => m.id === message.id ? message : m)
            };
        }

        return {
            messages: [...state.messages, message].sort((a, b) => a.timestamp - b.timestamp)
        };
    }),

    updateMessage: (messageId, updates) => set((state) => ({
        messages: state.messages.map((m) => m.id === messageId ? { ...m, ...updates } : m)
    })),

    setResources: (resources) => set({ resources }),

    addResource: (resource) => set((state) => ({
        resources: [...state.resources, resource]
    })),

    setTyping: (userId, isTyping) => set((state) => {
        const isAlreadyTyping = state.typingUsers.includes(userId);
        if (isTyping && !isAlreadyTyping) {
            return { typingUsers: [...state.typingUsers, userId] };
        } else if (!isTyping && isAlreadyTyping) {
            return { typingUsers: state.typingUsers.filter((id) => id !== userId) };
        }
        return state;
    }),

    clearState: () => set({
        isConnected: false,
        activeSpaceId: null,
        collaborators: [],
        messages: [],
        resources: [],
        typingUsers: []
    }),
}));
