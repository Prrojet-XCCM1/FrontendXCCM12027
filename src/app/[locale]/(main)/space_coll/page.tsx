// src/app/espaces-collaboratifs/page.tsx
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCollaborationStore } from '@/store/useCollaborationStore';
import { ChatPanel } from '@/components/collaboration/ChatPanel';
import { PresenceList } from '@/components/collaboration/PresenceList';
import { ResourceList } from '@/components/collaboration/ResourceList';
import { SpaceCard } from '@/components/collaboration/SpaceCard';

export default function CollaborativeSpacesPage() {
  const [activeTab, setActiveTab] = useState<'spaces' | 'messages' | 'resources'>('spaces');
  const { activeSpaceId, setActiveSpaceId, messages, resources, collaborators } = useCollaborationStore();

  // Données de base pour les espaces (peuvent être fetchés via API plus tard)
  const [collaborativeSpaces] = useState([
    {
      id: '1',
      title: 'Sciences Mathématiques Avancées',
      description: 'Espace dédié aux professeurs de mathématiques pour partager des ressources et collaborer sur des projets pédagogiques.',
      memberCount: 24,
      resourceCount: 156,
      tags: ['Mathématiques', 'Université', 'Recherche'],
      isPrivate: false,
      admin: { name: 'Marie Dupont', image: '/images/avatars/teacher1.png' }
    },
    {
      id: '2',
      title: 'Physique & Sciences Expérimentales',
      description: 'Collaboration entre enseignants de physique pour développer des expériences de laboratoire innovantes.',
      memberCount: 18,
      resourceCount: 89,
      tags: ['Physique', 'Laboratoire', 'Expérimentation'],
      isPrivate: false,
      admin: { name: 'Thomas Martin', image: '/images/avatars/teacher2.png' }
    },
    {
      id: '3',
      title: 'Projet Interdisciplinaire STEM',
      description: 'Groupe de travail sur l\'intégration des technologies dans l\'enseignement des sciences.',
      memberCount: 32,
      resourceCount: 210,
      tags: ['Interdisciplinaire', 'Technologie', 'Innovation'],
      isPrivate: true,
      admin: { name: 'Sophie Bernard', image: '/images/avatars/teacher3.png' }
    },
  ]);

  // Simulation d'utilisateur actuel (normalement via context Auth)
  const currentUser = {
    id: 'user-123',
    name: 'Samuel Sean',
    image: '/images/avatars/default.png',
    role: 'Professeur'
  };

  const handleJoinSpace = (id: string) => {
    setActiveSpaceId(id);
    setActiveTab('messages');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white dark:from-gray-900 dark:to-gray-800 pt-16 transition-colors duration-300">
      {/* Hero Section */}
      <section className="relative bg-white dark:bg-gray-900 pt-10 pb-16 overflow-hidden border-b border-gray-100 dark:border-gray-800 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 dark:text-white sm:text-5xl md:text-6xl">
              <span className="block">Espaces Collaboratifs</span>
              <span className="block text-purple-600 dark:text-purple-400">Entre Enseignants</span>
            </h1>
            <p className="mt-3 max-w-2xl mx-auto text-lg text-gray-500 dark:text-gray-400 sm:text-xl">
              Collaborez, échangez des ressources pédagogiques et travaillez ensemble pour enrichir vos pratiques d'enseignement.
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('spaces')}
                className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'spaces'
                  ? 'border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span>Espaces de travail</span>
                  <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs px-2 py-1 rounded-full">
                    {collaborativeSpaces.length}
                  </span>
                </div>
              </button>

              <button
                disabled={!activeSpaceId}
                onClick={() => setActiveTab('messages')}
                className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'messages'
                  ? 'border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  } ${!activeSpaceId ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span>Discussions</span>
                  <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs px-2 py-1 rounded-full">
                    {messages.length}
                  </span>
                </div>
              </button>

              <button
                disabled={!activeSpaceId}
                onClick={() => setActiveTab('resources')}
                className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'resources'
                  ? 'border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  } ${!activeSpaceId ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Ressources partagées</span>
                  <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs px-2 py-1 rounded-full">
                    {resources.length}
                  </span>
                </div>
              </button>
            </nav>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Collaborateurs en ligne */}
          <div className="lg:col-span-1">
            <PresenceList />

            {/* CTA pour créer un espace */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-700 dark:to-indigo-700 rounded-xl shadow-lg dark:shadow-gray-900/50 p-6">
              <h3 className="text-lg font-bold text-white mb-2">Créez votre propre espace collaboratif</h3>
              <p className="text-purple-100 text-sm mb-4">Réunissez vos collègues autour d'un projet pédagogique commun</p>
              <button className="w-full bg-white text-purple-600 hover:bg-purple-50 font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Créer un espace</span>
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            {activeTab === 'spaces' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Espaces de travail</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {collaborativeSpaces.map((space) => (
                    <SpaceCard
                      key={space.id}
                      space={space}
                      onJoin={handleJoinSpace}
                      isActive={activeSpaceId === space.id}
                    />
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'messages' && activeSpaceId && (
              <ChatPanel
                userId={currentUser.id}
                userName={currentUser.name}
                userImage={currentUser.image}
              />
            )}

            {activeTab === 'resources' && activeSpaceId && (
              <ResourceList />
            )}

            {!activeSpaceId && (activeTab === 'messages' || activeTab === 'resources') && (
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-12 text-center">
                <div className="w-20 h-20 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Aucun espace sélectionné</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">Veuillez rejoindre un espace de travail pour accéder aux discussions et ressources.</p>
                <button
                  onClick={() => setActiveTab('spaces')}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Voir les espaces
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Section Statistiques */}
        <div className="mt-12 bg-white dark:bg-gray-900 rounded-xl shadow-lg dark:shadow-gray-900/50 p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Statistiques de collaboration</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/10 rounded-xl p-6">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">{resources.length || 156}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Ressources partagées</div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10 rounded-xl p-6">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">42</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Espaces actifs</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/10 rounded-xl p-6">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">{messages.length || 892}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Messages échangés</div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-900/10 rounded-xl p-6">
              <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-2">{collaborators.length || 74}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Collaborateurs actifs</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}