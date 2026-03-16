import React from 'react';
import { supabase as supabaseClient } from '../src/supabaseClient';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

type Student = {
  id: string;
  name: string;
  email?: string;
};

type AttendanceContextType = 'class' | 'subject';
type AttendanceStatus = 'P' | 'A' | 'L';

type LightweightSubject = {
  id: string;
  name: string;
};

type ClassRow = {
  id: string;
  name: string;
  student_ids?: string[];
  image_url?: string | null;
  color?: string | null;
  outer_color?: string | null;
  class_code?: string | null;
  student_count?: number;
};

type CourseRow = {
  id: string;
  name: string;
  class_id: string;
  image_url?: string | null;
};

type ClassCourseStudentRow = {
  student_id: string;
  student_name: string;
};

interface CoursesProps {
  students?: Student[];
  allStudents?: Student[];
  subjects?: LightweightSubject[];
  notify?: (message: string) => void;
  onOpenCoursePage?: (course: { id: string; name: string; classId: string; className?: string }) => void;
}

const CLASS_IMAGE_BUCKET = 'class_image';
const COURSE_PROFILE_BUCKET = 'course_profile';
const ALLOW_CLASS_CREATION = false;
const ALLOW_COURSE_CREATION = false;
const getTodayIsoDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const COURSES: React.FC<CoursesProps> = ({ students = [], allStudents, subjects = [], notify, onOpenCoursePage }) => {
  if (!supabaseClient) {
    return (
      <div className="space-y-12 animate-fadeIn text-slate-100 pb-20">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-[#1f4e4a] pb-8">
          <div className="space-y-2">
            <h2 className="text-4xl font-black text-white uppercase tracking-tighter">COURSES</h2>
            <p className="text-[#4ea59d]/60 font-black text-[10px] uppercase tracking-[0.4em]">Class & Course Manager</p>
          </div>
        </header>
        <div className="bg-[#0f2624] rounded-[32px] p-8 border border-[#1f4e4a]">
          <p className="text-sm font-bold text-slate-200">Supabase is not configured. Please set your environment variables to use Courses Manager.</p>
        </div>
      </div>
    );
  }

  const supabase = supabaseClient;

  const [classes, setClasses] = React.useState<ClassRow[]>([]);
  const [filteredClasses, setFilteredClasses] = React.useState<ClassRow[]>([]);
  const [classesLoadError, setClassesLoadError] = React.useState<string | null>(null);
  const [classSearchQuery, setClassSearchQuery] = React.useState('');
  const [selectedClassId, setSelectedClassId] = React.useState<string | null>(null);

  const [className, setClassName] = React.useState('');
  const [classImage, setClassImage] = React.useState<File | null>(null);
  const [classOuterColor, setClassOuterColor] = React.useState('#f8fafc');
  const [isClassFormOpen, setIsClassFormOpen] = React.useState(false);
  const [editingClassId, setEditingClassId] = React.useState<string | null>(null);
  const classImageInputRef = React.useRef<HTMLInputElement | null>(null);

  const [classCourses, setClassCourses] = React.useState<CourseRow[]>([]);
  const [isClassCoursesLoading, setIsClassCoursesLoading] = React.useState(false);
  const [isCreateCourseModalOpen, setIsCreateCourseModalOpen] = React.useState(false);
  const [isEditCourseModalOpen, setIsEditCourseModalOpen] = React.useState(false);
  const [isClassCourseCreating, setIsClassCourseCreating] = React.useState(false);
  const [isClassCourseUpdating, setIsClassCourseUpdating] = React.useState(false);
  const [deletingCourseId, setDeletingCourseId] = React.useState<string | null>(null);
  const [selectedCourseForPage, setSelectedCourseForPage] = React.useState<CourseRow | null>(null);
  const [classCourseStudents, setClassCourseStudents] = React.useState<ClassCourseStudentRow[]>([]);

  const [newCourseName, setNewCourseName] = React.useState('');
  const [newCourseImage, setNewCourseImage] = React.useState<File | null>(null);
  const [newCourseError, setNewCourseError] = React.useState<string | null>(null);
  const newCourseImageInputRef = React.useRef<HTMLInputElement | null>(null);

  const [editCourseId, setEditCourseId] = React.useState<string | null>(null);
  const [editCourseName, setEditCourseName] = React.useState('');
  const [editCourseCurrentImageUrl, setEditCourseCurrentImageUrl] = React.useState<string | null>(null);
  const [editCourseImage, setEditCourseImage] = React.useState<File | null>(null);
  const [editCourseError, setEditCourseError] = React.useState<string | null>(null);
  const editCourseImageInputRef = React.useRef<HTMLInputElement | null>(null);

  const [contextType, setContextType] = React.useState<AttendanceContextType>('class');
  const [selectedAttendanceContextId, setSelectedAttendanceContextId] = React.useState<string>('');
  const [attendanceDate, setAttendanceDate] = React.useState(getTodayIsoDate());
  const [attendanceMonth, setAttendanceMonth] = React.useState(getTodayIsoDate().slice(0, 7));
  const [attendanceMap, setAttendanceMap] = React.useState<Record<string, AttendanceStatus>>({});
  const [isAttendanceLoading, setIsAttendanceLoading] = React.useState(false);
  const [isAttendanceSaving, setIsAttendanceSaving] = React.useState(false);
  const [isMonthlyDownloadLoading, setIsMonthlyDownloadLoading] = React.useState(false);
  const courseDateInputRef = React.useRef<HTMLInputElement | null>(null);

  const safeNotify = React.useCallback((message: string) => {
    if (notify) notify(message);
  }, [notify]);

  const uploadImage = React.useCallback(async (bucket: string, file: File, prefix: string) => {
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${prefix}-${Date.now()}-${sanitizedName}`;

    const uploadResult = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (uploadResult.error) throw uploadResult.error;

    const publicResult = supabase.storage.from(bucket).getPublicUrl(path);
    if (!publicResult?.data?.publicUrl) {
      throw new Error('Failed to resolve uploaded image URL.');
    }

    return publicResult.data.publicUrl;
  }, []);

  const loadClasses = React.useCallback(async () => {
    setClassesLoadError(null);

    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      const message = `Failed to load classes: ${error.message}`;
      setClassesLoadError(message);
      safeNotify(message);
      setClasses([]);
      return;
    }

    const classRows = (data || []).map((row: any) => ({
      ...row,
      student_count: 0,
      student_ids: [],
      outer_color: row.outer_color || row.color || '#f8fafc',
    }));

    const classIds = classRows.map((row: any) => String(row.id));
    let studentCountByClass: Record<string, Set<string>> = {};

    if (classIds.length > 0) {
      const { data: classCourseStudents, error: classCourseStudentsError } = await supabase
        .from('class_course_students')
        .select('class_id, student_id')
        .in('class_id', classIds);

      if (classCourseStudentsError) {
        const message = `Loaded classes, but failed to load student counts: ${classCourseStudentsError.message}`;
        setClassesLoadError(message);
        safeNotify(message);
      } else {
        studentCountByClass = {};
        (classCourseStudents || []).forEach((row: any) => {
          const classId = String(row.class_id);
          const studentId = String(row.student_id);
          if (!studentCountByClass[classId]) {
            studentCountByClass[classId] = new Set<string>();
          }
          studentCountByClass[classId].add(studentId);
        });
      }
    }

    const next = classRows.map((row: any) => {
      const classId = String(row.id);
      const studentSet = studentCountByClass[classId] || new Set<string>();
      return {
        ...row,
        student_count: studentSet.size,
        student_ids: Array.from(studentSet),
      };
    });

    setClasses(next);
  }, [safeNotify]);

  React.useEffect(() => {
    void loadClasses();
  }, [loadClasses]);

  React.useEffect(() => {
    const q = classSearchQuery.trim().toLowerCase();
    if (!q) {
      setFilteredClasses(classes);
      return;
    }

    setFilteredClasses(
      classes.filter(c => {
        const name = String(c.name || '').toLowerCase();
        const code = String(c.class_code || '').toLowerCase();
        return name.includes(q) || code.includes(q);
      })
    );
  }, [classes, classSearchQuery]);

  const selectedClass = React.useMemo(
    () => classes.find(c => String(c.id) === String(selectedClassId)) || null,
    [classes, selectedClassId]
  );

  const resetClassForm = () => {
    setClassName('');
    setClassImage(null);
    setClassOuterColor('#f8fafc');
    setEditingClassId(null);
    if (classImageInputRef.current) classImageInputRef.current.value = '';
  };

  const createOrUpdateClass = async () => {
    if (!editingClassId && !ALLOW_CLASS_CREATION) {
      safeNotify('Class creation is disabled.');
      return;
    }

    if (!className.trim()) {
      safeNotify('Please enter class name.');
      return;
    }

    try {
      let imageUrl: string | null = null;
      if (classImage) {
        imageUrl = await uploadImage(CLASS_IMAGE_BUCKET, classImage, 'class');
      }

      if (editingClassId) {
        const payload: any = {
          name: className.trim(),
          outer_color: classOuterColor,
          color: classOuterColor,
        };
        if (imageUrl) payload.image_url = imageUrl;

        const { error } = await supabase.from('classes').update(payload).eq('id', editingClassId);
        if (error) throw error;

        safeNotify('Class updated.');
      } else {
        const payload: any = {
          name: className.trim(),
          outer_color: classOuterColor,
          color: classOuterColor,
        };
        if (imageUrl) payload.image_url = imageUrl;

        const { error } = await supabase.from('classes').insert([payload]);
        if (error) throw error;

        safeNotify('Class created.');
      }

      resetClassForm();
      setIsClassFormOpen(false);
      await loadClasses();
    } catch (error: any) {
      safeNotify(`Class save failed: ${error?.message || 'Unknown error'}`);
    }
  };

  const startEditClass = (classItem: ClassRow) => {
    setEditingClassId(String(classItem.id));
    setClassName(String(classItem.name || ''));
    setClassOuterColor(String(classItem.outer_color || classItem.color || '#f8fafc'));
    setClassImage(null);
    if (classImageInputRef.current) classImageInputRef.current.value = '';
    setIsClassFormOpen(true);
  };

  const deleteClass = async (classId: string) => {
    const { error } = await supabase.from('classes').delete().eq('id', classId);
    if (error) {
      safeNotify(`Delete failed: ${error.message}`);
      return;
    }

    safeNotify('Class deleted.');
    if (selectedClassId === classId) {
      setSelectedClassId(null);
      setClassCourses([]);
    }
    await loadClasses();
  };

  const loadClassCourses = React.useCallback(async (classId: string) => {
    if (!classId) {
      setClassCourses([]);
      return;
    }

    setIsClassCoursesLoading(true);
    const { data, error } = await supabase
      .from('class_courses')
      .select('*')
      .eq('class_id', classId)
      .order('created_at', { ascending: false });

    setIsClassCoursesLoading(false);

    if (error) {
      safeNotify(`Failed to load courses: ${error.message}`);
      setClassCourses([]);
      return;
    }

    setClassCourses((data || []).map((row: any) => ({
      id: String(row.id),
      name: String(row.name || ''),
      class_id: String(row.class_id),
      image_url: row.image_url || null,
    })));
  }, [safeNotify]);

  React.useEffect(() => {
    if (!selectedClassId) {
      setClassCourses([]);
      setSelectedCourseForPage(null);
      setClassCourseStudents([]);
      return;
    }
    void loadClassCourses(selectedClassId);
  }, [selectedClassId, loadClassCourses]);

  React.useEffect(() => {
    const loadClassCourseStudents = async () => {
      if (!selectedClassId || !selectedCourseForPage) {
        setClassCourseStudents([]);
        return;
      }

      const { data, error } = await supabase
        .from('class_course_students')
        .select('student_id, student_name')
        .eq('class_id', selectedClassId)
        .eq('class_course_id', selectedCourseForPage.id)
        .order('student_name', { ascending: true });

      if (error) {
        safeNotify(`Failed to load course students: ${error.message}`);
        setClassCourseStudents([]);
        return;
      }

      setClassCourseStudents(
        (data || []).map((row: any) => ({
          student_id: String(row.student_id),
          student_name: String(row.student_name || row.student_id),
        }))
      );
    };

    void loadClassCourseStudents();
  }, [selectedClassId, selectedCourseForPage, safeNotify]);

  React.useEffect(() => {
    if (contextType === 'class' && selectedClassId) {
      setSelectedAttendanceContextId(String(selectedClassId));
    }
  }, [contextType, selectedClassId]);

  const createClassCourse = async () => {
    if (!ALLOW_COURSE_CREATION) {
      setNewCourseError('Course creation is disabled.');
      safeNotify('Course creation is disabled.');
      return;
    }

    if (!selectedClassId) {
      setNewCourseError('Select class first.');
      return;
    }

    if (!newCourseName.trim()) {
      setNewCourseError('Course name is required.');
      return;
    }

    setIsClassCourseCreating(true);
    try {
      let imageUrl: string | null = null;
      if (newCourseImage) {
        imageUrl = await uploadImage(COURSE_PROFILE_BUCKET, newCourseImage, 'course');
      }

      const payload: any = {
        class_id: selectedClassId,
        name: newCourseName.trim(),
      };
      if (imageUrl) payload.image_url = imageUrl;

      const { error } = await supabase.from('class_courses').insert([payload]);
      if (error) throw error;

      setIsCreateCourseModalOpen(false);
      setNewCourseName('');
      setNewCourseImage(null);
      setNewCourseError(null);
      if (newCourseImageInputRef.current) newCourseImageInputRef.current.value = '';
      safeNotify('Course created.');
      await loadClassCourses(selectedClassId);
    } catch (error: any) {
      setNewCourseError(error?.message || 'Course create failed.');
    } finally {
      setIsClassCourseCreating(false);
    }
  };

  const openEditCourseModal = (course: CourseRow) => {
    setEditCourseId(course.id);
    setEditCourseName(course.name);
    setEditCourseCurrentImageUrl(course.image_url || null);
    setEditCourseImage(null);
    setEditCourseError(null);
    if (editCourseImageInputRef.current) editCourseImageInputRef.current.value = '';
    setIsEditCourseModalOpen(true);
  };

  const closeEditCourseModal = () => {
    setEditCourseId(null);
    setEditCourseName('');
    setEditCourseCurrentImageUrl(null);
    setEditCourseImage(null);
    setEditCourseError(null);
    if (editCourseImageInputRef.current) editCourseImageInputRef.current.value = '';
    setIsEditCourseModalOpen(false);
  };

  const saveCourseEdits = async () => {
    if (!editCourseId) return;
    if (!editCourseName.trim()) {
      setEditCourseError('Course name is required.');
      return;
    }

    setIsClassCourseUpdating(true);
    try {
      let imageUrl = editCourseCurrentImageUrl;
      if (editCourseImage) {
        imageUrl = await uploadImage(COURSE_PROFILE_BUCKET, editCourseImage, 'course');
      }

      const { error } = await supabase
        .from('class_courses')
        .update({ name: editCourseName.trim(), image_url: imageUrl })
        .eq('id', editCourseId);

      if (error) throw error;

      safeNotify('Course updated.');
      closeEditCourseModal();
      if (selectedClassId) await loadClassCourses(selectedClassId);
    } catch (error: any) {
      setEditCourseError(error?.message || 'Course update failed.');
    } finally {
      setIsClassCourseUpdating(false);
    }
  };

  const deleteClassCourse = async (course: CourseRow) => {
    setDeletingCourseId(course.id);
    const { error } = await supabase.from('class_courses').delete().eq('id', course.id);
    setDeletingCourseId(null);

    if (error) {
      safeNotify(`Delete failed: ${error.message}`);
      return;
    }

    safeNotify('Course deleted.');
    if (selectedClassId) await loadClassCourses(selectedClassId);
  };

  const activeContextList = React.useMemo(
    () => (contextType === 'class'
      ? classes.map(classItem => ({ id: String(classItem.id), name: String(classItem.name || '') }))
      : (classCourses.length > 0
        ? classCourses.map(course => ({ id: String(course.id), name: String(course.name || '') }))
        : subjects)),
    [contextType, classes, classCourses, subjects]
  );

  React.useEffect(() => {
    if (!activeContextList.length) {
      setSelectedAttendanceContextId('');
      return;
    }

    const exists = activeContextList.some(item => String(item.id) === String(selectedAttendanceContextId));
    if (!exists) {
      setSelectedAttendanceContextId(String(activeContextList[0].id));
    }
  }, [activeContextList, selectedAttendanceContextId]);

  const activeAttendanceStudents = React.useMemo(() => {
    if (!selectedAttendanceContextId) return [] as Student[];

    if (contextType === 'subject') {
      return classCourseStudents.map((student) => ({
        id: student.student_id,
        name: student.student_name,
      }));
    }

    const sourceStudents = allStudents && allStudents.length > 0 ? allStudents : students;
    const selectedClassForAttendance = classes.find(classItem => String(classItem.id) === String(selectedClassId));
    const classStudentIds = (selectedClassForAttendance?.student_ids || []).map(id => String(id));
    const scopedClassStudents = sourceStudents.filter(student => classStudentIds.includes(String(student.id)));

    if (contextType === 'class') {
      const selectedByContext = classes.find(classItem => String(classItem.id) === String(selectedAttendanceContextId));
      const contextStudentIds = (selectedByContext?.student_ids || []).map(id => String(id));
      return sourceStudents.filter(student => contextStudentIds.includes(String(student.id)));
    }

    return scopedClassStudents.length > 0 ? scopedClassStudents : sourceStudents;
  }, [selectedAttendanceContextId, contextType, classes, allStudents, students, selectedClassId, classCourseStudents]);

  const loadAttendance = React.useCallback(async () => {
    if (!selectedAttendanceContextId || !attendanceDate) return;

    setIsAttendanceLoading(true);

    const { data, error } = await supabase
      .from('attendance_records')
      .select('student_id, status')
      .eq('context_type', contextType)
      .eq('context_id', selectedAttendanceContextId)
      .eq('attendance_date', attendanceDate);

    setIsAttendanceLoading(false);

    if (error) {
      safeNotify(`Failed to load attendance: ${error.message}`);
      return;
    }

    const nextMap: Record<string, AttendanceStatus> = {};
    (data || []).forEach((row: any) => {
      nextMap[String(row.student_id)] = row.status as AttendanceStatus;
    });

    setAttendanceMap(nextMap);
  }, [selectedAttendanceContextId, attendanceDate, contextType, safeNotify]);

  React.useEffect(() => {
    void loadAttendance();
  }, [loadAttendance]);

  const saveSingleAttendance = async (studentId: string, status: AttendanceStatus) => {
    if (!selectedAttendanceContextId || !attendanceDate) return;

    setIsAttendanceSaving(true);

    const contextName = contextType === 'subject'
      ? (selectedCourseForPage?.name || 'Subject')
      : (selectedClass?.name || 'Class');

    const payload = {
      context_type: contextType,
      context_id: selectedAttendanceContextId,
      context_name: contextName,
      attendance_date: attendanceDate,
      student_id: String(studentId),
      status,
    };

    const upsertResult = await supabase
      .from('attendance_records')
      .upsert([payload], { onConflict: 'context_type,context_id,attendance_date,student_id' });

    setIsAttendanceSaving(false);

    if (upsertResult.error) {
      safeNotify(`Failed to save attendance: ${upsertResult.error.message}`);
      setIsAttendanceSaving(false);
      return;
    }

    await loadAttendance();
    setIsAttendanceSaving(false);
  };

  const markAllPresent = async () => {
    if (!selectedAttendanceContextId || !attendanceDate || activeAttendanceStudents.length === 0) {
      safeNotify('No students available to mark.');
      return;
    }

    setIsAttendanceSaving(true);

    const contextName = contextType === 'subject'
      ? (selectedCourseForPage?.name || 'Subject')
      : (selectedClass?.name || 'Class');

    const payload = activeAttendanceStudents.map(student => ({
      context_type: contextType,
      context_id: selectedAttendanceContextId,
      context_name: contextName,
      attendance_date: attendanceDate,
      student_id: String(student.id),
      status: 'P' as const,
    }));

    const upsertResult = await supabase
      .from('attendance_records')
      .upsert(payload, { onConflict: 'context_type,context_id,attendance_date,student_id' });

    setIsAttendanceSaving(false);

    if (upsertResult.error) {
      safeNotify(`Failed to bulk save attendance: ${upsertResult.error.message}`);
      setIsAttendanceSaving(false);
      return;
    }

    await loadAttendance();
    setIsAttendanceSaving(false);
    safeNotify('All students marked Present.');
  };

  const downloadMonthlyAttendance = async () => {
    if (!selectedCourseForPage) {
      safeNotify('Select a course first.');
      return;
    }

    if (!attendanceMonth) {
      safeNotify('Select a month first.');
      return;
    }

    const [yearText, monthText] = attendanceMonth.split('-');
    const year = Number(yearText);
    const month = Number(monthText);
    if (!year || !month) {
      safeNotify('Invalid month format.');
      return;
    }

    const startDate = `${yearText}-${monthText}-01`;
    const endDate = new Date(year, month, 0).toISOString().slice(0, 10);

    setIsMonthlyDownloadLoading(true);

    const { data, error } = await supabase
      .from('attendance_records')
      .select('attendance_date, student_id, status')
      .eq('context_type', 'subject')
      .eq('context_id', selectedCourseForPage.id)
      .gte('attendance_date', startDate)
      .lte('attendance_date', endDate)
      .order('attendance_date', { ascending: true });

    setIsMonthlyDownloadLoading(false);

    if (error) {
      safeNotify(`Failed to download monthly attendance: ${error.message}`);
      return;
    }

    if (!data || data.length === 0) {
      safeNotify('No attendance records found for this month.');
      return;
    }

    const nameById = new Map(classCourseStudents.map((student) => [String(student.student_id), student.student_name]));
    const summaryByStudent = new Map<string, { name: string; present: number; total: number }>();

    data.forEach((row: any) => {
      const studentId = String(row.student_id);
      const status = String(row.status || '').toUpperCase();
      const existing = summaryByStudent.get(studentId) || {
        name: nameById.get(studentId) || studentId,
        present: 0,
        total: 0,
      };

      existing.total += 1;
      if (status === 'P') {
        existing.present += 1;
      }

      summaryByStudent.set(studentId, existing);
    });

    const totalEntries = data.length;
    const totalPresent = data.filter((row: any) => String(row.status || '').toUpperCase() === 'P').length;
    const overallPercentage = totalEntries > 0 ? ((totalPresent / totalEntries) * 100).toFixed(2) : '0.00';

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const monthLabel = new Date(`${attendanceMonth}-01`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    doc.setFontSize(18);
    doc.text('Monthly Attendance Report', 40, 50);
    doc.setFontSize(11);
    doc.text(`Course: ${selectedCourseForPage.name}`, 40, 76);
    doc.text(`Class: ${selectedClass?.name || 'N/A'}`, 40, 94);
    doc.text(`Month: ${monthLabel}`, 40, 112);
    doc.text(`Overall Attendance: ${overallPercentage}%`, 40, 130);

    const tableRows = Array.from(summaryByStudent.entries()).map(([studentId, summary]) => {
      const percentage = summary.total > 0 ? ((summary.present / summary.total) * 100).toFixed(2) : '0.00';
      return [studentId, summary.name, String(summary.present), String(summary.total), `${percentage}%`];
    });

    autoTable(doc, {
      startY: 150,
      head: [['Student ID', 'Student Name', 'Present Days', 'Total Records', 'Attendance %']],
      body: tableRows,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [78, 165, 157] },
    });

    const safeCourseName = selectedCourseForPage.name.replace(/[^a-zA-Z0-9-_]/g, '_');
    doc.save(`attendance-${safeCourseName}-${attendanceMonth}.pdf`);
  };

  const isClassDetailView = Boolean(selectedClass);
  const isCoursePageView = Boolean(selectedCourseForPage);
  const classDetailDateLabel = attendanceDate
    ? new Date(attendanceDate).toLocaleDateString('en-GB')
    : new Date().toLocaleDateString('en-GB');

  return (
    <div className="space-y-12 animate-fadeIn text-slate-100 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-[#1f4e4a] pb-8">
        <div className="space-y-2">
          <h2 className="text-4xl font-black text-white uppercase tracking-tighter">COURSES</h2>
          <p className="text-[#4ea59d]/60 font-black text-[10px] uppercase tracking-[0.4em]">Class & Course Manager</p>
        </div>
      </header>

      {classesLoadError && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-2xl px-5 py-4 text-xs font-bold">
          {classesLoadError}
        </div>
      )}

      {!isClassDetailView && (
        <>

      <div className="bg-[#0f2624] rounded-[32px] p-6 sm:p-8 border border-[#1f4e4a] shadow-2xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">{editingClassId ? 'Edit Class' : 'Class Profile'}</h2>
            <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-slate-400 mt-2">
              {editingClassId ? 'Update class appearance and details' : 'Class creation is disabled'}
            </p>
          </div>
          <button
            onClick={() => {
              if (!editingClassId) return;
              setIsClassFormOpen(prev => !prev);
            }}
            disabled={!editingClassId}
            className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${editingClassId ? 'bg-[#4ea59d]/10 text-[#4ea59d] border-[#4ea59d]/30' : 'bg-[#1f4e4a]/30 text-slate-500 border-[#1f4e4a] cursor-not-allowed'}`}
          >
            <i className={`fas ${isClassFormOpen ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
            {isClassFormOpen ? 'Hide Form' : 'Edit Class'}
          </button>
        </div>

        {isClassFormOpen && (
          <>
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Class Name</label>
              <input
                type="text"
                placeholder="Enter class name"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full bg-[#0a1a19] p-4 rounded-2xl border border-[#1f4e4a] focus:border-[#4ea59d] outline-none font-bold text-white"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Class Image</label>
              <div className="bg-[#0a1a19] rounded-2xl border border-[#1f4e4a] p-4">
                <input
                  ref={classImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) setClassImage(e.target.files[0]);
                  }}
                  className="w-full text-xs font-semibold text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-[#4ea59d] file:text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Image Area Color</label>
              <div className="bg-[#0a1a19] rounded-2xl border border-[#1f4e4a] p-3 flex items-center gap-3">
                <input
                  type="color"
                  value={classOuterColor}
                  onChange={(e) => setClassOuterColor(e.target.value)}
                  className="w-12 h-10 rounded-lg cursor-pointer"
                />
                <span className="text-xs font-black uppercase tracking-widest text-slate-500">{classOuterColor}</span>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              {editingClassId && (
                <button
                  onClick={resetClassForm}
                  className="px-6 py-3 rounded-2xl bg-[#1f4e4a] text-white text-xs font-black uppercase tracking-widest"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={() => void createOrUpdateClass()}
                className="px-8 py-3 rounded-2xl bg-[#4ea59d] text-white text-xs font-black uppercase tracking-widest"
              >
                {editingClassId ? 'Update Class' : 'Create Class'}
              </button>
            </div>
          </>
        )}
      </div>

      <div className="bg-[#0f2624] rounded-[32px] p-6 sm:p-8 border border-[#1f4e4a] shadow-2xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Created Classes</p>
            <input
              type="text"
              value={classSearchQuery}
              onChange={(e) => setClassSearchQuery(e.target.value)}
              placeholder="Search classes"
              className="w-full sm:w-72 bg-[#0a1a19] p-3 rounded-2xl border border-[#1f4e4a] outline-none font-semibold text-sm text-white"
            />
          </div>

          {filteredClasses.length === 0 ? (
            <div className="rounded-2xl bg-[#0a1a19] border border-[#1f4e4a] p-6 text-sm text-slate-400">
              No classes found. Class creation is disabled, or check your Supabase classes data.
            </div>
          ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClasses.map((classItem) => (
              <div
                key={classItem.id}
                onClick={() => setSelectedClassId(String(classItem.id))}
                className={`rounded-2xl border overflow-hidden cursor-pointer hover:-translate-y-1 transition-all ${selectedClassId === String(classItem.id) ? 'border-[#4ea59d]' : 'border-[#1f4e4a]'}`}
                style={{ backgroundColor: '#0a1a19' }}
              >
                <div className="flex justify-end p-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditClass(classItem);
                    }}
                    className="w-8 h-8 mr-2 rounded-lg bg-[#0f2624] text-slate-400 hover:text-[#4ea59d] border border-[#1f4e4a] flex items-center justify-center"
                    title="Edit class"
                  >
                    <i className="fas fa-pen"></i>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      void deleteClass(String(classItem.id));
                    }}
                    className="w-8 h-8 rounded-lg bg-[#0f2624] text-slate-400 hover:text-rose-500 border border-[#1f4e4a] flex items-center justify-center"
                    title="Delete class"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>

                <div className="w-full aspect-square" style={{ backgroundColor: classItem.color || classItem.outer_color || '#f8fafc' }}>
                  {classItem.image_url ? (
                    <img src={classItem.image_url} alt={classItem.name} className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-black uppercase tracking-widest">
                      No Image
                    </div>
                  )}
                </div>

                <div className="p-3 space-y-1 bg-[#0f2624]">
                  <p className="font-black text-sm truncate">{classItem.name}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{classItem.class_code || 'class-code'}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#4ea59d]">{classItem.student_count || 0} Students</p>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>

        </>
      )}

      {selectedClass && !isCoursePageView && (
        <>
        <div className="bg-[#0f2624] rounded-[24px] sm:rounded-[32px] p-4 sm:p-6 border border-[#1f4e4a] shadow-2xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-[#1f4e4a] pb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSelectedClassId(null)}
                className="w-12 h-12 rounded-2xl bg-[#0a1a19] border border-[#1f4e4a] text-[#4ea59d] hover:bg-[#1f4e4a] transition-colors"
                title="Back to Classes"
              >
                <i className="fas fa-arrow-left"></i>
              </button>
              <div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">Class Detail</h3>
                <p className="text-[10px] font-black text-[#4ea59d] uppercase tracking-[0.2em]">{classDetailDateLabel} | Live Session Mapping</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void markAllPresent()}
              disabled={isAttendanceLoading || isAttendanceSaving || activeAttendanceStudents.length === 0}
              className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest ${isAttendanceLoading || isAttendanceSaving || activeAttendanceStudents.length === 0 ? 'bg-[#1f4e4a] text-slate-500 cursor-not-allowed' : 'bg-[#4ea59d] text-white'}`}
            >
              {isAttendanceSaving ? 'Saving...' : 'Mark All Present'}
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 mb-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Courses</p>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#4ea59d]">{classCourses.length} Course Blocks</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <div
              className="aspect-square rounded-2xl border-2 border-dashed border-[#1f4e4a] bg-[#0a1a19] text-slate-500 flex flex-col items-center justify-center text-center px-3"
              title="Course creation disabled"
            >
              <span className="text-2xl font-black leading-none">+</span>
              <span className="mt-2 text-[10px] font-black uppercase tracking-widest">Creation Disabled</span>
            </div>

            {isClassCoursesLoading && (
              <div className="col-span-full px-3 py-2 rounded-xl bg-[#0a1a19] border border-[#1f4e4a] text-xs font-semibold text-slate-400">
                Loading courses...
              </div>
            )}

            {!isClassCoursesLoading && classCourses.map(course => (
              <div
                key={course.id}
                className="p-3 rounded-2xl bg-[#0a1a19] border border-[#1f4e4a] text-left hover:-translate-y-0.5 transition-all relative"
              >
                <div className="absolute top-2 right-2 flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditCourseModal(course);
                    }}
                    className="w-8 h-8 rounded-lg bg-[#0f2624] text-slate-400 hover:text-[#4ea59d] border border-[#1f4e4a] flex items-center justify-center"
                    title="Edit course"
                  >
                    <i className="fas fa-pen text-xs"></i>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      void deleteClassCourse(course);
                    }}
                    disabled={deletingCourseId === course.id}
                    className={`w-8 h-8 rounded-lg bg-[#0f2624] border border-[#1f4e4a] flex items-center justify-center ${deletingCourseId === course.id ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:text-rose-500'}`}
                    title="Delete course"
                  >
                    <i className="fas fa-trash text-xs"></i>
                  </button>
                </div>

                <button
                  onClick={() => {
                    setSelectedCourseForPage(course);
                    setContextType('subject');
                    setSelectedAttendanceContextId(String(course.id));
                  }}
                  className="w-full text-left"
                  title="Open course page"
                >
                  {course.image_url ? (
                    <div className="w-full aspect-square rounded-xl overflow-hidden mb-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                      <img src={course.image_url} alt={course.name} className="w-full h-full object-cover" />
                    </div>
                  ) : null}
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Course</p>
                  <p className="text-sm font-black text-[#4ea59d] mt-1 line-clamp-3">{course.name}</p>
                </button>
              </div>
            ))}
          </div>
        </div>
        </>
      )}

      {selectedClass && selectedCourseForPage && (
      <section className="space-y-6">
        <div className="bg-[#0f2624] rounded-3xl border border-[#1f4e4a] p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => setSelectedCourseForPage(null)}
              className="w-12 h-12 rounded-2xl bg-[#0a1a19] border border-[#1f4e4a] text-[#4ea59d] hover:bg-[#1f4e4a] transition-colors"
              title="Back to Class Detail"
            >
              <i className="fas fa-arrow-left"></i>
            </button>
            <div className="flex-1">
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">Course Page: {selectedCourseForPage.name}</h2>
              <p className="text-[10px] font-black text-[#4ea59d] uppercase tracking-[0.2em]">Class: {selectedClass.name}</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (courseDateInputRef.current?.showPicker) {
                    courseDateInputRef.current.showPicker();
                    return;
                  }
                  courseDateInputRef.current?.click();
                }}
                className="px-4 py-3 rounded-2xl bg-[#0a1a19] border border-[#1f4e4a] text-xs font-black tracking-widest text-slate-300 uppercase flex items-center gap-2"
              >
                <i className="fas fa-calendar-day text-[#4ea59d]"></i>
                <span>{classDetailDateLabel}</span>
                <input
                  ref={courseDateInputRef}
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="sr-only"
                />
              </button>

              <div className="px-3 py-2 rounded-2xl bg-[#0a1a19] border border-[#1f4e4a] flex items-center gap-2">
                <input
                  type="month"
                  value={attendanceMonth}
                  onChange={(e) => setAttendanceMonth(e.target.value)}
                  className="bg-transparent text-xs font-black tracking-widest text-slate-200 outline-none"
                />
                <button
                  type="button"
                  onClick={() => void downloadMonthlyAttendance()}
                  disabled={isMonthlyDownloadLoading}
                  className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${isMonthlyDownloadLoading ? 'bg-[#1f4e4a] text-slate-500 cursor-not-allowed' : 'bg-[#4ea59d] text-white'}`}
                >
                  {isMonthlyDownloadLoading ? 'Downloading...' : 'Download PDF'}
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void markAllPresent()}
              disabled={isAttendanceLoading || isAttendanceSaving || activeAttendanceStudents.length === 0}
              className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest ${isAttendanceLoading || isAttendanceSaving || activeAttendanceStudents.length === 0 ? 'bg-[#1f4e4a] text-slate-500 cursor-not-allowed' : 'bg-[#4ea59d] text-white'}`}
            >
              {isAttendanceSaving ? 'Saving...' : 'Mark All Present'}
            </button>
          </div>
        </div>

        <div className="bg-[#0f2624] rounded-3xl border border-[#1f4e4a] overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-[#1f4e4a] flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-black">Students ({activeAttendanceStudents.length})</h3>
            <span className="text-[11px] font-bold text-slate-500">P = Present, A = Absent, L = Leave</span>
          </div>

          {activeAttendanceStudents.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">No students available for this course context.</p>
          ) : (
            <ul className="divide-y divide-[#1f4e4a]">
              {activeAttendanceStudents.map(student => {
                const currentStatus = attendanceMap[String(student.id)] || '-';
                return (
                  <li key={student.id} className="px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-100">{student.name}</p>
                      <p className="text-xs text-slate-500">{student.id}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500 mr-1">Current: {currentStatus}</span>
                      {(['P', 'A', 'L'] as AttendanceStatus[]).map(status => {
                        const active = currentStatus === status;
                        return (
                          <button
                            key={status}
                            type="button"
                            onClick={() => void saveSingleAttendance(String(student.id), status)}
                            disabled={isAttendanceSaving || isAttendanceLoading}
                            className={`w-9 h-9 rounded-lg text-xs font-black ${active ? 'bg-[#4ea59d] text-white' : 'bg-[#0a1a19] text-slate-200 border border-[#1f4e4a]'}`}
                          >
                            {status}
                          </button>
                        );
                      })}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="bg-[#0f2624] rounded-3xl border border-[#1f4e4a] p-5 sm:p-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#4ea59d] mb-3">Course Timetable Calendar</p>
          <div className="rounded-2xl bg-[#0a1a19] border border-[#1f4e4a] p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-black text-slate-200 uppercase tracking-widest">{selectedCourseForPage.name}</p>
              <p className="text-[10px] text-slate-500 mt-1">View class-wise timetable and live attendance insights.</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-[#4ea59d]/15 text-[#4ea59d] text-[10px] font-black uppercase tracking-widest">{attendanceDate}</span>
          </div>
        </div>
      </section>
      )}

      {isCreateCourseModalOpen && (
        <div className="fixed inset-0 z-[230] bg-[#0a1a19]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0f2624] rounded-3xl border border-[#1f4e4a] shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-xl font-black tracking-tight">Create Course</h3>
              <button
                onClick={() => {
                  if (isClassCourseCreating) return;
                  setIsCreateCourseModalOpen(false);
                  setNewCourseName('');
                  setNewCourseImage(null);
                  setNewCourseError(null);
                }}
                className="w-10 h-10 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Course Name</label>
              <input
                type="text"
                value={newCourseName}
                onChange={(e) => {
                  setNewCourseName(e.target.value);
                  if (newCourseError) setNewCourseError(null);
                }}
                placeholder="Enter course name"
                className="w-full bg-[#0a1a19] p-4 rounded-2xl border border-[#1f4e4a] focus:border-[#4ea59d] outline-none font-bold text-white"
              />
              {newCourseError && <p className="text-xs font-bold text-rose-500">{newCourseError}</p>}
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Course Profile Image</label>
              <div className="bg-[#0a1a19] rounded-2xl border border-[#1f4e4a] p-3">
                <button
                  type="button"
                  onClick={() => newCourseImageInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-[#4ea59d] text-white text-[10px] font-black uppercase tracking-widest"
                >
                  Add Image
                </button>
                <input
                  ref={newCourseImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) setNewCourseImage(e.target.files[0]);
                  }}
                  className="hidden"
                />
                {newCourseImage && (
                  <p className="mt-2 text-[11px] text-slate-500 truncate">Selected: {newCourseImage.name}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
              <button
                onClick={() => {
                  if (isClassCourseCreating) return;
                  setIsCreateCourseModalOpen(false);
                  setNewCourseName('');
                  setNewCourseImage(null);
                  setNewCourseError(null);
                }}
                className="px-6 py-3 rounded-2xl bg-[#1f4e4a] text-white text-xs font-black uppercase tracking-widest"
              >
                Cancel
              </button>
              <button
                onClick={() => void createClassCourse()}
                disabled={isClassCourseCreating}
                className={`px-6 py-3 rounded-2xl text-white text-xs font-black uppercase tracking-widest ${isClassCourseCreating ? 'bg-[#4ea59d]/40 cursor-not-allowed' : 'bg-[#4ea59d]'}`}
              >
                {isClassCourseCreating ? 'Creating...' : 'Create Course'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditCourseModalOpen && (
        <div className="fixed inset-0 z-[230] bg-[#0a1a19]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0f2624] rounded-3xl border border-[#1f4e4a] shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-xl font-black tracking-tight">Edit Course</h3>
              <button onClick={closeEditCourseModal} className="w-10 h-10 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Course Name</label>
              <input
                type="text"
                value={editCourseName}
                onChange={(e) => {
                  setEditCourseName(e.target.value);
                  if (editCourseError) setEditCourseError(null);
                }}
                placeholder="Enter course name"
                className="w-full bg-[#0a1a19] p-4 rounded-2xl border border-[#1f4e4a] focus:border-[#4ea59d] outline-none font-bold text-white"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Course Profile Image</label>
              <div className="bg-[#0a1a19] rounded-2xl border border-[#1f4e4a] p-3 space-y-3">
                {(editCourseImage || editCourseCurrentImageUrl) && (
                  <div className="w-full aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                    <img src={editCourseImage ? URL.createObjectURL(editCourseImage) : String(editCourseCurrentImageUrl)} alt="Course preview" className="w-full h-full object-cover" />
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => editCourseImageInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-[#4ea59d] text-white text-[10px] font-black uppercase tracking-widest"
                  >
                    Change Image
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditCourseImage(null);
                      setEditCourseCurrentImageUrl(null);
                      if (editCourseImageInputRef.current) editCourseImageInputRef.current.value = '';
                    }}
                    className="px-4 py-2 rounded-xl bg-[#1f4e4a] text-white text-[10px] font-black uppercase tracking-widest"
                  >
                    Remove Image
                  </button>
                </div>

                <input
                  ref={editCourseImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) setEditCourseImage(e.target.files[0]);
                  }}
                  className="hidden"
                />
              </div>
            </div>

            {editCourseError && <p className="text-xs font-bold text-rose-500">{editCourseError}</p>}

            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
              <button onClick={closeEditCourseModal} className="px-6 py-3 rounded-2xl bg-[#1f4e4a] text-white text-xs font-black uppercase tracking-widest">
                Cancel
              </button>
              <button
                onClick={() => void saveCourseEdits()}
                disabled={isClassCourseUpdating}
                className={`px-6 py-3 rounded-2xl text-white text-xs font-black uppercase tracking-widest ${isClassCourseUpdating ? 'bg-[#4ea59d]/40 cursor-not-allowed' : 'bg-[#4ea59d]'}`}
              >
                {isClassCourseUpdating ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default COURSES;
