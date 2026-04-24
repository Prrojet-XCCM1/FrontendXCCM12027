'use client';

import { useGlobalNotifications } from '@/hooks/useGlobalNotifications';

/**
 * NotificationManager - A headless component that activates global 
 * notification subscriptions across all pages of the application.
 */
export default function NotificationManager() {
    // This activates the hook that subscribes to /topic/notifications/${userId}
    useGlobalNotifications();

    // This component doesn't render anything visually as it uses toast calls
    return null;
}
