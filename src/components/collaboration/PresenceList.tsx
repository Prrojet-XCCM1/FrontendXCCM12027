import React from 'react';
import Image from 'next/image';
import { useCollaborationStore } from '../../store/useCollaborationStore';
import { motion, AnimatePresence } from 'framer-motion';

export const PresenceList: React.FC = () => {
    const { collaborators } = useCollaborationStore();

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'online': return 'bg-green-500';
            case 'away': return 'bg-yellow-500';
            case 'offline': return 'bg-gray-400';
            default: return 'bg-gray-400';
        }
    };

    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg dark:shadow-gray-900/50 p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Collaborateurs en ligne</h3>
                <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
            </div>
            <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                    {collaborators.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic">Aucun collaborateur connecté</p>
                    ) : (
                        collaborators.map((collaborator: any) => (
                            <motion.div
                                key={collaborator.id}
                                layout
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            >
                                <div className="flex items-center space-x-3">
                                    <div className="relative">
                                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                                            <Image
                                                src={collaborator.image || '/images/avatars/default.png'}
                                                alt={collaborator.name}
                                                width={40}
                                                height={40}
                                                className="object-cover"
                                            />
                                        </div>
                                        <div className={`absolute bottom-0 right-0 w-3 h-3 ${getStatusColor(collaborator.status)} rounded-full border-2 border-white dark:border-gray-900`}></div>
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white text-sm">{collaborator.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{collaborator.role}</p>
                                    </div>
                                </div>
                                <button className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 p-1 rounded-full hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                </button>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
