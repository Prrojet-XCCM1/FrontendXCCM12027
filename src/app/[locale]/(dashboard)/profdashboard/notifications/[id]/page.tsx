'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Check, X, ArrowLeft, Clock, User, BookOpen } from 'lucide-react';
import { CourseInvitation } from '@/lib/models/CourseInvitation';
import { CourseInvitationControllerService } from '@/lib/services/CourseInvitationControllerService';
import Link from 'next/link';

export default function NotificationValidationPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;

    const [invitation, setInvitation] = useState<CourseInvitation | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        const fetchInvitation = async () => {
            if (!id) return;
            try {
                // Fetch the list of invitations and find the one that matches our ID
                const data = await CourseInvitationControllerService.getInvitations();
                const invitationsList = Array.isArray(data) ? data : (data as any).data || [];
                const found = invitationsList.find((inv: CourseInvitation) => String(inv.id) === id);

                if (found) {
                    setInvitation(found);
                } else {
                    setErrorMsg('Invitation non trouvée.');
                }
            } catch (err) {
                console.error(err);
                setErrorMsg('Erreur lors de la récupération de la notification.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchInvitation();
    }, [id]);

    const handleAccept = async () => {
        if (!invitation) return;
        setIsActionLoading(true);
        setErrorMsg('');
        try {
            // Le token devrait être présent dans l'objet invitation renvoyé par le backend
            await CourseInvitationControllerService.acceptInvitation({ token: invitation.token || id }); // Fallback sur ID au cas où
            router.push('/profdashboard/notifications');
            router.refresh();
        } catch (error) {
            console.error("Erreur lors de l'acceptation :", error);
            setErrorMsg("Impossible d'accepter l'invitation.");
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleDecline = async () => {
        if (!invitation) return;
        setIsActionLoading(true);
        setErrorMsg('');
        try {
            await CourseInvitationControllerService.declineInvitation(invitation.id!);
            router.push('/profdashboard/notifications');
            router.refresh();
        } catch (error) {
            console.error("Erreur lors du refus :", error);
            setErrorMsg("Impossible de refuser l'invitation.");
        } finally {
            setIsActionLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64 text-gray-500">
                <Clock className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    if (errorMsg || !invitation) {
        return (
            <div className="max-w-3xl mx-auto p-4 md:p-8">
                <Link href="/profdashboard/notifications" className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-6 font-medium">
                    <ArrowLeft className="w-4 h-4" />
                    <span>Retour aux notifications</span>
                </Link>
                <div className="bg-red-50 text-red-600 p-6 rounded-2xl flex flex-col items-center justify-center text-center">
                    <X className="w-12 h-12 mb-3 opacity-50" />
                    <h2 className="text-xl font-bold mb-2">Erreur</h2>
                    <p>{errorMsg || "Cette invitation n'existe plus ou a déjà été traitée."}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Link href="/profdashboard/notifications" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-6 font-medium transition-colors">
                <ArrowLeft className="w-4 h-4" />
                <span>Retour</span>
            </Link>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-purple-100 dark:border-gray-700 overflow-hidden">
                <div className="p-8 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 text-center">
                    <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-purple-200 dark:border-purple-800">
                        <BookOpen className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Demande de collaboration</h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        Vous avez reçu une demande pour collaborer sur un cours.
                    </p>
                </div>

                <div className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 dark:bg-gray-900/50 p-6 rounded-xl border border-gray-100 dark:border-gray-800">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1 tracking-wider">Cours concerné</p>
                            <p className="text-lg font-medium text-gray-900 dark:text-white">
                                {invitation.course?.title || `Cours #${invitation.id}`}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1 tracking-wider">Expéditeur</p>
                            <div className="flex items-center gap-2">
                                <User className="w-5 h-5 text-gray-400" />
                                <span className="font-medium text-gray-800 dark:text-gray-200">
                                    {invitation.inviter?.firstName} {invitation.inviter?.lastName}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <button
                            onClick={handleAccept}
                            disabled={isActionLoading}
                            className="flex-1 flex justify-center items-center gap-2 py-3 px-6 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-all focus:ring-4 focus:ring-purple-500/20 shadow-sm shadow-purple-600/20 disabled:opacity-50"
                        >
                            <Check className="w-5 h-5" />
                            <span>Accepter la collaboration</span>
                        </button>
                        <button
                            onClick={handleDecline}
                            disabled={isActionLoading}
                            className="flex-1 flex justify-center items-center gap-2 py-3 px-6 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 border border-gray-200 dark:border-gray-700 hover:border-red-200 dark:hover:border-red-800 rounded-xl font-medium transition-all disabled:opacity-50"
                        >
                            <X className="w-5 h-5" />
                            <span>Décliner l'invitation</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
