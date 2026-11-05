import Dexie, { type Table } from 'dexie';

export interface IOfflineStudent {
  _id: string;
  rollNo: string;
  fullName: string;
  fatherName: string;
  classSectionId: string;
  parentPhone: string;
  consecutiveAbsences: number;
}

export interface IOfflineClass {
  _id: string;
  name: string;
  yearLevel: string;
  section: string;
  programId: {
    _id: string;
    name: string;
    code: string;
  };
}

export interface IOfflineAttendanceRecord {
  studentId: string;
  rollNo: string;
  studentName: string;
  fatherName?: string;
  parentPhone: string;
  status: 'PRESENT' | 'ABSENT' | 'LEAVE';
  consecutiveAbsences: number;
}

export interface IOfflineSession {
  idempotencyKey: string; // `${date}_${classSectionId}`
  date: string;
  classSectionId: string;
  programId: string;
  academicYear: string;
  records: IOfflineAttendanceRecord[];
  presentCount: number;
  absentCount: number;
  leaveCount: number;
  syncStatus: 'PENDING_SYNC' | 'SYNCED';
  timestamp: number;
}

export class AttendanceDexieDB extends Dexie {
  classes!: Table<IOfflineClass, string>;
  students!: Table<IOfflineStudent, string>;
  offlineSessions!: Table<IOfflineSession, string>;

  constructor() {
    super('GDC_Adilpur_Attendance_DB');
    this.version(1).stores({
      classes: '_id, name',
      students: '_id, classSectionId, rollNo',
      offlineSessions: 'idempotencyKey, date, classSectionId, syncStatus',
    });
  }
}

export const db = new AttendanceDexieDB();
