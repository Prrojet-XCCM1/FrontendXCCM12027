// src/components/CourseComments.tsx
"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { CourseInteractionControllerService } from "@/lib";
import { CourseCommentDTO } from "@/lib/models/CourseCommentDTO";
import { MessageCircle, Send, Trash2, Edit2, X, Check } from "lucide-react";
import { toast } from "react-hot-toast";

interface CourseCommentsProps {
    courseId: number;
}

const MAX_COMMENT_LENGTH = 2000;

const CourseComments: React.FC<CourseCommentsProps> = ({ courseId }) => {
    const { user, isAuthenticated } = useAuth();
    const [comments, setComments] = useState<CourseCommentDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [newComment, setNewComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
    const [editContent, setEditContent] = useState("");

    // GET /api/courses/{id}/interactions/comments — public, pas besoin d'auth
    const fetchComments = useCallback(async () => {
        try {
            setLoading(true);
            const response: any = await CourseInteractionControllerService.getComments(courseId);
            let data: CourseCommentDTO[] = [];
            if (Array.isArray(response)) data = response;
            else if (response && Array.isArray(response.data)) data = response.data;
            else if (response && Array.isArray((response as any).content)) data = (response as any).content;
            setComments(data);
        } catch (error) {
            console.error("Erreur récupération commentaires:", error);
        } finally {
            setLoading(false);
        }
    }, [courseId]);

    useEffect(() => { fetchComments(); }, [fetchComments]);

    const handleAddComment = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        const trimmed = newComment.trim();
        if (!trimmed) return;
        if (trimmed.length > MAX_COMMENT_LENGTH) {
            toast.error(`Le commentaire ne peut pas dépasser ${MAX_COMMENT_LENGTH} caractères.`);
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await CourseInteractionControllerService.addComment(courseId, { content: trimmed });
            if (response?.success && response.data) {
                // Ajout optimiste en tête de liste, sans re-fetch
                setComments(prev => [response.data!, ...prev]);
                setNewComment("");
                toast.success("Commentaire ajouté");
            }
        } catch {
            toast.error("Échec de l'ajout du commentaire");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (commentId: number) => {
        if (!confirm("Voulez-vous vraiment supprimer ce commentaire ?")) return;
        try {
            await CourseInteractionControllerService.deleteComment(courseId, commentId);
            setComments(prev => prev.filter(c => c.id !== commentId));
            toast.success("Commentaire supprimé");
        } catch {
            toast.error("Échec de la suppression");
        }
    };

    const startEdit = (comment: CourseCommentDTO) => {
        if (!comment.id) return;
        setEditingCommentId(comment.id);
        setEditContent(comment.content || "");
    };

    const cancelEdit = () => { setEditingCommentId(null); setEditContent(""); };

    const handleUpdateComment = async (commentId: number) => {
        const trimmed = editContent.trim();
        if (!trimmed) return;
        if (trimmed.length > MAX_COMMENT_LENGTH) {
            toast.error(`Le commentaire ne peut pas dépasser ${MAX_COMMENT_LENGTH} caractères.`);
            return;
        }
        try {
            const response = await CourseInteractionControllerService.updateComment(courseId, commentId, { content: trimmed });
            if (response?.success) {
                setComments(prev => prev.map(c =>
                    c.id === commentId ? { ...c, content: trimmed, updatedAt: new Date().toISOString() } : c
                ));
                setEditingCommentId(null);
                toast.success("Commentaire modifié");
            }
        } catch {
            toast.error("Échec de la modification");
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return "";
        return new Date(dateString).toLocaleDateString('fr-FR', {
            day: 'numeric', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    };

    return (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-6 mb-8 border border-gray-100 dark:border-gray-800">
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <MessageCircle className="text-purple-600" />
                Commentaires ({comments.length})
            </h3>

            {isAuthenticated ? (
                <form onSubmit={handleAddComment} className="mb-8 relative">
                    <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Ajouter un commentaire..."
                        maxLength={MAX_COMMENT_LENGTH}
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 pr-16 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none min-h-[100px]"
                        disabled={isSubmitting}
                    />
                    <div className="flex justify-between items-center mt-1 px-1">
                        <span className={`text-xs ${newComment.length > MAX_COMMENT_LENGTH * 0.9 ? 'text-orange-500' : 'text-gray-400'}`}>
                            {newComment.length}/{MAX_COMMENT_LENGTH}
                        </span>
                    </div>
                    <button
                        type="submit"
                        disabled={isSubmitting || !newComment.trim()}
                        className="absolute top-4 right-4 bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send size={18} />
                    </button>
                </form>
            ) : (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 text-center mb-8">
                    <p className="text-gray-600 dark:text-gray-400">
                        Connectez-vous pour participer à la discussion.
                    </p>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
                </div>
            ) : comments.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                    Soyez le premier à commenter ce cours !
                </p>
            ) : (
                <div className="space-y-6">
                    {comments.map((comment) => (
                        <div key={comment.id} className="flex gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                            {/* Avatar */}
                            <div className="flex-shrink-0">
                                {comment.userPhotoUrl ? (
                                    <img src={comment.userPhotoUrl} alt={comment.userFullName} className="w-10 h-10 rounded-full object-cover" />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-purple-200 dark:bg-purple-900/50 flex items-center justify-center text-purple-700 dark:text-purple-300 font-bold">
                                        {comment.userFullName?.charAt(0).toUpperCase() || '?'}
                                    </div>
                                )}
                            </div>

                            {/* Contenu */}
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-1 gap-2">
                                    <div>
                                        <span className="font-bold text-gray-900 dark:text-white mr-2 text-sm">
                                            {comment.userFullName || "Utilisateur inconnu"}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            {formatDate(comment.createdAt)}
                                            {comment.updatedAt && comment.updatedAt !== comment.createdAt && " (modifié)"}
                                        </span>
                                    </div>

                                    {/* Actions auteur */}
                                    {isAuthenticated && user?.id === comment.userId && editingCommentId !== comment.id && (
                                        <div className="flex gap-2 flex-shrink-0">
                                            <button
                                                onClick={() => startEdit(comment)}
                                                className="text-gray-400 hover:text-purple-600 transition-colors"
                                                title="Modifier"
                                            >
                                                <Edit2 size={15} />
                                            </button>
                                            <button
                                                onClick={() => comment.id && handleDelete(comment.id)}
                                                className="text-gray-400 hover:text-red-600 transition-colors"
                                                title="Supprimer"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {editingCommentId === comment.id ? (
                                    <div className="mt-2">
                                        <textarea
                                            value={editContent}
                                            onChange={(e) => setEditContent(e.target.value)}
                                            maxLength={MAX_COMMENT_LENGTH}
                                            className="w-full bg-white dark:bg-gray-900 border rounded-lg p-3 text-sm focus:ring-1 focus:ring-purple-500 mb-2 min-h-[80px]"
                                        />
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-gray-400">{editContent.length}/{MAX_COMMENT_LENGTH}</span>
                                            <div className="flex gap-2">
                                                <button onClick={cancelEdit} className="flex items-center gap-1 text-xs px-3 py-1 text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700 rounded-md">
                                                    <X size={12} /> Annuler
                                                </button>
                                                <button onClick={() => comment.id && handleUpdateComment(comment.id)} className="flex items-center gap-1 text-xs px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-md">
                                                    <Check size={12} /> Enregistrer
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap mt-1">
                                        {comment.content}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CourseComments;
