/**
 * CollabInviteModal - Collaborative session invite modal
 *
 * Allows the course author to invite collaborators via a shareable link.
 * Designed to integrate with future WebSocket-based real-time editing.
 *
 * @author ALD
 * @date April 2026
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    FaTimes,
    FaLink,
    FaCopy,
    FaCheck,
    FaUsers,
    FaUserPlus,
    FaSync,
    FaTrash,
    FaEnvelope,
    FaPaperPlane,
} from 'react-icons/fa';
import { MdGroup } from 'react-icons/md';
import { CollabCollaborator } from '@/hooks/useCollabSession';
import { useCollaboration } from '@/contexts/CollaborationContext';
import { useAuth } from '@/contexts/AuthContext';
import { GestionDesUtilisateursService } from '@/lib/services/GestionDesUtilisateursService';
import { EnrollmentControllerService } from '@/lib/services/EnrollmentControllerService';
import toast from 'react-hot-toast';

interface CollabInviteModalProps {
    isOpen: boolean;
    onClose: () => void;
    courseId: number | null;
    courseTitle: string;
    sessionId: string | null;
    shareUrl: string | null;
    collaborators: CollabCollaborator[];
    onGenerateSession: () => string;
    onResetSession: () => void;
}

const CollabInviteModal: React.FC<CollabInviteModalProps> = ({
    isOpen,
    onClose,
    courseId,
    courseTitle,
    sessionId,
    shareUrl,
    collaborators,
    onGenerateSession,
    onResetSession,
}) => {
    const [copied, setCopied] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [isInviting, setIsInviting] = useState(false);

    const linkInputRef = useRef<HTMLInputElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);
    const { isConnected, collaborators: stompCollaborators, stompClient, sendAction } = useCollaboration();
    const { user } = useAuth();

    const [allTeachers, setAllTeachers] = useState<any[]>([]);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Charger les enseignants au montage
    useEffect(() => {
        const loadTeachers = async () => {
            try {
                const resp = await GestionDesUtilisateursService.getAllTeachers1();
                setAllTeachers(resp.data || []);
            } catch (e) {
                console.error("Erreur chargement enseignants suggestions:", e);
            }
        };
        loadTeachers();
    }, []);

    // Filtrer les suggestions selon la saisie
    useEffect(() => {
        if (!inviteEmail.trim() || !showSuggestions) {
            setSuggestions([]);
            return;
        }
        const filtered = allTeachers.filter(t =>
            t.email !== user?.email && // Exclure soi-même
            ((t.firstName?.toLowerCase() + ' ' + t.lastName?.toLowerCase()).includes(inviteEmail.toLowerCase()) ||
                t.email?.toLowerCase().includes(inviteEmail.toLowerCase()))
        ).slice(0, 5); // Limiter à 5 suggestions
        setSuggestions(filtered);
    }, [inviteEmail, allTeachers, showSuggestions]);

    // Fermer les suggestions au clic extérieur
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInviteEmail = async () => {
        const query = inviteEmail.trim().toLowerCase();
        if (!query) return;

        if (query === user?.email?.toLowerCase()) {
            toast.error("Vous ne pouvez pas vous inviter vous-même.");
            return;
        }

        setIsInviting(true);
        try {
            // Vérification de l'existence de l'enseignant
            const teachersResp = await GestionDesUtilisateursService.getAllTeachers1();
            const teachers = teachersResp.data || [];

            const foundTeacher = teachers.find(t =>
                (t.email && t.email.toLowerCase() === query) ||
                (t.firstName && t.firstName.toLowerCase() === query) ||
                (t.lastName && t.lastName.toLowerCase() === query) ||
                (t.firstName && t.lastName && `${t.firstName} ${t.lastName}`.toLowerCase() === query)
            );

            if (!foundTeacher) {
                toast.error("Aucun enseignant trouvé sur la plateforme avec ces informations");
                return;
            }

            // Envoi de l'invitation réelle via l'API (Persistance) et WebSocket (Notification temps réel)
            if (foundTeacher.email && courseId) {
                try {
                    // 1. Appel API pour persister l'invitation en base de données
                    await EnrollmentControllerService.inviteUser({
                        email: foundTeacher.email,
                        courseId: Number(courseId)
                    });

                    // 2. Notification via WebSocket si connecté
                    if (isConnected && stompClient) {
                        stompClient.publish({
                            destination: `/app/projet/${courseId}/invite`,
                            body: JSON.stringify({
                                targetUserId: foundTeacher.id,
                                targetEmail: foundTeacher.email,
                                senderName: "L'auteur du cours",
                                courseId: courseId,
                                timestamp: new Date().toISOString()
                            })
                        });
                    }

                    toast.success(`Invitation envoyée et enregistrée pour ${foundTeacher.firstName} ${foundTeacher.lastName}`);
                } catch (apiError) {
                    console.error("API Error during invitation:", apiError);
                    toast.error("L'utilisateur est peut-être déjà invité ou a déjà rejoint ce cours.");
                }
            } else {
                toast.error("Informations de cours ou utilisateur manquantes pour l'invitation réelle.");
            }

            setInviteEmail('');
        } catch (error) {
            console.error(error);
            toast.error("Erreur lors de la vérification de l'utilisateur XCCM1");
        } finally {
            setIsInviting(false);
        }
    };

    // Auto-generate session when modal opens if none exists
    useEffect(() => {
        if (isOpen && !sessionId) {
            setIsGenerating(true);
            setTimeout(() => {
                onGenerateSession();
                setIsGenerating(false);
            }, 300);
        }
    }, [isOpen, sessionId, onGenerateSession]);

    // Reset copy state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setCopied(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleCopyLink = async () => {
        const urlToCopy = shareUrl || '';
        try {
            await navigator.clipboard.writeText(urlToCopy);
            setCopied(true);
            // Reset after 2 seconds
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback: select the text in the input
            linkInputRef.current?.select();
            document.execCommand('copy');
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleRegenerateLink = () => {
        setIsGenerating(true);
        setCopied(false);
        setTimeout(() => {
            onGenerateSession();
            setIsGenerating(false);
        }, 200);
    };

    const handleRevokeLink = () => {
        if (confirm('Révoquer le lien invalidera l\'accès actuel. Continuer ?')) {
            onResetSession();
            setCopied(false);
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={(e) => {
                    if (e.target === e.currentTarget) onClose();
                }}
            >
                {/* Modal Container */}
                <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-in fade-in zoom-in duration-200">

                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-purple-600 to-indigo-600">
                        <div className="flex items-center gap-3 text-white">
                            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm">
                                <MdGroup className="text-xl" />
                            </div>
                            <div>
                                <h2 className="text-base font-semibold">Travail collaboratif</h2>
                                <p className="text-xs text-white/75 truncate max-w-xs">
                                    {courseTitle || 'Nouveau cours'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                            title="Fermer"
                        >
                            <FaTimes />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="px-6 py-5 space-y-5">

                        {/* Session Status */}
                        <div className="flex items-center gap-2">
                            <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                {isConnected
                                    ? `En direct (WebSocket actif)`
                                    : 'Déconnecté / Hors-ligne'}
                            </span>
                        </div>

                        {/* Share Link Section */}
                        <div className="space-y-2">
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                <FaLink className="inline mr-1.5 text-purple-500" />
                                Lien d&apos;invitation
                            </label>

                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <input
                                        ref={linkInputRef}
                                        type="text"
                                        readOnly
                                        value={isGenerating ? 'Génération en cours…' : (shareUrl || 'Aucun lien généré')}
                                        className="w-full text-sm py-2.5 px-3 pr-10 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-mono truncate focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-default"
                                        onClick={() => linkInputRef.current?.select()}
                                        title={shareUrl || ''}
                                    />
                                    {isGenerating && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            <FaSync className="text-purple-400 animate-spin text-xs" />
                                        </div>
                                    )}
                                </div>

                                {/* Copy Button */}
                                <button
                                    onClick={handleCopyLink}
                                    disabled={!shareUrl || isGenerating}
                                    className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${copied
                                        ? 'bg-green-500 text-white'
                                        : 'bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-40 disabled:cursor-not-allowed'
                                        }`}
                                    title="Copier le lien"
                                >
                                    {copied ? (
                                        <>
                                            <FaCheck className="text-xs" />
                                            <span>Copié !</span>
                                        </>
                                    ) : (
                                        <>
                                            <FaCopy className="text-xs" />
                                            <span>Copier</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Instructions */}
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Partagez ce lien avec les personnes que vous souhaitez inviter à co-éditer ce cours.
                                Toute personne possédant ce lien pourra rejoindre la session.
                            </p>
                        </div>

                        {/* Link Actions */}
                        <div className="flex gap-2 pt-0.5">
                            <button
                                onClick={handleRegenerateLink}
                                disabled={isGenerating}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 border border-gray-200 dark:border-gray-600 transition-colors disabled:opacity-40"
                                title="Générer un nouveau lien"
                            >
                                <FaSync className={`text-xs ${isGenerating ? 'animate-spin' : ''}`} />
                                Nouveau lien
                            </button>

                            {sessionId && (
                                <button
                                    onClick={handleRevokeLink}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 border-opacity-60 transition-colors"
                                    title="Révoquer le lien actuel"
                                >
                                    <FaTrash className="text-xs" />
                                    Révoquer
                                </button>
                            )}
                        </div>

                        {/* Divider */}
                        <div className="border-t border-gray-100 dark:border-gray-700" />

                        {/* Invite by Email Section */}
                        <div className="space-y-3">
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                <FaUserPlus className="inline mr-1.5 text-blue-500" />
                                Inviter un co-éditeur
                            </label>

                            <div className="flex gap-2">
                                <div className="relative flex-1" ref={suggestionsRef}>
                                    <input
                                        type="text"
                                        placeholder="Saisissez un nom ou email..."
                                        className="w-full text-sm py-2.5 px-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
                                        value={inviteEmail}
                                        onChange={(e) => {
                                            setInviteEmail(e.target.value);
                                            setShowSuggestions(true);
                                        }}
                                        onFocus={() => setShowSuggestions(true)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleInviteEmail();
                                        }}
                                        disabled={isInviting}
                                    />

                                    {/* Suggestions Dropdown */}
                                    {showSuggestions && suggestions.length > 0 && (
                                        <div className="absolute z-[100] w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                                            {suggestions.map((teacher) => (
                                                <button
                                                    key={teacher.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setInviteEmail(teacher.email || '');
                                                        setShowSuggestions(false);
                                                    }}
                                                    className="w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-3 transition-colors border-b border-gray-50 dark:border-gray-700 last:border-0"
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs uppercase flex-shrink-0">
                                                        {teacher.firstName?.[0] || teacher.email?.[0]}{teacher.lastName?.[0] || ''}
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-sm font-semibold truncate text-gray-900 dark:text-white">
                                                            {teacher.firstName} {teacher.lastName}
                                                        </span>
                                                        <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                            {teacher.email}
                                                        </span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={handleInviteEmail}
                                    disabled={inviteEmail.trim().length < 2 || isInviting}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 shadow-sm ${inviteEmail.trim().length < 2 || isInviting
                                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-400 dark:text-blue-700 cursor-not-allowed'
                                        : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-blue-500/25 active:scale-95'
                                        }`}
                                    title="Envoyer l'invitation"
                                >
                                    {isInviting ? <FaSync className="animate-spin text-xs" /> : <FaPaperPlane className="text-xs" />}
                                    <span className="hidden sm:inline">Inviter</span>
                                </button>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-gray-100 dark:border-gray-700" />

                        {/* Collaborators Section */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    <FaUsers className="inline mr-1.5 text-indigo-500" />
                                    Collaborateurs actifs
                                    {stompCollaborators.length > 0 && (
                                        <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs">
                                            {stompCollaborators.length}
                                        </span>
                                    )}
                                </label>
                            </div>

                            {stompCollaborators.length === 0 ? (
                                <div className="text-center py-6 px-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-200 dark:border-gray-600">
                                    <FaUserPlus className="text-2xl text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Personne n&apos;a encore rejoint la session
                                    </p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                        Partagez le lien ci-dessus pour inviter des collaborateurs
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {stompCollaborators.map((collab, idx) => (
                                        <div
                                            key={collab.id || idx}
                                            className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800"
                                        >
                                            <div
                                                className="w-8 h-8 rounded-full flex items-center justify-center text-purple-700 bg-purple-100 dark:bg-purple-900 dark:text-purple-300 text-xs font-bold flex-shrink-0"
                                            >
                                                {collab.firstName?.charAt(0)?.toUpperCase() || collab.email?.charAt(0)?.toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                                                    {collab.firstName || ''} {collab.lastName || ''}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                    {collab.email}
                                                </p>
                                            </div>
                                            <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 animate-pulse" title="En direct" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                            Fermer
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default CollabInviteModal;
