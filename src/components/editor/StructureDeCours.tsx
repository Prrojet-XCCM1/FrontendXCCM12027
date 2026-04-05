/**
 * COURSE STRUCTURE COMPONENT - WITH SINGLE-SELECT FILTERS
 *
 * Right sidebar panel displaying hierarchical course library.
 * Integration with XCSM module for granular decomposition of real and mock courses.
 *
 * Additions:
 * - Mock courses merged with API courses
 * - Direct sending to XCSM (no confirmation)
 * - LocalStorage caching of decomposed courses
 *
 * @date March 2026
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FaTimes, FaBook, FaChevronRight } from 'react-icons/fa';
import { Sparkles, Loader2, GripVertical } from 'lucide-react';
import { ItemType, ITEM_COLORS } from '@/types/editor.types';
import { CourseControllerService, CourseResponse } from '@/lib';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';

// Import Mocks
import { 
  mockCourse1, mockCourse2, mockCourse3, mockCourse4, 
  mockCourse5, mockCourse6, mockCourse7, mockCourse8, mockCourse9 
} from '@/data/mockEditorData';

interface StructureDeCoursProps {
  onClose: () => void;
}

// Helper to get background color class for items
const getItemBgClass = (type: ItemType | string) => {
  const bgColors: Record<string, string> = {
    course: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700',
    section: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 hover:border-purple-300 dark:hover:border-purple-700',
    chapter: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 hover:border-green-300 dark:hover:border-green-700',
    paragraph: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 hover:border-orange-300 dark:hover:border-orange-700',
    notion: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700',
    exercise: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 hover:border-indigo-300 dark:hover:border-indigo-700',
  };
  return bgColors[type as string] || bgColors.course;
};

// Simple recursive function to extract granules from TipTap JSON (for API courses)
const extractTiptapGranules = (json: any, type: string) => {
  const results: any[] = [];
  const search = (node: any) => {
    if (!node) return;
    if (node.type === type) {
      results.push({
        id: node.attrs?.id || `extracted-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: node.type,
        title: node.attrs?.title || `${type.charAt(0).toUpperCase() + type.slice(1)} extrait`,
        content: node.content,
      });
    }
    if (node.content && Array.isArray(node.content)) {
      node.content.forEach(search);
    }
  };
  search(json);
  return results;
};

export const StructureDeCours: React.FC<StructureDeCoursProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<ItemType | null>(null);

  const [activeDecomposedCourse, setActiveDecomposedCourse] = useState<any | null>(null);
  const [decomposedIds, setDecomposedIds] = useState<string[]>([]);
  const [isProcessingXCSM, setIsProcessingXCSM] = useState(false);

  // Filter types with exact color codes from ITEM_COLORS
  const filterTypes: { type: ItemType; label: string; color: string }[] = [
    { type: 'course', label: 'Course', color: ITEM_COLORS.course },
    { type: 'section', label: 'Section', color: ITEM_COLORS.section },
    { type: 'chapter', label: 'Chapter', color: ITEM_COLORS.chapter },
    { type: 'paragraph', label: 'Paragraph', color: ITEM_COLORS.paragraph },
    { type: 'notion', label: 'Notion', color: ITEM_COLORS.notion },
  ];

  // Load decomposed tracking from LocalStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('xcsm_decomposed');
    if (saved) {
      try {
        setDecomposedIds(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch API Courses
      let apiCourses: any[] = [];
      try {
        const response = await CourseControllerService.getAllCourses();
        apiCourses = Array.isArray(response)
          ? response
          : typeof response === 'object' && response !== null && 'data' in response
            ? (response as { data?: CourseResponse[] }).data || []
            : [];
      } catch(e) {
        console.error("API error", e);
      }

      // Format API courses to have consistent string IDs
      const formattedApiCourses = apiCourses.map(c => ({
        ...c,
        mappedId: `api_${c.id}`,
        isMock: false
      }));

      // Format MOCK courses
      const mockList = [
        mockCourse1, mockCourse2, mockCourse3, mockCourse4, 
        mockCourse5, mockCourse6, mockCourse7, mockCourse8, mockCourse9
      ].map(c => ({
        ...c,
        mappedId: `mock_${c.id}`,
        isMock: true
      }));

      setCourses([...formattedApiCourses, ...mockList]);
    } catch (error) {
      console.error("Erreur lors de la récupération de la bibliothèque:", error);
      toast.error("Impossible de charger la bibliothèque de cours.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const toggleFilter = (type: ItemType) => {
    setActiveFilter(prev => prev === type ? null : type);
  };

  const matchesSearch = (title: string) => {
    if (!searchTerm) return true;
    return title.toLowerCase().includes(searchTerm.toLowerCase());
  };

  const handleCourseClick = async (course: any) => {
    // If we click a course, we automatically try to view its granules
    const courseIdStr = course.mappedId;

    if (decomposedIds.includes(courseIdStr)) {
      // Already decomposed (LocalStorage hit)
      setActiveDecomposedCourse(course);
      // Auto-switch filter to section to show results if it was on course
      if (!activeFilter || activeFilter === 'course') {
         setActiveFilter('section');
      }
    } else {
      // Needs to be sent to XCSM
      if (!course.isMock) {
        toast.error("Le service XCSM est momentanément indisponible (en attente de l'URL du backend).");
        return;
      }

      // Pour les mock data, affichage direct sans simulation d'envoi à XCSM
      const newList = [...decomposedIds, courseIdStr];
      setDecomposedIds(newList);
      localStorage.setItem('xcsm_decomposed', JSON.stringify(newList));
      
      setActiveDecomposedCourse(course);

      // Auto-switch filter so user sees the granules directly
      if (!activeFilter || activeFilter === 'course') {
        setActiveFilter('section');
      }
    }
  };

  const handleDragStart = (e: React.DragEvent, granule: any) => {
    // Inject custom data for the drag-n-drop editor integration
    e.dataTransfer.setData('application/xccm-knowledge', JSON.stringify(granule));
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const renderGranulesList = () => {
    if (!activeDecomposedCourse) {
      return (
        <div className="flex flex-col items-center justify-center p-6 text-center text-sm text-gray-500 mt-6 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
          <p className="mb-2">Aucune donnée disponible pour le filtre : <strong>{activeFilter}</strong>.</p>
          <p className="text-xs opacity-70">Veuillez d'abord cliquer sur un cours dans l'onglet "Course" pour le décomposer via XCSM.</p>
        </div>
      );
    }

    // Attempt to extract granules based on activeFilter
    let extracted: any[] = [];
    const filterKey = activeFilter as string;

    if (activeDecomposedCourse.isMock) {
      // Mock courses don't have Tiptap JSON, we generate placeholders representing the decomposed granules
      for(let i=1; i<=3; i++) {
        extracted.push({
          id: `mock-granule-${filterKey}-${i}`,
          type: filterKey === 'chapter' ? 'chapitre' : filterKey === 'paragraph' ? 'paragraphe' : filterKey,
          title: `${filterKey.charAt(0).toUpperCase() + filterKey.slice(1)} ${i} - ${activeDecomposedCourse.title}`,
          content: [{ type: 'paragraph', content: [{ type: 'text', text: `Contenu généré par XCSM pour ce mock ${filterKey}.`}] }]
        });
      }
    } else {
      // API Courses with TipTap content
      if (activeDecomposedCourse.content && typeof activeDecomposedCourse.content === 'string') {
        try {
          const json = JSON.parse(activeDecomposedCourse.content);
          const mappedFilterType = filterKey === 'chapter' ? 'chapitre' : filterKey === 'paragraph' ? 'paragraphe' : filterKey;
          extracted = extractTiptapGranules(json, mappedFilterType);
        } catch(e) {}
      }
    }

    if (extracted.length === 0) {
       return (
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-2">
            <button 
              onClick={() => {
                setActiveDecomposedCourse(null);
                setActiveFilter('course');
              }}
              className="flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 px-2 py-1 rounded transition-colors"
            >
              ← Retour aux cours
            </button>
          </div>
          <div className="p-4 text-center text-sm text-gray-500 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
            Aucun granule de type <b>{activeFilter}</b> n'a été trouvé dans ce cours.
          </div>
        </div>
       )
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 pb-1">
          <button 
            onClick={() => {
              setActiveDecomposedCourse(null);
              setActiveFilter('course');
            }}
            className="flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 px-2 py-1 rounded transition-colors"
          >
            ← Retour aux cours
          </button>
        </div>
        <div className="pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Granules extraites ({extracted.length}) - {activeDecomposedCourse.title}
        </div>
        {extracted.map(granule => (
          <div
            key={granule.id}
            draggable
            onDragStart={(e) => handleDragStart(e, granule)}
            className={`flex cursor-grab active:cursor-grabbing items-center justify-between rounded-lg border p-3 transition-all hover:shadow-md ${getItemBgClass(activeFilter as string)}`}
          >
            <div className="flex items-center gap-2.5">
              <GripVertical className="h-4 w-4 shrink-0 opacity-40 cursor-grab" />
              <div className="flex flex-col">
                <span className="text-sm font-medium line-clamp-2" style={{ color: ITEM_COLORS[activeFilter as keyof typeof ITEM_COLORS] }}>
                  {granule.title}
                </span>
                <span className="text-xs text-gray-500 opacity-80 mt-0.5">Glissez-déposez dans l'éditeur</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderFilteredContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-10 opacity-70">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500 mb-4" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Chargement de la bibliothèque...</p>
        </div>
      );
    }

    if (courses.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-6 text-center italic text-gray-500 mt-6 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
          La bibliothèque est vide ou inaccessible pour le moment.
        </div>
      );
    }

    // When showing 'Course' filter, display all courses
    if (!activeFilter || activeFilter === 'course') {
      return courses.map(course => {
        const courseTitle = course.title || "Sans titre";
        if (!matchesSearch(courseTitle)) return null;

        const isDecomposed = decomposedIds.includes(course.mappedId);

        return (
          <div key={`course-${course.mappedId}`}>
            <div
              className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-all hover:shadow-md ${isDecomposed ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800' : getItemBgClass('course')}`}
              onClick={() => handleCourseClick(course)}
            >
              <div className="flex items-center gap-2.5">
                <FaBook className="h-5 w-5 shrink-0" style={{ color: isDecomposed ? '#10B981' : ITEM_COLORS.course }} />
                <div className="flex flex-col">
                  <span className="text-sm font-medium line-clamp-2" style={{ color: isDecomposed ? '#10B981' : ITEM_COLORS.course }}>
                    {courseTitle}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    {course.category && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                        {course.category}
                      </span>
                    )}
                    {isDecomposed && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 uppercase">
                        Déjà décomposé
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button className="shrink-0 opacity-70 hover:opacity-100">
                <FaChevronRight className="h-4 w-4" style={{ color: isDecomposed ? '#10B981' : ITEM_COLORS.course }} />
              </button>
            </div>
          </div>
        );
      });
    }

    // If another filter is selected (Notion, Section, etc.), render the granules for the active course
    return renderGranulesList();
  };

  return (
    <div className="flex h-full flex-col bg-white dark:bg-gray-800">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-3 bg-gradient-to-r from-purple-50 to-white dark:from-gray-800 dark:to-gray-800">
        <h2 className="text-sm font-bold text-purple-900 dark:text-white flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-600" /> 
          Import Knowledge / XCSM
        </h2>
        <button onClick={onClose} className="text-gray-400 dark:text-gray-500 transition-colors hover:text-gray-600 dark:hover:text-gray-300 bg-white dark:bg-gray-700 rounded-full p-1 shadow-sm">
          <FaTimes className="text-sm" />
        </button>
      </div>

      {/* Search */}
      <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="relative">
          <input
            type="text"
            placeholder="Rechercher un cours ou une notion..."
            value={searchTerm}
            suppressHydrationWarning
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 py-2.5 pl-9 pr-3 text-sm focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:focus:ring-purple-400/20 transition-all font-medium"
          />
          <svg className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="mb-2 flex items-center gap-1.5">
           <svg className="h-4 w-4 text-purple-500 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="text-sm font-bold text-gray-700 dark:text-gray-300 tracking-wide uppercase">Niveaux de Granularité</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {filterTypes.map(({ type, label, color }) => {
            const isActive = (!activeFilter && type === 'course') || activeFilter === type;
            return (
              <button
                key={type}
                onClick={() => toggleFilter(type)}
                className={`
                  cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold transition-all
                  ${isActive
                    ? 'ring-2 ring-offset-2 dark:ring-offset-gray-800 shadow-md transform scale-105'
                    : 'hover:opacity-80 hover:shadow-sm opacity-60'}
                `}
                style={{
                  backgroundColor: color,
                  color: 'white',
                  borderColor: isActive ? 'black' : 'transparent',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Course List & Granules */}
      <div className="flex-1 overflow-y-auto px-4 py-3 relative">
        {isProcessingXCSM && (
          <div className="absolute inset-0 z-10 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg">
             <Loader2 className="h-10 w-10 animate-spin text-purple-600 mb-4" />
             <p className="text-sm font-bold text-purple-900 dark:text-purple-300">Analyse XCSM en cours...</p>
             <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Extraction des notions sémantiques</p>
          </div>
        )}
        <div className="space-y-3">
          {renderFilteredContent()}
        </div>
      </div>

      {/* Expert Corner */}
      <div className="border-t border-gray-200 dark:border-gray-700 bg-purple-50/50 dark:bg-purple-900/10 p-4 shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-purple-800 dark:text-purple-300">Expert Corner : XCSM Live</span>
        </div>
        <div className="space-y-3">
          {[
            { name: "Workflow Fluide", advice: "Cliquez sur n'importe quel cours pour l'analyser instantanément via XCSM. Une fois analysé, ses concepts (Notions, etc.) apparaîtront via les filtres de couleurs." }
          ].map((expert, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-purple-100 dark:border-purple-800">
              <p className="text-[10px] font-bold text-purple-600 dark:text-purple-400 mb-1">{expert.name}</p>
              <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-tight">{expert.advice}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StructureDeCours;