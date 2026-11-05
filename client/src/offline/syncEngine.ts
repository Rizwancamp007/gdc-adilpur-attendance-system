import { db, type IOfflineSession } from './db';
import api from '../api/client';

export const cacheRostersForOffline = async (classesList: any[], studentsList: any[]) => {
  try {
    await db.transaction('rw', db.classes, db.students, async () => {
      await db.classes.clear();
      await db.classes.bulkPut(classesList);

      await db.students.clear();
      await db.students.bulkPut(studentsList);
    });
    console.log(`💾 Cached ${classesList.length} classes and ${studentsList.length} students for offline roll call.`);
  } catch (error) {
    console.error('Failed to cache rosters for offline use:', error);
  }
};

export const saveAttendanceLocally = async (session: Omit<IOfflineSession, 'syncStatus' | 'timestamp'>) => {
  const fullSession: IOfflineSession = {
    ...session,
    syncStatus: 'PENDING_SYNC',
    timestamp: Date.now(),
  };

  await db.offlineSessions.put(fullSession);
  return fullSession;
};

export const getPendingSyncSessions = async (): Promise<IOfflineSession[]> => {
  return await db.offlineSessions.where('syncStatus').equals('PENDING_SYNC').toArray();
};

export const syncPendingSessionsWithServer = async (): Promise<{ syncedCount: number; errors: any[] }> => {
  const pending = await getPendingSyncSessions();
  if (pending.length === 0) return { syncedCount: 0, errors: [] };

  try {
    const payload = pending.map((s) => ({
      date: s.date,
      classSectionId: s.classSectionId,
      programId: s.programId,
      academicYear: s.academicYear,
      records: s.records,
    }));

    const response = await api.post('/attendance/batch-sync', { sessions: payload });

    if (response.data.success) {
      // Mark as SYNCED
      await db.transaction('rw', db.offlineSessions, async () => {
        for (const item of pending) {
          await db.offlineSessions.update(item.idempotencyKey, { syncStatus: 'SYNCED' });
        }
      });
      return { syncedCount: pending.length, errors: [] };
    }
    return { syncedCount: 0, errors: ['Server rejected batch sync payload'] };
  } catch (error: any) {
    console.error('Batch sync network error:', error);
    return { syncedCount: 0, errors: [error.message] };
  }
};
