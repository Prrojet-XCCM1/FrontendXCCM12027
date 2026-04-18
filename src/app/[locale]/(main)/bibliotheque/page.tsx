"use client";

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCourses } from '@/hooks/useCourses';
import { useLoading } from "@/contexts/LoadingContext";
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Heart,
  Download,
  Eye,
  Users,
  BookUp,
  Tv,
  Layout,
  X,
  BookOpen
} from "lucide-react";
import { transformTiptapToCourseData } from "@/utils/courseTransformer";
import { toast } from "react-hot-toast";
import EnrollmentButton from '@/components/EnrollmentButton';
import confetti from 'canvas-confetti';
import TeacherLink from '@/components/TeacherLink';
import { SearchControllerService, User, CourseClass, Exercise, EnrollmentControllerService } from '@/lib';
import { EnrollmentService } from '@/utils/enrollmentService';

// --- COMPOSANTS AUXILIAIRES ---

interface OrientationSelectorProps {
  isOpen: boolean;
  onSelect: (orientation: 'p' | 'l') => void;
  onClose: () => void;
  content: {
    title: string;
    description: string;
    portrait: string;
    landscape: string;
    cancel: string;
  };
}

const OrientationSelector: React.FC<OrientationSelectorProps> = ({ isOpen, onSelect, onClose, content }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl max-w-md w-full border border-purple-100 dark:border-purple-900/30">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
            <Layout className="h-6 w-6 mr-2 text-purple-600" />
            {content.title}
          </h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {content.description}
        </p>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => onSelect('p')}
            className="p-4 border-2 border-purple-50 dark:border-purple-900/20 rounded-xl hover:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-all flex flex-col items-center group"
          >
            <div className="w-12 h-16 border-2 border-purple-200 dark:border-purple-700 rounded mb-2 flex items-center justify-center group-hover:border-purple-400">
              <BookUp className="text-purple-400 group-hover:text-purple-600" />
            </div>
            <span className="font-bold text-sm text-gray-700 dark:text-gray-300">{content.portrait}</span>
          </button>
          <button
            onClick={() => onSelect('l')}
            className="p-4 border-2 border-purple-50 dark:border-purple-900/20 rounded-xl hover:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-all flex flex-col items-center group"
          >
            <div className="w-16 h-12 border-2 border-purple-200 dark:border-purple-700 rounded mb-2 flex items-center justify-center group-hover:border-purple-400">
              <Tv className="text-purple-400 group-hover:text-purple-600" />
            </div>
            <span className="font-bold text-sm text-gray-700 dark:text-gray-300">{content.landscape}</span>
          </button>
        </div>
        <div className="flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-gray-500 hover:text-gray-800 dark:hover:text-white font-medium transition-colors">
            {content.cancel}
          </button>
        </div>
      </div>
    </div>
  );
};

const StarRating = ({ rating = 5 }: { rating: number }) => (
  <div className="flex text-yellow-400 text-xs">
    {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
  </div>
);

// --- COMPOSANT PRINCIPAL ---

const Bibliotheque = () => {
  const locale = useLocale();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<{
    courses: any[];
    users: User[];
    exercises: Exercise[];
    classes: CourseClass[];
  }>({ courses: [], users: [], exercises: [], classes: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<Set<number>>(new Set());
  const [filterMode, setFilterMode] = useState<'all' | 'favorites'>('all');

  const { courses, loading, error, fetchCourse, incrementLike, decrementLike, incrementDownload } = useCourses();
  const { startLoading, stopLoading } = useLoading();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [showOrientation, setShowOrientation] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Récupérer les enrôlements de l'utilisateur
  useEffect(() => {
    const fetchEnrollments = async () => {
      if (isAuthenticated) {
        try {
          const enrollments = await EnrollmentService.getMyEnrollments();
          const ids = new Set(enrollments.map(e => e.courseId).filter((id): id is number => id !== undefined));
          setEnrolledCourseIds(ids);
        } catch (err) {
          console.error("Failed to fetch enrollments:", err);
        }
      }
    };
    fetchEnrollments();
  }, [isAuthenticated]);

  useEffect(() => {
    const performSearch = async () => {
      // Si pas de recherche, on ne fait rien ici car on utilisera la liste par défaut de useCourses
      if (!debouncedSearchTerm) {
        setSearchResults({ courses: [], users: [], exercises: [], classes: [] });
        return;
      }

      setIsSearching(true);
      try {
        const [usersRes, exercisesRes, classesRes, coursesRes] = await Promise.all([
          SearchControllerService.searchUsers(debouncedSearchTerm, { page: 0, size: 50 }).catch(err => {
            console.error("Search users failed:", err);
            return { content: [] };
          }),
          SearchControllerService.searchExercises(debouncedSearchTerm).catch(err => {
            console.error("Search exercises failed:", err);
            return [];
          }),
          SearchControllerService.searchClasses(debouncedSearchTerm).catch(err => {
            console.error("Search classes failed:", err);
            return [];
          }),
          SearchControllerService.searchCourses(debouncedSearchTerm).catch(err => {
            console.error("Search courses failed:", err);
            return [];
          })
        ]);
        setSearchResults({
          courses: coursesRes || [],
          users: (usersRes as any).content || [],
          exercises: exercisesRes || [],
          classes: classesRes || []
        });
      } catch (err) {
        console.error("Global search failed:", err);
      } finally {
        setIsSearching(false);
      }
    };

    performSearch();
  }, [debouncedSearchTerm]);
  const content = useMemo(() => (
    locale === 'fr'
      ? {
        authRequired: "Veuillez vous connecter pour acceder a la bibliotheque",
        removedFromFavorites: "Cours retire de vos favoris",
        addedToFavorites: "Cours ajoute a vos favoris !",
        likeError: "Impossible de mettre a jour le like",
        generating: "Generation de votre ressource...",
        missingData: "Donnees introuvables",
        ready: "Document pret !",
        downloadError: "Echec du telechargement",
        loadingTitle: "Chargement de votre contenu",
        loadingDescription: "Veuillez patienter un instant...",
        heroTitle: "Bibliotheque",
        heroDescription: "Accedez a l'integralite de nos cours et supports pedagogiques",
        searchPlaceholder: "Rechercher un cours, un auteur, une categorie...",
        allCourses: "Tous les cours",
        favorites: "Mes favoris",
        showingFavorites: "Affichage de vos cours favoris",
        clearFilter: "Effacer le filtre",
        noFavorites: "Aucun favori",
        emptyTitle: "Oups ! Rien n'a ete trouve",
        noFavoritesDescription: "Vous n'avez pas encore ajoute de cours a vos favoris. Cliquez sur les coeurs pour en ajouter !",
        emptyDescription: "Nous n'avons trouve aucun cours correspondant a vos criteres actuels. Essayez de reinitialiser les filtres ou de modifier votre recherche.",
        resetSearch: "Reinitialiser la recherche",
        categoryFallback: "Formation",
        favoriteBadge: "Favori",
        unknownAuthor: "Auteur inconnu",
        orientation: {
          title: "Orientation du PDF",
          description: "Comment souhaitez-vous mettre en page votre document pour l'exportation ?",
          portrait: "Portrait",
          landscape: "Paysage",
          cancel: "Annuler"
        }
      }
      : {
        authRequired: "Please sign in to access the library",
        removedFromFavorites: "Course removed from your favorites",
        addedToFavorites: "Course added to your favorites!",
        likeError: "Unable to update favorite status",
        generating: "Generating your resource...",
        missingData: "Data not found",
        ready: "Document is ready!",
        downloadError: "Download failed",
        loadingTitle: "Loading your content",
        loadingDescription: "Please wait a moment...",
        heroTitle: "Library",
        heroDescription: "Access our full catalog of courses and teaching materials",
        searchPlaceholder: "Search by course, author, or category...",
        allCourses: "All courses",
        favorites: "My favorites",
        showingFavorites: "Showing your favorite courses",
        clearFilter: "Clear filter",
        noFavorites: "No favorites yet",
        emptyTitle: "Oops! Nothing was found",
        noFavoritesDescription: "You have not added any courses to your favorites yet. Click the hearts to save some.",
        emptyDescription: "We could not find any courses matching your current filters. Try resetting the filters or changing your search.",
        resetSearch: "Reset search",
        categoryFallback: "Course",
        favoriteBadge: "Favorite",
        unknownAuthor: "Unknown author",
        orientation: {
          title: "PDF orientation",
          description: "How would you like your document to be laid out for export?",
          portrait: "Portrait",
          landscape: "Landscape",
          cancel: "Cancel"
        }
      }
  ), [locale]);

  // Redirection si non authentifié
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast.error(content.authRequired);
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router, content.authRequired]);

  useEffect(() => {
    if (loading) {
      startLoading();
    } else {
      setTimeout(() => stopLoading(), 500);
    }
  }, [loading, startLoading, stopLoading]);

  const coursesPerPage = 9;

  const filteredCourses = useMemo(() => {
    let result = [...courses];

    // 1. Gérer la recherche
    if (debouncedSearchTerm) {
      // On commence par les résultats du backend (recherche sémantique intelligente)
      const backendResults = searchResults.courses;
      
      // On ajoute un fallback frontend pour les correspondances partielles (substrings)
      // Cela permet de trouver "triangle" quand on tape "tri" même si ES ne le fait pas
      const searchLower = debouncedSearchTerm.toLowerCase();
      const frontendMatches = courses.filter(course => {
        const titleMatch = course.title?.toLowerCase().includes(searchLower);
        const descMatch = course.description?.toLowerCase().includes(searchLower);
        const authorMatch = course.author?.name?.toLowerCase().includes(searchLower);
        const categoryMatch = course.category?.toLowerCase().includes(searchLower);
        
        return titleMatch || descMatch || authorMatch || categoryMatch;
      });

      // Fusionner les résultats en évitant les doublons
      const combinedResults = [...backendResults];
      frontendMatches.forEach(feCourse => {
        if (!combinedResults.some(beCourse => beCourse.id === feCourse.id)) {
          combinedResults.push(feCourse);
        }
      });
      
      result = combinedResults;
    }

    // 2. Appliquer le filtre Favoris
    if (filterMode === 'favorites') {
      result = result.filter(course => course.isLiked);
    }

    return result;
  }, [courses, debouncedSearchTerm, searchResults.courses, filterMode]);

  // Filtrage des exercices par enrôlement (norme de sécurité)
  const displayedExercises = useMemo(() => {
    return searchResults.exercises.filter(ex => 
      ex.course?.id && enrolledCourseIds.has(ex.course.id)
    );
  }, [searchResults.exercises, enrolledCourseIds]);

  const totalPages = Math.ceil(filteredCourses.length / coursesPerPage);
  const currentCourses = filteredCourses.slice((currentPage - 1) * coursesPerPage, currentPage * coursesPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleLike = async (courseId: number) => {
    try {
      const course = courses.find(c => c.id === courseId);
      const isCurrentlyLiked = course?.isLiked || false;

      if (isCurrentlyLiked) {
        await decrementLike(courseId);
        toast(content.removedFromFavorites, {
          icon: '💔',
          style: {
            background: '#fef3c7',
            color: '#92400e',
          },
        });
      } else {
        await incrementLike(courseId);
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.8 },
          colors: ['#8B5CF6', '#EC4899', '#3B82F6']
        });
        toast.success(content.addedToFavorites);
      }
    } catch {
      toast.error(content.likeError);
    }
  };

  const handleDownloadClick = (id: number) => {
    setSelectedCourseId(id);
    setShowOrientation(true);
  };

  const handleSelectOrientation = async (orientation: 'p' | 'l') => {
    if (!selectedCourseId) return;
    setShowOrientation(false);
    const downloadToast = toast.loading(content.generating);
    try {
      await incrementDownload(selectedCourseId);
      const fullCourse = await fetchCourse(selectedCourseId);
      if (!fullCourse) throw new Error(content.missingData);
      const courseData = transformTiptapToCourseData(fullCourse);
      // await downloadCourseAsPDF(courseData, orientation); 
      console.log(courseData, orientation);
      toast.success(content.ready, { id: downloadToast });
    } catch {
      toast.error(content.downloadError, { id: downloadToast });
    } finally {
      setSelectedCourseId(null);
    }
  };

  const formatNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null) return '0';
    return num > 999 ? (num / 1000).toFixed(1) + 'k' : num.toString();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-gray-900">
        <div className="relative mb-12">
          {/* Anneau de chargement principal */}
          <div className="w-24 h-24 border-4 border-purple-200 dark:border-purple-900/30 rounded-full" />
          <div className="absolute top-0 left-0 w-24 h-24 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />

          {/* Deuxième anneau pour un effet complexe */}
          <div className="absolute top-2 left-2 w-20 h-20 border-4 border-blue-500/20 rounded-full" />
          <div className="absolute top-2 left-2 w-20 h-20 border-4 border-blue-500 border-b-transparent rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />

          {/* Logo ou icône centrale */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-gradient-to-br from-purple-600 to-blue-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(139,92,246,0.5)]" />
        </div>

        {/* Texte avec animation */}
        <div className="text-center space-y-6">
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white tracking-tight">
              {content.loadingTitle}
            </h3>
            <div className="flex justify-center space-x-1.5">
              <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium animate-pulse">
            {content.loadingDescription}
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white dark:from-gray-900 dark:to-gray-800 pt-16">
      <div className="relative h-80 bg-purple-900 overflow-hidden">
        <div className="absolute inset-0">
          <Image src="/images/ima5.jpg" alt="Biblio" fill className="object-cover opacity-50 dark:hidden" priority />
          <Image src="/images/fond3.jpg" alt="Biblio Dark" fill className="object-cover opacity-40 hidden dark:block" priority />
          <div className="absolute inset-0 bg-black/20" />
        </div>
        <div className="relative z-10 container mx-auto px-4 h-full flex flex-col items-center justify-center text-center">
          <h1 className="text-5xl font-bold text-white mb-4 drop-shadow-lg">{content.heroTitle}</h1>
          <p className="text-xl text-white/90 max-w-2xl drop-shadow">
            {content.heroDescription}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-8 relative z-20">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-8 border border-purple-100 dark:border-purple-900/30">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-grow">
              <Search className={`absolute left-4 top-1/2 -translate-y-1/2 text-purple-600 h-6 w-6 ${isSearching ? 'animate-pulse' : ''}`} />
              <input
                type="text"
                placeholder={content.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-6 py-4 border border-purple-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-purple-500 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white transition-all shadow-inner"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4 border-t border-purple-50 dark:border-gray-700 pt-4">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-6 py-2 rounded-xl font-bold transition-all ${
                filterMode === 'all'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20'
              }`}
            >
              {content.allCourses}
            </button>
            <button
              onClick={() => setFilterMode('favorites')}
              className={`px-6 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
                filterMode === 'favorites'
                  ? 'bg-red-500 text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/10'
              }`}
            >
              <Heart className={`w-4 h-4 ${filterMode === 'favorites' ? 'fill-current' : ''}`} />
              {content.favorites}
            </button>
          </div>

        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 text-red-700 p-4 rounded-xl mb-8 flex items-center">
            <span>{error}</span>
          </div>
        )}


        {!loading && !isSearching && 
          filteredCourses.length === 0 && 
          searchResults.users.length === 0 && 
          displayedExercises.length === 0 && 
          searchResults.classes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-white/50 dark:bg-gray-800/50 rounded-3xl border-2 border-dashed border-purple-100 dark:border-purple-900/20 backdrop-blur-sm">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-purple-200 dark:bg-purple-900/30 rounded-full blur-3xl opacity-20 animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-purple-100 to-white dark:from-gray-800 dark:to-gray-700 w-24 h-24 rounded-full flex items-center justify-center shadow-xl">
                  <Search className="w-12 h-12 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-red-100 dark:bg-red-900/30 p-2 rounded-full shadow-lg border-2 border-white dark:border-gray-800">
                  <X className="w-4 h-4 text-red-500" />
                </div>
              </div>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-3">{content.emptyTitle}</h3>
              <p className="max-w-md text-gray-600 dark:text-gray-400 text-lg leading-relaxed mb-8">
                {content.emptyDescription}
              </p>
              <button
                onClick={() => {
                  setSearchTerm('');
                }}
                className="flex items-center gap-2 px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-purple-500/25 active:scale-95"
              >
                {content.resetSearch}
              </button>
              {filterMode === 'favorites' && (
                <button
                  onClick={() => setFilterMode('all')}
                  className="mt-4 text-purple-600 font-bold hover:underline"
                >
                  {content.clearFilter}
                </button>
              )}
            </div>
          )}

        {(searchResults.courses.length > 0 || filteredCourses.length > 0) && (
          <div className="mb-12">
            {debouncedSearchTerm && <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center border-b pb-2"><BookUp className="mr-3 text-purple-600" /> Cours</h2>}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {!loading && currentCourses.map((course) => (
                <div key={course.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 border border-purple-50 dark:border-purple-900/20 flex flex-col overflow-hidden group">
                  <div className="relative h-52 overflow-hidden">
                    <Image
                      src={course.photoUrl || course.image || '/images/Capture2.png'}
                      alt={course.title}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3">
                      <span className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm text-purple-600 text-[10px] font-bold px-3 py-1 rounded-full uppercase shadow-sm">
                        {course.category || content.categoryFallback}
                      </span>
                    </div>
                    {course.isLiked && (
                      <div className="absolute top-3 right-3">
                        <span className="bg-red-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase shadow-sm flex items-center">
                          <Heart className="w-3 h-3 mr-1 fill-current" />
                          {content.favoriteBadge}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-5 flex flex-col flex-grow">
                    <Link href={`/courses/${course.id}`}>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 hover:text-purple-600 transition-colors leading-tight">
                        {course.title}
                      </h3>
                    </Link>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4 flex-grow">
                      {course.description}
                    </p>
                    <div className="mb-4">
                      <TeacherLink
                        teacherId={course.author?.id || ''}
                        teacherName={course.author?.name || content.unknownAuthor}
                        teacherPhoto={course.author?.image}
                        showAvatar={true}
                      />
                      <div className="mt-1 ml-10">
                        <StarRating rating={5} />
                      </div>
                    </div>

                    <div className="flex justify-between items-center px-1 py-3 border-t border-gray-100 dark:border-gray-700 mb-4">
                      <div className="flex items-center text-gray-500 text-xs gap-4">
                        <span className="flex items-center gap-1.5"><Eye className="w-4 h-4" /> {formatNumber(course.viewCount)}</span>
                        <button
                          onClick={() => handleToggleLike(course.id)}
                          className={`flex items-center gap-1.5 transition-colors ${course.isLiked
                            ? 'text-red-500 hover:text-red-600'
                            : 'text-gray-500 hover:text-red-500'
                            }`}
                        >
                          {course.isLiked ? (
                            <Heart className="w-4 h-4 fill-current" strokeWidth={1.5} />
                          ) : (
                            <Heart className="w-4 h-4" strokeWidth={1.5} />
                          )}
                          {formatNumber(course.likeCount)}
                        </button>
                        <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> {formatNumber(course.followersCount)}</span>
                        <button
                          onClick={() => handleDownloadClick(course.id)}
                          className="flex items-center gap-1.5 hover:text-purple-600 transition-colors"
                        >
                          <Download className="w-4 h-4" /> {formatNumber(course.downloadCount)}
                        </button>
                      </div>
                    </div>
                    <div className="mt-auto">
                      <EnrollmentButton
                        courseId={course.id}
                        courseAuthorId={course.author?.id}
                        size="md"
                        variant="primary"
                        fullWidth
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isSearching && searchResults.users.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center border-b pb-2"><Users className="mr-3 text-purple-600" /> Utilisateurs</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {searchResults.users.map((user) => (
                <div key={user.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 border border-purple-50 dark:border-purple-900/20 flex flex-col items-center text-center hover:shadow-xl transition-all hover:scale-105">
                  <div className="w-20 h-20 rounded-full overflow-hidden mb-4 border-4 border-purple-100 dark:border-purple-900/50">
                    <Image src={user.photoUrl || '/images/Capture2.png'} alt={`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User'} width={80} height={80} className="object-cover w-full h-full" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-lg">{`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Utilisateur'}</h3>
                  <p className="text-sm text-gray-500 mb-3">{user.email}</p>
                  <div className="mt-auto">
                    <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full text-xs font-bold uppercase">{user.role || 'Étudiant'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isSearching && displayedExercises.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center border-b pb-2"><BookOpen className="mr-3 text-purple-600" /> Exercices</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {displayedExercises.map((ex) => (
                <div key={ex.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 border border-purple-50 dark:border-purple-900/20 hover:border-purple-300 transition-colors">
                  <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-2 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-purple-500" />
                    {ex.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1 line-clamp-2">{ex.description}</p>
                  <p className="text-xs text-purple-600 dark:text-purple-400 mb-4 font-medium italic">Cours: {ex.course?.title}</p>
                  <div className="flex justify-between items-center text-xs text-gray-500 font-medium">
                    {ex.maxScore !== undefined && <span>Score: {ex.maxScore}</span>}
                    {ex.dueDate && <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">Échéance: {new Date(ex.dueDate).toLocaleDateString()}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isSearching && searchResults.classes.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center border-b pb-2"><Tv className="mr-3 text-purple-600" /> Classes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {searchResults.classes.map((cls) => (
                <div key={cls.id} className="bg-white dark:bg-gray-800 flex flex-col justify-between rounded-2xl shadow-md p-6 border border-purple-50 dark:border-purple-900/20 hover:shadow-lg transition-shadow">
                  <div className="mb-4">
                    <h3 className="font-bold text-gray-900 dark:text-white text-xl mb-1 flex items-center gap-2">
                      <Users className="w-5 h-5 text-purple-600" />
                      {cls.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{cls.description || 'Classe sans description'}</p>
                  </div>
                  <button className="w-full py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl font-bold hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors">
                    Rejoindre la classe
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && totalPages > 1 && (
          <div className="flex flex-col items-center gap-4 mt-8">
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-white dark:bg-gray-800 border disabled:opacity-30 hover:bg-purple-50"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => handlePageChange(i + 1)}
                  className={`w-10 h-10 rounded-lg font-bold transition-all ${currentPage === i + 1
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'bg-white dark:bg-gray-800 text-gray-600 hover:bg-purple-50'
                    }`}
                >
                  {i + 1}
                </button>
              ))}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg bg-white dark:bg-gray-800 border disabled:opacity-30 hover:bg-purple-50"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        <OrientationSelector
          isOpen={showOrientation}
          onSelect={handleSelectOrientation}
          onClose={() => setShowOrientation(false)}
          content={content.orientation}
        />
      </div>
    </div>
  );
};

export default Bibliotheque;
