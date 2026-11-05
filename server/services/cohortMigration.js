import Program from '../models/Program.js';
import ClassSection from '../models/ClassSection.js';
import Student from '../models/Student.js';
import User from '../models/User.js';
import AttendanceSession from '../models/AttendanceSession.js';

export const migrateTo4Cohorts = async () => {
  console.log('🔄 [MIGRATION] Starting consolidation to 4 cohorts: XI Boys, XI Girls, XII Boys, XII Girls...');

  // 1. Create or ensure the 4 Programs exist
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
      console.log(`✅ Created Program: ${def.name} (${def.code})`);
    } else {
      prog.name = def.name;
      prog.code = def.code;
      prog.isActive = true;
      await prog.save();
    }
    programs[def.name] = prog;
  }

  // 2. Create or ensure the 4 ClassSections exist
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

  // 3. Map all students into these 4 cohorts
  const allStudents = await Student.find().populate('classSectionId').populate('programId');
  console.log(`📋 Found ${allStudents.length} total students to classify into 4 cohorts.`);

  const counts = {
    'XI Boys': 0,
    'XI Girls': 0,
    'XII Boys': 0,
    'XII Girls': 0,
  };

  // Track old class -> new class mappings to preserve historical attendance sessions
  const oldClassToNewClassMap = {};

  for (const student of allStudents) {
    const isFemale = String(student.gender || '').trim().toLowerCase() === 'female';
    const oldClassName = (student.classSectionId?.name || '').toUpperCase();
    const oldProgName = (student.programId?.name || '').toUpperCase();
    const oldProgCode = (student.programId?.code || '').toUpperCase();

    // Check year level: XI vs XII
    let isXII = false;
    if (oldClassName.includes('XI') && !oldClassName.includes('XII')) {
      isXII = false;
    } else if (oldProgCode.includes('XI') && !oldProgCode.includes('XII')) {
      isXII = false;
    } else if (oldClassName.includes('1ST') || oldProgName.includes('1ST') || oldProgCode.includes('1ST')) {
      isXII = false;
    } else if (
      oldClassName.includes('XII') ||
      oldClassName.includes('2ND') ||
      oldProgName.includes('XII') ||
      oldProgCode.includes('XII') ||
      oldProgName.includes('PRE-ENGINEERING') ||
      oldProgName.includes('PRE-MEDICAL')
    ) {
      isXII = true;
    } else {
      isXII = false;
    }

    let targetCohortName = '';
    if (isXII) {
      targetCohortName = isFemale ? 'XII Girls' : 'XII Boys';
    } else {
      targetCohortName = isFemale ? 'XI Girls' : 'XI Boys';
    }

    const targetClass = classes[targetCohortName];
    const targetProg = programs[targetCohortName];

    if (student.classSectionId?._id) {
      oldClassToNewClassMap[student.classSectionId._id.toString()] = targetClass._id;
    }

    student.classSectionId = targetClass._id;
    student.programId = targetProg._id;
    student.gender = isFemale ? 'Female' : 'Male';
    await student.save();
    counts[targetCohortName]++;
  }

  console.log('📊 Student distribution across 4 cohorts:', counts);

  // 4. Migrate historical AttendanceSession records so records match the new 4 classes
  for (const [oldClassIdStr, newClassId] of Object.entries(oldClassToNewClassMap)) {
    if (oldClassIdStr !== newClassId.toString()) {
      const res = await AttendanceSession.updateMany(
        { classSectionId: oldClassIdStr },
        { $set: { classSectionId: newClassId } }
      );
      if (res.modifiedCount > 0) {
        console.log(`📑 Re-linked ${res.modifiedCount} historical attendance sessions to new cohort.`);
      }
    }
  }

  // 5. Update teachers' assignedClasses so teachers have access to all 4 classes
  const activeClassIds = Object.values(classes).map((c) => c._id);
  await User.updateMany(
    { role: 'teacher' },
    { $set: { assignedClasses: activeClassIds } }
  );

  // 6. Remove or deactivate old legacy classes & programs not in the 4 cohorts
  const targetClassIds = Object.values(classes).map((c) => c._id);
  const targetProgramIds = Object.values(programs).map((p) => p._id);

  // Archive / Delete old empty classes
  const oldClasses = await ClassSection.find({ _id: { $nin: targetClassIds } });
  for (const oldCls of oldClasses) {
    const count = await Student.countDocuments({ classSectionId: oldCls._id });
    if (count === 0) {
      await ClassSection.findByIdAndDelete(oldCls._id);
      console.log(`🗑️ Removed legacy empty class: ${oldCls.name}`);
    } else {
      oldCls.isActive = false;
      await oldCls.save();
    }
  }

  // Archive / Delete old empty programs
  const oldPrograms = await Program.find({ _id: { $nin: targetProgramIds } });
  for (const oldProg of oldPrograms) {
    const count = await Student.countDocuments({ programId: oldProg._id });
    if (count === 0) {
      await Program.findByIdAndDelete(oldProg._id);
      console.log(`🗑️ Removed legacy empty program: ${oldProg.name}`);
    } else {
      oldProg.isActive = false;
      await oldProg.save();
    }
  }

  console.log('✨ [MIGRATION COMPLETE] Successfully consolidated into 4 classes and programs.');
  return {
    success: true,
    cohorts: ['XI Boys', 'XI Girls', 'XII Boys', 'XII Girls'],
    counts,
  };
};
