'use client';
import { useState, useEffect } from 'react';
import { Bell, Clock, AlertCircle, Eye } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { CourseInvitation } from '@/lib/models/CourseInvitation';
import { CourseInvitationControllerService } from '@/lib/services/CourseInvitationControllerService';
import Link from 'next/link';

export default function NotificationsPage() {
    const t = useTranslations('sidebar');
    const [invitations, setInvitations] = useState<CourseInvitation[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchInvitations = async () => {
            try {
                // Fetch real data. Note: the getInvitations route must exist in your backend.
                const data = await CourseInvitationControllerService.getInvitations();
                const invitationsList = Array.isArray(data) ? data : (data as any).data || [];
                // N'afficher que les invitations en attente si nécessaire
                setInvitations(invitationsList);
            } catch (err) {
                console.error("Erreur lors de la récupération des invitations :", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchInvitations();
    }, []);

    const formatDate = (dateString?: string) => {
        if (!dateString) return '';
        const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
        return new Date(dateString).toLocaleDateString('fr-FR', options);
    };

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                    <Bell className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Gérez vos invitations et alertes collaboratives
                    </p>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-purple-100 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Dernières invitations</h2>
                </div>

                <div className="divide-y divide-purple-50 dark:divide-gray-700/50">
                    {isLoading ? (
                        <div className="p-12 text-center text-gray-400">
                            <Clock className="w-8 h-8 mx-auto mb-3 animate-spin opacity-50" />
                            <p>Chargement de vos notifications...</p>
                        </div>
                    ) : invitations.length === 0 ? (
                        <div className="p-16 text-center text-gray-500">
                            <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertCircle className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Aucune nouvelle notification</h3>
                            <p className="text-gray-400">Vous êtes à jour ! Toutes vos invitations apparaîtront ici.</p>
                        </div>
                    ) : (
                        invitations.map((invitation) => (
                            <div key={invitation.id} className="p-6 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/80 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between group cursor-default">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`w-2 h-2 rounded-full ${invitation.status === 'PENDING' ? 'bg-purple-500' : 'bg-gray-400'}`}></span>
                                        <h3 className="font-medium text-gray-900 dark:text-white">
                                            Nouvelle invitation collaborative
                                        </h3>
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-300 ml-4">
                                        Vous avez reçu une invitation pour le cours{' '}
                                        <span className="font-semibold text-gray-800 dark:text-gray-200">"{invitation.course?.title || `Cours #${invitation.id}`}"</span>.
                                    </p>
                                    <p className="text-xs text-gray-400 ml-4 mt-2 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        Mise à jour le {formatDate(invitation.createdAt)}
                                    </p>
                                </div>
                                <div className="ml-4 sm:ml-0 mt-3 sm:mt-0 w-full sm:w-auto">
                                    <Link
                                        href={`/profdashboard/notifications/${invitation.id}`}
                                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-all shadow-sm shadow-purple-200 dark:shadow-none"
                                    >
                                        <Eye className="w-4 h-4" />
                                        <span>Voir notification</span>
                                    </Link>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
