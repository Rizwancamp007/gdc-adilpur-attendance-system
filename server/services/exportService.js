import XLSX from 'xlsx';

export const generateAttendanceExcel = (sessions, filterMetadata = {}) => {
  const rows = [];

  for (const session of sessions) {
    const className = session.classSectionId?.name || 'Class';
    const programName = session.programId?.name || 'Program';
    const sessionDate = session.date;

    for (const record of session.records) {
      // If filtering for absentees only
      if (filterMetadata.status && filterMetadata.status !== 'ALL' && record.status !== filterMetadata.status) {
        continue;
      }

      // If filtering for 3+ consecutive days
      if (filterMetadata.onlyChronicTruants && record.consecutiveAbsences < 3) {
        continue;
      }

      rows.push({
        'Date': sessionDate,
        'Program': programName,
        'Class / Section': className,
        'Roll No': record.rollNo,
        'Student Name': record.studentName,
        'Parent Phone': record.parentPhone,
        'Status': record.status,
        'Consecutive Absences': record.consecutiveAbsences,
        '3-Day Alert': record.consecutiveAbsences >= 3 ? 'YES (CRITICAL)' : 'NO',
      });
    }
  }

  // Create worksheet & workbook
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Report');

  // Buffer output
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};
