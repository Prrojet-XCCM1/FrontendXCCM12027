'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CourseInvitationControllerService } from '@/lib';
import toast from 'react-hot-toast';
import { Check, X, Loader2, BookOpen, Users } from 'lucide-react';
import ConfirmModal from '@/components/ui/ConfirmModal';

function InvitationAcceptContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams?.get('token');
  const courseId = searchParams?.get('courseId');
  
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    if (!token) {
      toast.error("Jeton d'invitation manquant.");
    }
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    
    setIsAccepting(true);
    try {
      await CourseInvitationControllerService.acceptInvitation({ token });
      toast.success("Invitation acceptée avec succès !");
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error("Erreur lors de l'acceptation:", error);
      toast.error(error?.message || "Impossible d'accepter l'invitation.");
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDecline = () => {
    setIsDeclining(true);
    toast.success("Invitation déclinée.");
    // Redirection vers le dashboard ou l'accueil
    setTimeout(() => {
      router.push('/');
    }, 1500);
  };

  const goToEditor = () => {
    if (courseId) {
      router.push(`/editor?courseId=${courseId}`);
    } else {
      router.push('/editor');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-purple-950 flex items-center justify-center p-4">
      {/* Blobs d'arrière-plan pour un effet de "museum poster" */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

      <div className="max-w-md w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-gray-800 p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 to-blue-500"></div>
        
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 mb-6 shadow-inner transform rotate-3">
            <Users size={40} />
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-3 tracking-tight">
            Collaboration <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">Invitée</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Vous avez été invité à collaborer sur un projet pédagogique sur XCCM.
          </p>
        </div>

        <div className="space-y-4 mb-8">
          <div className="flex items-start space-x-4 p-4 rounded-2xl bg-gray-50/50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
              <BookOpen size={20} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Détails du projet</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">Projet collaboratif</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">ID: {courseId || 'Inconnu'}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col space-y-3">
          <button
            onClick={handleAccept}
            disabled={isAccepting || isDeclining || !token}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-purple-200 dark:shadow-none transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {isAccepting ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <Check size={20} />
            )}
            <span>Accepter la collaboration</span>
          </button>
          
          <button
            onClick={handleDecline}
            disabled={isAccepting || isDeclining || !token}
            className="w-full py-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold rounded-2xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {isDeclining ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <X size={20} />
            )}
            <span>Décliner l'invitation</span>
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 text-center">
          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
            XCCM &bull; Collaborative Learning Platform
          </p>
        </div>
      </div>

      <ConfirmModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          router.push('/');
        }}
        onConfirm={goToEditor}
        title="Félicitations !"
        message="Invitation acceptée. Souhaitez-vous ouvrir le projet collaboratif maintenant dans l'éditeur ?"
        confirmText="Voir le projet"
        cancelText="Plus tard"
        type="info"
      />
    </div>
  );
}

export default function InvitationAcceptPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-purple-200 dark:border-purple-900/30 rounded-full"></div>
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-purple-600 rounded-full border-t-transparent animate-spin"></div>
        </div>
      </div>
    }>
      <InvitationAcceptContent />
    </Suspense>
  );
}
