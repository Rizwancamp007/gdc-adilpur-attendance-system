import Program from '../models/Program.js';
import ClassSection from '../models/ClassSection.js';
import Student from '../models/Student.js';
import User from '../models/User.js';
import { xiPmBoysRaw, xiPeBoysRaw, xiPmGirlsRaw, xiiRawList } from '../data/collegeStudentsData.js';
import { formatPakistanPhone } from './smsService.js';

export const seed4CohortsAndStudents = async () => {
  console.log('🏛️ Initializing 4 Cohorts & 384 Students for GDC Adilpur...');

  // 1. Upsert exactly the 4 Programs
  const programDefs = [
    { name: 'XI Boys', code: 'XI-BOYS', level: 'Intermediate', durationYears: 1, description: 'First Year Boys' },
    { name: 'XI Girls', code: 'XI-GIRLS', level: 'Intermediate', durationYears: 1, description: 'First Year Girls' },
    { name: 'XII Boys', code: 'XII-BOYS', level: 'Intermediate', durationYears: 1, description: 'Second Year Boys' },
    { name: 'XII Girls', code: 'XII-GIRLS', level: 'Intermediate', durationYears: 1, description: 'Second Year Girls' },
  ];

  const programs = {};
  for (const def of programDefs) {
    let prog = await Program.findOne({ code: def.code });
    if (!prog) {
      prog = await Program.findOne({ name: def.name });
    }
    if (!prog) {
      prog = await Program.create({ ...def, isActive: true });
      console.log(`✅ Created Program: ${def.name}`);
    } else {
      prog.name = def.name;
      prog.code = def.code;
      prog.isActive = true;
      await prog.save();
    }
    programs[def.name] = prog;
  }

  // 2. Upsert exactly the 4 ClassSections
  const classDefs = [
    { name: 'XI Boys', progKey: 'XI Boys', yearLevel: 'XI', section: 'BOYS' },
    { name: 'XI Girls', progKey: 'XI Girls', yearLevel: 'XI', section: 'GIRLS' },
    { name: 'XII Boys', progKey: 'XII Boys', yearLevel: 'XII', section: 'BOYS' },
    { name: 'XII Girls', progKey: 'XII Girls', yearLevel: 'XII', section: 'GIRLS' },
  ];

  const classes = {};
  for (const def of classDefs) {
    let cls = await ClassSection.findOne({ name: def.name });
    const prog = programs[def.progKey];
    if (!cls) {
      cls = await ClassSection.create({
        name: def.name,
        programId: prog._id,
        yearLevel: def.yearLevel,
        section: def.section,
        shift: 'Morning',
        academicYear: '2026-2027',
        isActive: true,
      });
      console.log(`✅ Created Class Section: ${def.name}`);
    } else {
      cls.programId = prog._id;
      cls.yearLevel = def.yearLevel;
      cls.section = def.section;
      cls.isActive = true;
      await cls.save();
    }
    classes[def.name] = cls;
  }

  const targetClassIds = Object.values(classes).map((c) => c._id);
  const targetProgramIds = Object.values(programs).map((p) => p._id);

  // 3. Remove legacy programs and classes (except the 4 cohorts)
  await ClassSection.deleteMany({ _id: { $nin: targetClassIds } });
  await Program.deleteMany({ _id: { $nin: targetProgramIds } });
  console.log('🧹 Cleaned up legacy non-cohort classes and programs.');

  // Clean old students so fresh master roster is clean with zero duplicate keys
  await Student.deleteMany({});
  console.log('🧹 Emptied previous student records for fresh master roster.');

  const counts = {
    'XI Boys': 0,
    'XI Girls': 0,
    'XII Boys': 0,
    'XII Girls': 0,
  };

  const studentDocuments = [];

  // Helper to build phone
  const cleanPhone = (ph) => {
    let digits = String(ph || '').replace(/\D/g, '');
    if (!digits || digits.length < 8) return '03000000000';
    if (digits.length === 10 && digits.startsWith('3')) digits = '0' + digits;
    return digits;
  };

  // 4A. Cohort 1: XI Boys (57 Pre-Med + 76 Pre-Eng = 133 Students)
  const xiBoysCls = classes['XI Boys'];
  const xiBoysProg = programs['XI Boys'];
  let xiBoyRoll = 1;

  // Add 57 Pre-Med Boys (Rolls 1 to 57)
  for (const row of xiPmBoysRaw) {
    studentDocuments.push({
      rollNo: String(xiBoyRoll),
      registrationNo: `PM-${row.roll.padStart(2, '0')}`,
      fullName: row.name.trim(),
      fatherName: row.fatherName.trim(),
      caste: row.caste || '',
      gender: 'Male',
      programId: xiBoysProg._id,
      classSectionId: xiBoysCls._id,
      parentPhone: cleanPhone(row.phone),
      consecutiveAbsences: 0,
      totalDaysPresent: 0,
      totalDaysAbsent: 0,
      totalDaysLeave: 0,
      isActive: true,
    });
    xiBoyRoll++;
    counts['XI Boys']++;
  }

  // Add 76 Pre-Eng Boys (Rolls 58 to 133)
  for (const row of xiPeBoysRaw) {
    studentDocuments.push({
      rollNo: String(xiBoyRoll),
      registrationNo: `PE-${row.roll.padStart(2, '0')}`,
      fullName: row.name.trim(),
      fatherName: row.fatherName.trim(),
      caste: row.caste || '',
      gender: 'Male',
      programId: xiBoysProg._id,
      classSectionId: xiBoysCls._id,
      parentPhone: cleanPhone(row.phone),
      consecutiveAbsences: 0,
      totalDaysPresent: 0,
      totalDaysAbsent: 0,
      totalDaysLeave: 0,
      isActive: true,
    });
    xiBoyRoll++;
    counts['XI Boys']++;
  }

  // 4B. Cohort 2: XI Girls (52 Pre-Med Girls = 52 Students)
  const xiGirlsCls = classes['XI Girls'];
  const xiGirlsProg = programs['XI Girls'];
  let xiGirlRoll = 1;

  for (const row of xiPmGirlsRaw) {
    studentDocuments.push({
      rollNo: String(xiGirlRoll),
      registrationNo: `PM-G${row.roll.padStart(2, '0')}`,
      fullName: row.name.trim(),
      fatherName: row.fatherName.trim(),
      caste: row.caste || '',
      gender: 'Female',
      programId: xiGirlsProg._id,
      classSectionId: xiGirlsCls._id,
      parentPhone: cleanPhone(row.phone),
      consecutiveAbsences: 0,
      totalDaysPresent: 0,
      totalDaysAbsent: 0,
      totalDaysLeave: 0,
      isActive: true,
    });
    xiGirlRoll++;
    counts['XI Girls']++;
  }

  // 4C. Cohort 3: XII Boys (192 Pre-Eng Boys)
  const xiiBoysCls = classes['XII Boys'];
  const xiiBoysProg = programs['XII Boys'];
  let xiiBoyRoll = 1;

  for (const row of xiiRawList) {
    if (row.gender === 'Female') continue;
    studentDocuments.push({
      rollNo: String(xiiBoyRoll),
      registrationNo: `SR-${row.sr.padStart(3, '0')}`,
      fullName: row.name.trim(),
      fatherName: row.fatherName.trim(),
      caste: '',
      gender: 'Male',
      programId: xiiBoysProg._id,
      classSectionId: xiiBoysCls._id,
      parentPhone: cleanPhone(row.phone),
      consecutiveAbsences: 0,
      totalDaysPresent: 0,
      totalDaysAbsent: 0,
      totalDaysLeave: 0,
      isActive: true,
    });
    xiiBoyRoll++;
    counts['XII Boys']++;
  }

  // 4D. Cohort 4: XII Girls (7 Pre-Eng & Pre-Med Girls)
  const xiiGirlsCls = classes['XII Girls'];
  const xiiGirlsProg = programs['XII Girls'];
  let xiiGirlRoll = 1;

  for (const row of xiiRawList) {
    if (row.gender !== 'Female') continue;
    studentDocuments.push({
      rollNo: String(xiiGirlRoll),
      registrationNo: `SR-${row.sr.padStart(3, '0')}`,
      fullName: row.name.trim(),
      fatherName: row.fatherName.trim(),
      caste: '',
      gender: 'Female',
      programId: xiiGirlsProg._id,
      classSectionId: xiiGirlsCls._id,
      parentPhone: cleanPhone(row.phone),
      consecutiveAbsences: 0,
      totalDaysPresent: 0,
      totalDaysAbsent: 0,
      totalDaysLeave: 0,
      isActive: true,
    });
    xiiGirlRoll++;
    counts['XII Girls']++;
  }

  // Insert all 384 documents in a single bulk operation
  await Student.insertMany(studentDocuments);
  console.log(`🎉 Inserted ${studentDocuments.length} students into MongoDB.`);

  // 5. Assign all 4 classes to all teacher accounts
  await User.updateMany(
    { role: 'teacher' },
    { $set: { assignedClasses: targetClassIds } }
  );

  return {
    success: true,
    message: 'Successfully initialized 4 cohorts and 384 students.',
    totalStudents: studentDocuments.length,
    counts,
  };
};
