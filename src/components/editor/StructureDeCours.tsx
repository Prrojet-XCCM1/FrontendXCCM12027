/**
 * COURSE STRUCTURE COMPONENT - WITH SINGLE-SELECT FILTERS
 *
 * Right sidebar panel displaying hierarchical course library.
 * This is essentially an integration interface linking with the XCSM module
 * for granular decomposition of real user courses.
 *
 * Additions:
 * - Real courses API fetching via CourseControllerService
 * - Confirm Modal to mock sending to XCSM
 *
 * @date March 2026
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FaTimes, FaBook, FaChevronRight } from 'react-icons/fa';
import { Sparkles, Loader2 } from 'lucide-react';
import { ItemType, ITEM_COLORS } from '@/types/editor.types';
import { CourseControllerService, CourseResponse } from '@/lib';
import { useAuth } from '@/contexts/AuthContext';
import ConfirmModal from '../ui/ConfirmModal';
import { toast } from 'react-hot-toast';

interface StructureDeCoursProps {
  onClose: () => void;
}

// Helper to get background color class for items
const getItemBgClass = (type: ItemType) => {
  const bgColors: Record<ItemType, string> = {
    course: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700',
    section: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 hover:border-purple-300 dark:hover:border-purple-700',
    chapter: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 hover:border-green-300 dark:hover:border-green-700',
    paragraph: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 hover:border-orange-300 dark:hover:border-orange-700',
    notion: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700',
    exercise: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 hover:border-indigo-300 dark:hover:border-indigo-700',
  };
  return bgColors[type] || bgColors.course;
};

export const StructureDeCours: React.FC<StructureDeCoursProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<CourseResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<ItemType | null>(null);

  const [xcsmConfirm, setXcsmConfirm] = useState<{ isOpen: boolean; id: number | null }>({
    isOpen: false,
    id: null
  });

  // Filter types with exact color codes from ITEM_COLORS
  const filterTypes: { type: ItemType; label: string; color: string }[] = [
    { type: 'course', label: 'Course', color: ITEM_COLORS.course },
    { type: 'section', label: 'Section', color: ITEM_COLORS.section },
    { type: 'chapter', label: 'Chapter', color: ITEM_COLORS.chapter },
    { type: 'paragraph', label: 'Paragraph', color: ITEM_COLORS.paragraph },
    { type: 'notion', label: 'Notion', color: ITEM_COLORS.notion },
  ];

  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      const response = await CourseControllerService.getAllCourses();
      const responseData = Array.isArray(response)
        ? response
        : typeof response === 'object' && response !== null && 'data' in response
          ? (response as { data?: CourseResponse[] }).data
          : [];
      setCourses(responseData || []);
    } catch (error) {
      console.error("Erreur lors de la récupération de la bibliothèque:", error);
      toast.error("Impossible de charger la bibliothèque de cours.");
      setCourses([]); // Ensure courses is empty on error
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

  const handleSendToXCSM = (courseId: number) => {
    console.log("Transmission du cours", courseId, "au module XCSM.");
    toast("Le système XCSM de décomposition en granules n'est pas encore disponible.", {
      icon: "🚧"
    });
    setXcsmConfirm({ isOpen: false, id: null });
  };

  const renderCourse = (course: CourseResponse) => {
    const courseTitle = course.title || "Sans titre";
    if (!matchesSearch(courseTitle)) return null;

    return (
      <div key={`course-${course.id}`}>
        <div
          className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-all hover:shadow-md ${getItemBgClass('course')}`}
          onClick={() => {
            if (course.id) {
              setXcsmConfirm({ isOpen: true, id: course.id });
            } else {
              toast.error("Cours invalide.");
            }
          }}
        >
          <div className="flex items-center gap-2.5">
            <FaBook className="h-5 w-5 shrink-0" style={{ color: ITEM_COLORS.course }} />
            <div className="flex flex-col">
              <span className="text-sm font-medium line-clamp-2" style={{ color: ITEM_COLORS.course }}>
                {courseTitle}
              </span>
              {course.category && (
                <span className="text-xs text-gray-500 opacity-80 mt-0.5">{course.category}</span>
              )}
            </div>
          </div>
          <button className="shrink-0 opacity-70 hover:opacity-100" style={{ color: ITEM_COLORS.course }}>
            <FaChevronRight className="h-4 w-4" />
          </button>
        </div>
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

    if (!activeFilter || activeFilter === 'course') {
      return courses.map(course => renderCourse(course));
    }

    return (
      <div className="flex flex-col items-center justify-center p-6 text-center text-sm text-gray-500 mt-6 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
        <p className="mb-2">Aucune donnée disponible pour le filtre restreint : <strong>{activeFilter}</strong>.</p>
        <p className="text-xs opacity-70">Veuillez d'abord décomposer un cours entier via le système XCSM pour visualiser ces sous-niveaux structurés.</p>
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col bg-white dark:bg-gray-800">
      <ConfirmModal
        isOpen={xcsmConfirm.isOpen}
        onClose={() => setXcsmConfirm({ isOpen: false, id: null })}
        onConfirm={() => {
          if (xcsmConfirm.id !== null) {
            handleSendToXCSM(xcsmConfirm.id);
          }
        }}
        title="Décomposition en granules (XCSM)"
        message="Voulez-vous envoyer ce cours au module XCSM pour le décomposer en granules utilisables ?"
        confirmText="Confirmer"
        type="info"
      />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Import Knowledge / XCSM</h2>
        <button onClick={onClose} className="text-gray-400 dark:text-gray-500 transition-colors hover:text-gray-600 dark:hover:text-gray-300">
          <FaTimes className="text-sm" />
        </button>
      </div>

      {/* Search */}
      <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="relative">
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            suppressHydrationWarning
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 py-2 pl-9 pr-3 text-sm focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:focus:ring-purple-400 transition-colors"
          />
          <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Filters (preserved UI, functionality disabled pending XCSM availability) */}
      <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="mb-2 flex items-center gap-1.5">
          <svg className="h-4 w-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Filtres</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {filterTypes.map(({ type, label, color }) => (
            <button
              key={type}
              onClick={() => toggleFilter(type)}
              className={`
                cursor-pointer rounded-full px-2.5 py-1 text-xs font-medium transition-all
                ${activeFilter === type
                  ? 'ring-2 ring-offset-1 dark:ring-offset-gray-800 shadow-sm outline-2 outline outline-black dark:outline-white'
                  : 'hover:opacity-80'}
              `}
              style={{
                backgroundColor: color,
                color: 'white',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Course List */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="space-y-2">
          {renderFilteredContent()}
        </div>
      </div>

      {/* Expert Corner */}
      <div className="border-t border-gray-200 dark:border-gray-700 bg-purple-50/50 dark:bg-purple-900/10 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-purple-800 dark:text-purple-300">Expert Corner : XCSM</span>
        </div>
        <div className="space-y-3">
          {[
            { name: "Décomposition Intelligente", advice: "Envoyez vos cours complets au module XCSM, il se chargera d'en extraire les granules pédagogiques." },
            { name: "Interopérabilité", advice: "Assurez-vous que le module externe XCSM est fonctionnel avant de requérir une décomposition de haut niveau." }
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