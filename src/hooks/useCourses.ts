// hooks/useCourses.ts
'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { CourseControllerService, CourseInteractionControllerService } from '@/lib';

export interface Course {
    image: any;
    id: number;
    title: string;
    category: string;
    description?: string;
    status: string;
    createdAt: string;
    author?: {
        id: string;
        name: string;
        email: string;
        university?: string;
        photoUrl?: string;
        image?: string;
        designation?: string;
    };
    content?: string;
    coverImage?: string | null;
    photoUrl?: string | null;
    viewCount?: number;
    likeCount?: number;
    downloadCount?: number;
    followersCount?: number;
    isLiked?: boolean;
}

interface UseCoursesReturn {
    courses: Course[];
    loading: boolean;
    error: string | null;
    fetchAllCourses: () => Promise<void>;
    fetchCourse: (courseId: number) => Promise<Course | null>;
    refetch: () => Promise<void>;
    incrementView: (courseId: number) => Promise<void>;
    toggleLike: (courseId: number) => Promise<void>;
    incrementLike: (courseId: number) => Promise<void>;
    decrementLike: (courseId: number) => Promise<void>;
    incrementDownload: (courseId: number) => Promise<void>;
    isLiked: (courseId: number) => boolean;
}

export function useCourses(): UseCoursesReturn {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [localLikes, setLocalLikes] = useState<Set<number>>(new Set());

    // Ref stable → fetchAllCourses ne se recrée pas à chaque like (plus de re-fetch en cascade)
    const localLikesRef = useRef<Set<number>>(new Set());

    const saveLikes = useCallback((likes: Set<number>) => {
        localStorage.setItem('likedCourses', JSON.stringify(Array.from(likes)));
    }, []);

    // Charger likes depuis localStorage au démarrage
    useEffect(() => {
        const savedLikes = localStorage.getItem('likedCourses');
        if (savedLikes) {
            try {
                const likedIds = JSON.parse(savedLikes) as number[];
                const newSet = new Set(likedIds);
                setLocalLikes(newSet);
                localLikesRef.current = newSet;
            } catch {
                // localStorage corrompu → ignorer
            }
        }
    }, []);

    // Sync ref + update isLiked sur les courses sans déclencher de re-fetch
    useEffect(() => {
        localLikesRef.current = localLikes;
        setCourses(prev => prev.map(course => ({
            ...course,
            isLiked: localLikes.has(course.id),
        })));
    }, [localLikes]);

    const isLiked = useCallback((courseId: number): boolean => {
        return localLikesRef.current.has(courseId);
    }, []);

    // fetchAllCourses sans dépendance sur isLiked → stable, s'exécute une seule fois
    const fetchAllCourses = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response: any = await CourseControllerService.getAllCourses();
            if (response && response.success && Array.isArray(response.data)) {
                const coursesData = response.data as Course[];
                setCourses(coursesData.map(course => ({
                    ...course,
                    isLiked: localLikesRef.current.has(course.id),
                })));
            } else {
                setCourses([]);
            }
        } catch (err) {
            console.error('❌ Erreur chargement cours:', err);
            setError(err instanceof Error ? err.message : 'Impossible de charger les cours');
            setCourses([]);
        } finally {
            setLoading(false);
        }
    }, []); // Dépendances vides → ne se recrée jamais

    /**
     * Like un cours.
     * Appelle POST /api/courses/{id}/interactions/like (toggle backend).
     * Mise à jour optimiste + sync depuis la réponse API pour avoir le vrai état.
     */
    const incrementLike = useCallback(async (courseId: number) => {
        if (localLikesRef.current.has(courseId)) return; // déjà liké

        // Optimistic update
        setLocalLikes(prev => {
            const newSet = new Set(prev);
            newSet.add(courseId);
            saveLikes(newSet);
            return newSet;
        });
        setCourses(prev => prev.map(c =>
            c.id === courseId ? { ...c, likeCount: (c.likeCount || 0) + 1, isLiked: true } : c
        ));

        try {
            const response: any = await CourseInteractionControllerService.toggleLike(courseId);
            // Sync depuis la réponse backend (source de vérité)
            const data = response?.data;
            if (data) {
                setCourses(prev => prev.map(c =>
                    c.id === courseId ? { ...c, likeCount: data.likeCount, isLiked: data.liked } : c
                ));
                if (!data.liked) {
                    // Le backend a toggleé dans le mauvais sens (état désynchronisé) → corriger localStorage
                    setLocalLikes(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(courseId);
                        saveLikes(newSet);
                        return newSet;
                    });
                }
            }
        } catch (err) {
            // Rollback
            setLocalLikes(prev => {
                const newSet = new Set(prev);
                newSet.delete(courseId);
                saveLikes(newSet);
                return newSet;
            });
            setCourses(prev => prev.map(c =>
                c.id === courseId ? { ...c, likeCount: Math.max(0, (c.likeCount || 0) - 1), isLiked: false } : c
            ));
            throw err;
        }
    }, [saveLikes]);

    /**
     * Unlike un cours.
     * Appelle POST /api/courses/{id}/interactions/like (même toggle backend).
     */
    const decrementLike = useCallback(async (courseId: number) => {
        // Optimistic update
        setLocalLikes(prev => {
            const newSet = new Set(prev);
            newSet.delete(courseId);
            saveLikes(newSet);
            return newSet;
        });
        setCourses(prev => prev.map(c =>
            c.id === courseId ? { ...c, likeCount: Math.max(0, (c.likeCount || 0) - 1), isLiked: false } : c
        ));

        try {
            const response: any = await CourseInteractionControllerService.toggleLike(courseId);
            const data = response?.data;
            if (data) {
                setCourses(prev => prev.map(c =>
                    c.id === courseId ? { ...c, likeCount: data.likeCount, isLiked: data.liked } : c
                ));
                if (data.liked) {
                    // Désync : le backend a re-liké → corriger localStorage
                    setLocalLikes(prev => {
                        const newSet = new Set(prev);
                        newSet.add(courseId);
                        saveLikes(newSet);
                        return newSet;
                    });
                }
            }
        } catch (err) {
            // Rollback
            setLocalLikes(prev => {
                const newSet = new Set(prev);
                newSet.add(courseId);
                saveLikes(newSet);
                return newSet;
            });
            setCourses(prev => prev.map(c =>
                c.id === courseId ? { ...c, likeCount: (c.likeCount || 0) + 1, isLiked: true } : c
            ));
        }
    }, [saveLikes]);

    /**
     * Toggle like/unlike — choisit l'action selon l'état réel (localLikesRef)
     */
    const toggleLike = useCallback(async (courseId: number) => {
        if (localLikesRef.current.has(courseId)) {
            await decrementLike(courseId);
        } else {
            await incrementLike(courseId);
        }
    }, [decrementLike, incrementLike]);

    const fetchCourse = useCallback(async (courseId: number): Promise<Course | null> => {
        try {
            const response: any = await CourseControllerService.getEnrichedCourse(courseId);
            if (response && response.success && response.data) {
                return { ...response.data as Course, isLiked: localLikesRef.current.has(courseId) };
            }
            return null;
        } catch (err) {
            console.error(`❌ Erreur chargement cours ${courseId}:`, err);
            throw err;
        }
    }, []);

    const incrementView = useCallback(async (courseId: number) => {
        const viewedKey = `viewed_${courseId}`;
        if (sessionStorage.getItem(viewedKey)) return;
        try {
            setCourses(prev => prev.map(c =>
                c.id === courseId ? { ...c, viewCount: (c.viewCount || 0) + 1 } : c
            ));
            await CourseInteractionControllerService.recordView(courseId);
            sessionStorage.setItem(viewedKey, 'true');
        } catch (err) {
            console.error(`❌ Erreur vue cours ${courseId}:`, err);
        }
    }, []);

    const incrementDownload = useCallback(async (courseId: number) => {
        try {
            setCourses(prev => prev.map(c =>
                c.id === courseId ? { ...c, downloadCount: (c.downloadCount || 0) + 1 } : c
            ));
            await CourseControllerService.incrementDownloadCount(courseId);
        } catch (err) {
            console.error(`❌ Erreur download cours ${courseId}:`, err);
            throw err;
        }
    }, []);

    const refetch = useCallback(async () => {
        await fetchAllCourses();
    }, [fetchAllCourses]);

    useEffect(() => {
        fetchAllCourses();
    }, [fetchAllCourses]);

    return {
        courses, loading, error,
        fetchAllCourses, fetchCourse, refetch,
        incrementView, toggleLike, incrementLike, decrementLike,
        incrementDownload, isLiked,
    };
}

import { useAuth } from '@/contexts/AuthContext';

export function useCourse(courseId: number) {
    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const { isAuthenticated, loading: authLoading } = useAuth();
    const { toggleLike: globalToggleLike, incrementDownload: globalIncrementDownload, isLiked: globalIsLiked } = useCourses();

    useEffect(() => {
        if (authLoading) return;
        if (!isAuthenticated) { setLoading(false); return; }

        const loadCourse = async () => {
            try {
                setLoading(true);
                setError(null);
                const enrichedResponse: any = await CourseControllerService.getEnrichedCourse(courseId);
                const allResponse: any = await CourseControllerService.getAllCourses();

                if (enrichedResponse?.success && enrichedResponse.data) {
                    const enrichedData = enrichedResponse.data;
                    const fullCourse = allResponse?.data?.find((c: any) => String(c.id) === String(courseId));
                    setCourse({
                        ...enrichedData,
                        content: fullCourse?.content || enrichedData.content,
                        viewCount: fullCourse?.viewCount ?? enrichedData.viewCount ?? 0,
                        likeCount: fullCourse?.likeCount ?? enrichedData.likeCount ?? 0,
                        downloadCount: fullCourse?.downloadCount ?? enrichedData.downloadCount ?? 0,
                        isLiked: globalIsLiked(courseId),
                    } as Course);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Impossible de charger le cours');
            } finally {
                setLoading(false);
            }
        };

        const recordView = async () => {
            const viewedKey = `viewed_${courseId}`;
            if (sessionStorage.getItem(viewedKey)) return;
            try {
                await CourseInteractionControllerService.recordView(courseId);
                sessionStorage.setItem(viewedKey, 'true');
                setCourse(prev => prev ? { ...prev, viewCount: (prev.viewCount || 0) + 1 } : prev);
            } catch { /* silencieux */ }
        };

        if (courseId) { loadCourse(); recordView(); }
    }, [courseId, authLoading, isAuthenticated]);

    const toggleLike = async (id: number) => {
        const currentlyLiked = course?.isLiked;
        setCourse(prev => prev && String(prev.id) === String(id)
            ? { ...prev, likeCount: currentlyLiked ? Math.max(0, (prev.likeCount || 0) - 1) : (prev.likeCount || 0) + 1, isLiked: !currentlyLiked }
            : prev
        );
        try {
            await globalToggleLike(id);
        } catch {
            // Rollback
            setCourse(prev => prev && String(prev.id) === String(id)
                ? { ...prev, likeCount: currentlyLiked ? (prev.likeCount || 0) + 1 : Math.max(0, (prev.likeCount || 0) - 1), isLiked: currentlyLiked }
                : prev
            );
        }
    };

    const incrementDownload = async (id: number) => {
        try {
            setCourse(prev => prev && String(prev.id) === String(id)
                ? { ...prev, downloadCount: (prev.downloadCount || 0) + 1 } : prev
            );
            await globalIncrementDownload(id);
        } catch { /* silencieux */ }
    };

    return { course, loading: loading || authLoading, error, toggleLike, incrementDownload };
}
