import React from 'react';
import Image from 'next/image';

interface SpaceCardProps {
    space: {
        id: string;
        title: string;
        description: string;
        memberCount: number;
        resourceCount: number;
        tags: string[];
        isPrivate: boolean;
        admin: {
            name: string;
            image: string;
        };
    };
    onJoin: (id: string) => void;
    isActive: boolean;
}

export const SpaceCard: React.FC<SpaceCardProps> = ({ space, onJoin, isActive }) => {
    return (
        <div className={`bg-white dark:bg-gray-900 rounded-xl shadow-lg dark:shadow-gray-900/50 p-6 hover:shadow-xl dark:hover:shadow-gray-900/70 transition-all duration-300 border ${isActive ? 'border-purple-500 ring-2 ring-purple-500/20' : 'border-gray-100 dark:border-gray-800'}`}>
            <div className="flex justify-between items-start mb-4">
                <div>
                    <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{space.title}</h3>
                        {space.isPrivate && (
                            <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-full flex items-center">
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                </svg>
                                Privé
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{space.description}</p>
                </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
                {space.tags.map((tag, index) => (
                    <span key={index} className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-2 py-1 rounded-full">
                        {tag}
                    </span>
                ))}
            </div>

            <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400 mb-4">
                <div className="flex items-center space-x-4">
                    <span className="flex items-center space-x-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span>{space.memberCount} membres</span>
                    </span>
                    <span className="flex items-center space-x-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>{space.resourceCount} ressources</span>
                    </span>
                </div>
            </div>

            <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                        <Image
                            src={space.admin.image}
                            alt={space.admin.name}
                            width={32}
                            height={32}
                            className="object-cover"
                        />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Administré par</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{space.admin.name}</p>
                    </div>
                </div>
                <button
                    onClick={() => onJoin(space.id)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${isActive ? 'bg-purple-100 text-purple-600 cursor-default' : 'text-white bg-purple-600 dark:bg-purple-700 hover:bg-purple-700 dark:hover:bg-purple-600'}`}
                >
                    {isActive ? 'Actif' : 'Rejoindre'}
                </button>
            </div>
        </div>
    );
};
