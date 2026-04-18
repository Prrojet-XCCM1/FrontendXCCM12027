export type UserStatus = 'online' | 'away' | 'offline';

export interface Collaborator {
    id: string;
    name: string;
    role: string;
    image: string;
    status: UserStatus;
    institution: string;
    lastSeen?: number;
}

export interface Message {
    id: string;
    type: 'MESSAGE_CREATE' | 'MESSAGE_LIKE' | 'USER_JOIN' | 'USER_LEAVE' | 'USER_TYPING';
    content: string;
    sender: string;
    senderName: string;
    senderImage: string;
    timestamp: number;
    likes: number;
    replies?: Message[];
}

export interface SharedResource {
    id: string;
    title: string;
    type: 'course' | 'document' | 'presentation' | 'video';
    author: string;
    date: string;
    size: string;
    downloadCount: number;
}

export interface CollaborationState {
    isConnected: boolean;
    activeSpaceId: string | null;
    collaborators: Collaborator[];
    messages: Message[];
    resources: SharedResource[];
    typingUsers: Set<string>;

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
