import { useEffect, useRef } from 'react';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';
import { useQueryClient } from '@tanstack/react-query';
import type { NotificationDto, UnreadNotificationCountDto } from '@spa/shared-types';
import { notificationQueryKeys } from '@/lib/api/notifications';
import { readEnvironment } from '@/config/env';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

/**
 * SignalR Realtime Notification hook (BR-NTF-09, 10, 11).
 * Connects to `/hubs/notifications` when authenticated, handles
 * `notificationCreated` and `unreadCountChanged` events, and resyncs on reconnect.
 */
export function useNotificationRealtime() {
  const queryClient = useQueryClient();
  const status = useAuthStore((s) => s.status);
  const accessToken = useAuthStore((s) => s.accessToken);
  const connectionRef = useRef<HubConnection | null>(null);

  useEffect(() => {
    if (import.meta.env.MODE === 'test') {
      return;
    }

    if (status !== 'authenticated' || !accessToken) {
      if (connectionRef.current) {
        connectionRef.current.stop();
        connectionRef.current = null;
      }
      return;
    }

    const { apiBaseUrl } = readEnvironment();
    if (!apiBaseUrl) return;

    const hubUrl = `${apiBaseUrl.replace(/\/+$/, '')}/hubs/notifications`;

    const connection = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => useAuthStore.getState().accessToken ?? '',
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(LogLevel.Warning)
      .build();

    connectionRef.current = connection;

    connection.on('notificationCreated', (notification: NotificationDto) => {
      toast.info(notification.title, {
        description: notification.body,
        duration: 5000,
      });
      queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all });
    });

    connection.on('unreadCountChanged', (payload: UnreadNotificationCountDto) => {
      queryClient.setQueryData(notificationQueryKeys.unreadCount(), payload);
      queryClient.invalidateQueries({ queryKey: notificationQueryKeys.list() });
    });

    connection.onreconnected(() => {
      queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all });
    });

    let isMounted = true;

    async function startConnection() {
      try {
        if (connection.state === HubConnectionState.Disconnected) {
          await connection.start();
        }
      } catch (err) {
        if (isMounted) {
          // Log only; clients resync via REST polling on reconnect (BR-NTF-10)
          console.warn('[SignalR] Failed to connect to notification hub:', err);
        }
      }
    }

    startConnection();

    return () => {
      isMounted = false;
      if (connectionRef.current) {
        connectionRef.current.stop();
        connectionRef.current = null;
      }
    };
  }, [status, accessToken, queryClient]);
}
