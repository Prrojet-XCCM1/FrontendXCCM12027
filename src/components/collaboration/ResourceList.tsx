import React from 'react';
import { useCollaborationStore } from '../../store/useCollaborationStore';
import { SharedResource } from '../../types/collaboration';
import { motion, AnimatePresence } from 'framer-motion';

export const ResourceList: React.FC = () => {
    const { resources } = useCollaborationStore();

    const getResourceIcon = (type: SharedResource['type']) => {
        switch (type) {
            case 'course': return '📚';
            case 'document': return '📄';
            case 'presentation': return '📊';
            case 'video': return '🎥';
            default: return '📁';
        }
    };

    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg dark:shadow-gray-900/50 p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Ressources partagées</h2>
                <button className="px-4 py-2 text-sm font-medium text-white bg-purple-600 dark:bg-purple-700 hover:bg-purple-700 dark:hover:bg-purple-600 rounded-lg transition-colors flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Partager</span>
                </button>
            </div>

            <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                    {resources.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic">Aucune ressource partagée récemment</p>
                    ) : (
                        resources.map((resource: any) => (
                            <motion.div
                                key={resource.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                <div className="flex items-center space-x-4">
                                    <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-2xl">
                                        {getResourceIcon(resource.type)}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white">{resource.title}</h4>
                                        <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
                                            <span>Par {resource.author}</span>
                                            <span>•</span>
                                            <span>{resource.date}</span>
                                            <span>•</span>
                                            <span>{resource.size}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-4">
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                        {resource.downloadCount} télechargements
                                    </div>
                                    <div className="flex space-x-2">
                                        <button className="p-2 text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        </button>
                                        <button className="p-2 text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
