import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useCollaborationStore } from '../../store/useCollaborationStore';
import { motion, AnimatePresence } from 'framer-motion';
import { useCollaboration } from '../../hooks/useCollaboration';

interface ChatPanelProps {
    userId: string;
    userName: string;
    userImage: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ userId, userName, userImage }) => {
    const [input, setInput] = useState('');
    const { messages, typingUsers, activeSpaceId, isConnected } = useCollaborationStore();
    const { sendMessage, sendTyping } = useCollaboration({
        spaceId: activeSpaceId,
        userId,
        userName,
        userImage
    });

    const scrollRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = () => {
        if (input.trim()) {
            sendMessage(input);
            setInput('');
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
                sendTyping(false);
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);

        // Typing indicator logic
        if (!typingTimeoutRef.current) {
            sendTyping(true);
        } else {
            clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
            sendTyping(false);
            typingTimeoutRef.current = null;
        }, 3000);
    };

    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg dark:shadow-gray-900/50 flex flex-col h-[600px]">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                    Discussions
                    {isConnected && (
                        <span className="ml-3 px-2 py-0.5 text-[10px] bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center uppercase tracking-wider font-bold">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
                            Live
                        </span>
                    )}
                </h2>
            </div>

            {/* Messages Area */}
            <div
                ref={scrollRef}
                className="flex-grow overflow-y-auto p-6 space-y-6 scroll-smooth"
            >
                <AnimatePresence initial={false}>
                    {messages.map((discussion: any) => (
                        <motion.div
                            key={discussion.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="border-b border-gray-50 dark:border-gray-800/50 pb-6 last:border-0"
                        >
                            <div className="flex space-x-3">
                                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0">
                                    <Image
                                        src={discussion.senderImage || '/images/avatars/default.png'}
                                        alt={discussion.senderName}
                                        width={40}
                                        height={40}
                                        className="object-cover"
                                    />
                                </div>
                                <div className="flex-grow">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-white">{discussion.senderName}</h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {new Date(discussion.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                    <p className="text-gray-700 dark:text-gray-300 mb-3">{discussion.content}</p>

                                    <div className="flex items-center space-x-4">
                                        <button className="flex items-center space-x-1 text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-2a2 2 0 00-2 2v5m7 0h-4" />
                                            </svg>
                                            <span className="text-xs">{discussion.likes}</span>
                                        </button>
                                        <button className="text-xs text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                                            Répondre
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Typing Indicators */}
                <AnimatePresence>
                    {typingUsers.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400 italic"
                        >
                            <div className="flex space-x-1">
                                <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </div>
                            <span>Quelqu'un écrit...</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Input Area */}
            <div className="p-6 border-t border-gray-100 dark:border-gray-800">
                <div className="flex space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0">
                        <Image
                            src={userImage || "/images/avatars/default.png"}
                            alt="Votre avatar"
                            width={40}
                            height={40}
                            className="object-cover"
                        />
                    </div>
                    <div className="flex-grow">
                        <textarea
                            value={input}
                            onChange={handleChange}
                            onKeyDown={handleKeyDown}
                            placeholder="Partagez vos idées..."
                            className="w-full h-24 px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-800 transition-colors"
                        />
                        <div className="flex justify-between items-center mt-3">
                            <div className="flex space-x-2">
                                <button className="p-2 text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                    </svg>
                                </button>
                            </div>
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || !isConnected}
                                className="px-6 py-2 bg-purple-600 dark:bg-purple-700 hover:bg-purple-700 dark:hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                            >
                                Envoyer
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
