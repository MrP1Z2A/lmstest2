
import React, { useState, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import CourseCard from './components/CourseCard';
import Login from './components/Login';
import { Course, User, UserRole, View, Note, QuizQuestion, Quiz, AppEvent, EventType } from './types';
import { INITIAL_USER, INITIAL_COURSES, FREELANCE_TEACHERS, MOCK_ASSIGNMENTS, ANNOUNCEMENTS, SCHOOL_EVENTS, SCHOOL_ACTIVITIES, UPCOMING_EXAMS, DETAILED_GRADES, STUDENT_ACHIEVEMENTS, SCHOOL_HIVE_POSTS, SCHOOL_CONTACTS } from './constants';
import { summarizeNotes, generateQuizFromNotes } from './services/geminiService';
{/*Test*/}
const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User>(INITIAL_USER);
  const [courses, setCourses] = useState<Course[]>(INITIAL_COURSES);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date(2025, 3, 1)); // April 2025 based on mock data

  const handleLogin = (role: UserRole, email: string) => {
    setUser({ ...INITIAL_USER, role, email });
    setIsLoggedIn(true);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setSelectedCourse(null);
    setActiveQuiz(null);
    setCurrentView('dashboard');
    setIsSidebarOpen(false);
  };

  const handleCourseClick = (course: Course) => {
    setSelectedCourse(course);
    setCurrentView('course-detail');
  };

  const handleSummarize = async (note: Note) => {
    setIsLoading(true);
    const summary = await summarizeNotes(note.content);
    setCourses(prev => prev.map(c => {
      if (c.id === selectedCourse?.id) {
        return {
          ...c,
          notes: c.notes.map(n => n.id === note.id ? { ...n, summary } : n)
        };
      }
      return c;
    }));
    setIsLoading(false);
  };

  const handleGenerateQuiz = async (note: Note) => {
    if (!selectedCourse) return;
    setIsLoading(true);
    const questions = await generateQuizFromNotes(note.content);
    const newQuiz: Quiz = {
      id: `q-${Date.now()}`,
      title: `Quiz: ${note.title}`,
      questions,
      courseId: selectedCourse.id
    };
    setCourses(prev => prev.map(c => {
      if (c.id === selectedCourse.id) {
        return { ...c, quizzes: [...c.quizzes, newQuiz] };
      }
      return c;
    }));
    setActiveQuiz(newQuiz);
    setCurrentView('quiz-player');
    setIsLoading(false);
  };

  const renderTimetable = () => {
    const daysInMonth = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1).getDay();
    const monthName = calendarDate.toLocaleString('default', { month: 'long' });
    const year = calendarDate.getFullYear();

    const calendarGrid = [];
    // Padding for first day
    for (let i = 0; i < firstDayOfMonth; i++) calendarGrid.push(null);
    // Real days
    for (let i = 1; i <= daysInMonth; i++) calendarGrid.push(i);

    const getEventsForDay = (day: number) => {
      const dateStr = `${monthName} ${day < 10 ? '0' + day : day}`;
      const exams = UPCOMING_EXAMS.filter(ex => ex.date.includes(dateStr));
      const assignments = MOCK_ASSIGNMENTS.filter(ass => ass.dueDate.includes(dateStr));
      return { exams, assignments };
    };

    const goToPrevMonth = () => {
      setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
      setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
    };

    return (
      <div className="space-y-8 animate-fadeIn text-slate-100 pb-20">
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 border-b border-[#1f4e4a] pb-8">
          <div className="space-y-2">
            <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic">Schedule Hub</h2>
            <p className="text-[#4ea59d]/60 font-black text-[10px] uppercase tracking-[0.4em]">Campus Calendar & Deadlines</p>
          </div>
          <div className="flex items-center gap-4 bg-[#0f2624] p-2 rounded-[24px] border border-[#1f4e4a]">
            <button 
              onClick={goToPrevMonth}
              className="w-10 h-10 rounded-xl hover:bg-[#1f4e4a] transition-all flex items-center justify-center"
            >
              <i className="fa-solid fa-chevron-left text-xs"></i>
            </button>
            <span className="text-xs font-black uppercase tracking-widest px-4">{monthName} {year}</span>
            <button 
              onClick={goToNextMonth}
              className="w-10 h-10 rounded-xl hover:bg-[#1f4e4a] transition-all flex items-center justify-center"
            >
              <i className="fa-solid fa-chevron-right text-xs"></i>
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-12">
          {/* Calendar Grid */}
          <div className="xl:col-span-3">
            <div className="bg-[#0f2624] rounded-[40px] border border-[#1f4e4a] overflow-hidden shadow-2xl">
              <div className="grid grid-cols-7 border-b border-[#1f4e4a] bg-[#0a1a19]">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {calendarGrid.map((day, idx) => {
                  if (day === null) return <div key={`empty-${idx}`} className="h-32 border-b border-r border-[#1f4e4a] bg-[#0a1a19]/30"></div>;
                  const { exams, assignments } = getEventsForDay(day);
                  const isToday = day === 26 && calendarDate.getMonth() === 3 && calendarDate.getFullYear() === 2025; // Mock "today"
                  
                  return (
                    <div key={day} className={`h-32 border-b border-r border-[#1f4e4a] p-3 transition-colors hover:bg-[#4ea59d]/5 relative group cursor-pointer ${isToday ? 'bg-[#4ea59d]/5' : ''}`}>
                      <span className={`text-[10px] font-black ${isToday ? 'bg-[#4ea59d] text-white w-6 h-6 flex items-center justify-center rounded-full' : 'text-slate-400 group-hover:text-white'}`}>
                        {day}
                      </span>
                      
                      <div className="mt-2 space-y-1">
                        {exams.map((ex, i) => (
                          <div key={i} className="px-2 py-0.5 bg-orange-500/10 border border-orange-500/20 rounded-md text-[8px] font-black text-orange-500 truncate uppercase">
                             <i className="fa-solid fa-file-signature mr-1"></i> {ex.subject}
                          </div>
                        ))}
                        {assignments.map((ass, i) => (
                          <div key={i} className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded-md text-[8px] font-black text-purple-500 truncate uppercase">
                             <i className="fa-solid fa-clock mr-1"></i> {ass.title}
                          </div>
                        ))}
                        {day % 2 === 0 && day < 20 && (
                          <div className="px-2 py-0.5 bg-[#4ea59d]/10 border border-[#4ea59d]/20 rounded-md text-[8px] font-black text-[#4ea59d] truncate uppercase">
                             <i className="fa-solid fa-chalkboard mr-1"></i> Physics Lec
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-8">
             <section className="bg-[#0f2624] p-8 rounded-[40px] border border-[#1f4e4a] shadow-xl">
               <h3 className="text-lg font-black text-white uppercase tracking-tight mb-8 flex items-center gap-3">
                 <i className="fa-solid fa-hourglass-start text-[#4ea59d]"></i> Due Soon
               </h3>
               <div className="space-y-6">
                 {MOCK_ASSIGNMENTS.filter(a => a.status === 'Pending').map((ass, i) => (
                   <div key={i} className="p-5 bg-[#0a1a19] rounded-3xl border border-[#1f4e4a] group hover:border-[#4ea59d] transition-all">
                      <p className="text-[9px] font-black text-[#4ea59d] uppercase mb-1">{ass.dueDate}</p>
                      <h4 className="text-sm font-bold text-white group-hover:text-[#4ea59d] transition-colors">{ass.title}</h4>
                      <p className="text-[8px] text-slate-500 font-black uppercase mt-2 tracking-widest">{ass.course}</p>
                   </div>
                 ))}
               </div>
             </section>

             <section className="bg-[#0f2624] p-8 rounded-[40px] border border-[#1f4e4a] shadow-xl">
                <h3 className="text-lg font-black text-white uppercase tracking-tight mb-8">Weekly View</h3>
                <div className="space-y-4">
                  {[
                    { day: 'Mon', time: '10:30 AM', task: 'Physics Lecture' },
                    { day: 'Tue', time: '09:00 AM', task: 'CS Lab 4' },
                    { day: 'Wed', time: '02:00 PM', task: 'Math Seminar' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 bg-[#0a1a19] rounded-2xl border border-[#1f4e4a]">
                      <div className="w-10 h-10 rounded-xl bg-[#4ea59d]/10 text-[#4ea59d] flex flex-col items-center justify-center text-[10px] font-black">
                         {item.day}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">{item.task}</p>
                        <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest">{item.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
             </section>
          </div>
        </div>
      </div>
    );
  };

  const renderDashboard = () => (
    <div className="space-y-8 animate-fadeIn text-slate-100 pb-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tight italic">Dashboard Central</h2>
          <p className="text-[#4ea59d]/60 text-[10px] font-black uppercase tracking-[0.4em]">Academic Overview</p>
        </div>
      </header>

      {/* Metric Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[#4ea59d] p-8 rounded-[32px] text-white shadow-xl relative overflow-hidden md:col-span-2 group">
          <div className="relative z-10">
            <h3 className="text-[10px] font-black opacity-80 uppercase tracking-[0.2em] text-white">Academic Standing</h3>
            <p className="text-5xl font-black my-4 text-white uppercase italic">Excellent</p>
            <div className="mt-4 flex items-center gap-4">
              <div className="h-2 flex-1 bg-white/20 rounded-full overflow-hidden">
                 <div className="h-full bg-white w-[92%]"></div>
              </div>
              <span className="text-sm font-bold text-white">92%</span>
            </div>
          </div>
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700"></div>
        </div>
        
        <div className="bg-[#0f2624] p-8 rounded-[32px] border border-[#1f4e4a] flex flex-col justify-center">
          <h3 className="text-[10px] font-black text-[#4ea59d] uppercase tracking-[0.2em]">Attendance</h3>
          <p className="text-4xl font-black text-white my-2">98%</p>
          <div className="flex items-center gap-2 text-[#4ea59d]/60 text-[10px] font-bold">
            <i className="fa-solid fa-arrow-up"></i>
            <span>2% Improvement</span>
          </div>
        </div>

        <div className="bg-[#0f2624] p-8 rounded-[32px] border border-[#1f4e4a] flex flex-col justify-center">
          <h3 className="text-[10px] font-black text-[#4ea59d] uppercase tracking-[0.2em]">Portal Sync</h3>
          <p className="text-4xl font-black text-white my-2">Live</p>
          <button className="text-[#4ea59d] text-[10px] font-black uppercase text-left hover:underline">Updated 1m ago</button>
        </div>
      </div>

      {/* Notification Section */}
      <section className="bg-[#0f2624] p-8 rounded-[40px] border border-[#1f4e4a] shadow-2xl relative overflow-hidden">
        <div className="flex items-center justify-between mb-8 relative z-10">
          <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-[#4ea59d]/10 flex items-center justify-center">
              <i className="fa-solid fa-bell text-[#4ea59d] animate-swing"></i>
            </div>
            Recent Notifications
          </h3>
          <button className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-[#4ea59d] transition-colors">
            Mark all as read
          </button>
        </div>
        
        <div className="space-y-4 relative z-10">
          {[
            { id: 1, title: 'Exam Approaching', desc: 'Modern Physics final is in 48 hours.', time: 'Just now', icon: 'fa-calendar-check', color: 'text-orange-500', bg: 'bg-orange-500/10' },
            { id: 2, title: 'New Grade Released', desc: 'Quantum Mechanics Lab report has been graded.', time: '2h ago', icon: 'fa-file-invoice', color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { id: 3, title: 'School Hive Alert', desc: 'Dr. Sarah Smith posted a new update in the community.', time: '5h ago', icon: 'fa-users', color: 'text-purple-500', bg: 'bg-purple-500/10' },
          ].map((notif) => (
            <div key={notif.id} className="p-5 bg-[#0a1a19] rounded-3xl border border-[#1f4e4a] flex items-center gap-6 hover:border-[#4ea59d] transition-all cursor-pointer group">
              <div className={`w-12 h-12 rounded-2xl ${notif.bg} ${notif.color} flex items-center justify-center text-xl shrink-0 group-hover:scale-110 transition-transform`}>
                <i className={`fa-solid ${notif.icon}`}></i>
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h4 className="text-sm font-bold text-white mb-1">{notif.title}</h4>
                  <span className="text-[9px] font-black text-slate-600 uppercase">{notif.time}</span>
                </div>
                <p className="text-xs text-slate-400 font-medium">{notif.desc}</p>
              </div>
              <div className="w-2 h-2 rounded-full bg-[#4ea59d] opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
          ))}
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#4ea59d]/5 blur-[100px] pointer-events-none"></div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="bg-[#0f2624] p-8 rounded-[40px] border border-[#1f4e4a] shadow-xl">
          <h3 className="text-xl font-black text-white uppercase tracking-tight mb-8 flex items-center gap-3">
            <i className="fa-solid fa-bullhorn text-[#4ea59d]"></i> Notice Board
          </h3>
          <div className="space-y-4">
            {ANNOUNCEMENTS.map(item => (
              <div key={item.id} className="p-6 bg-[#0a1a19] rounded-3xl border border-[#1f4e4a] group hover:border-[#4ea59d] transition-all">
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-[8px] font-black px-2 py-1 rounded-lg uppercase ${
                    item.priority === 'High' ? 'bg-red-500/10 text-red-500' : 
                    item.priority === 'Medium' ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-500'
                  }`}>{item.priority} Priority</span>
                  <span className="text-[9px] font-black text-slate-600 uppercase">{item.date}</span>
                </div>
                <h4 className="text-sm font-bold text-white mb-2">{item.title}</h4>
                <p className="text-xs text-slate-400 line-clamp-2">{item.content}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-[#0f2624] p-8 rounded-[40px] border border-[#1f4e4a] shadow-xl">
          <h3 className="text-xl font-black text-white uppercase tracking-tight mb-8">Recent Grades</h3>
          <div className="space-y-4">
             {DETAILED_GRADES.slice(0, 3).map((item, i) => (
               <div key={i} className="flex items-center justify-between p-6 bg-[#0a1a19] rounded-[32px] border border-[#1f4e4a]">
                  <div>
                    <h4 className="text-sm font-bold text-white">{item.assignment}</h4>
                    <p className="text-[9px] font-black text-slate-600 uppercase mt-1">Academic Session 2025</p>
                  </div>
                  <p className="text-2xl font-black text-[#4ea59d]">{item.grade}</p>
               </div>
             ))}
          </div>
        </section>
      </div>
    </div>
  );

  const renderInstruction = () => (
    <div className="space-y-12 animate-fadeIn text-slate-100 pb-20">
      <section className="relative h-72 rounded-[40px] overflow-hidden group">
        <img src="https://images.unsplash.com/photo-1541339907198-e08759dfc3f0?auto=format&fit=crop&w=1200" className="w-full h-full object-cover opacity-40 grayscale group-hover:grayscale-0 transition-all duration-1000" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a1a19] to-transparent"></div>
        <div className="absolute bottom-10 left-10">
          <p className="text-[#4ea59d] font-black uppercase tracking-[0.4em] mb-2">About School</p>
          <h2 className="text-5xl font-black text-white uppercase italic tracking-tighter">EduSphere Academy</h2>
          <p className="max-w-xl text-slate-400 text-sm mt-4 leading-relaxed font-medium">
            Pioneering the future of education through AI-integrated curricula and global mentorship. Our mission is to empower every learner to thrive in an era of rapid technological evolution.
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-12">
          <section>
            <h3 className="text-xl font-black text-white uppercase tracking-tight mb-8 flex items-center gap-4">
              <i className="fa-solid fa-bullhorn text-[#4ea59d]"></i> School Announcements
            </h3>
            <div className="space-y-4">
              {ANNOUNCEMENTS.map(ann => (
                <div key={ann.id} className="p-6 bg-[#0f2624] rounded-3xl border border-[#1f4e4a] hover:border-[#4ea59d] transition-all group">
                  <div className="flex justify-between items-center mb-3">
                    <span className="bg-[#4ea59d]/10 text-[#4ea59d] px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">{ann.priority} Priority</span>
                    <span className="text-[10px] text-slate-600 font-bold uppercase">{ann.date}</span>
                  </div>
                  <h4 className="text-base font-bold text-white mb-2">{ann.title}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">{ann.content}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-xl font-black text-white uppercase tracking-tight mb-8 flex items-center gap-4">
              <i className="fa-solid fa-masks-theater text-[#4ea59d]"></i> Student Activities
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {SCHOOL_ACTIVITIES.map((act, i) => (
                <div key={i} className="p-8 bg-[#0f2624] rounded-[40px] border border-[#1f4e4a] group hover:bg-[#4ea59d]/5 transition-all">
                  <div className="w-14 h-14 bg-[#4ea59d]/10 rounded-2xl flex items-center justify-center text-[#4ea59d] text-2xl mb-6 group-hover:scale-110 transition-transform">
                    <i className={`fa-solid ${act.icon}`}></i>
                  </div>
                  <h4 className="text-lg font-bold text-white mb-2">{act.name}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">{act.description}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="space-y-8">
           <h3 className="text-xl font-black text-white uppercase tracking-tight mb-8">Upcoming Events</h3>
           <div className="space-y-6">
              {SCHOOL_EVENTS.map(ev => (
                <div key={ev.id} className="relative h-48 rounded-[32px] overflow-hidden group cursor-pointer shadow-xl">
                   <img src={ev.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                   <div className="absolute bottom-6 left-6">
                      <p className="text-[10px] font-black text-[#4ea59d] uppercase tracking-widest mb-1">{ev.type}</p>
                      <h4 className="text-sm font-bold text-white uppercase">{ev.name}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 italic"><i className="fa-solid fa-calendar mr-2"></i> {ev.date}</p>
                   </div>
                </div>
              ))}
           </div>
        </section>
      </div>
    </div>
  );

  const renderActivity = () => (
    <div className="space-y-12 animate-fadeIn text-slate-100 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-[#1f4e4a] pb-8">
        <div className="space-y-2">
          <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Activity Portal</h2>
          <p className="text-[#4ea59d]/60 font-black text-[10px] uppercase tracking-[0.4em]">Personal Academic Tracking</p>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
        <div className="xl:col-span-2 space-y-12">
           <section>
              <h3 className="text-xl font-black text-white uppercase tracking-tight mb-8 flex items-center gap-4">
                <i className="fa-solid fa-clipboard-list text-[#4ea59d]"></i> Pending Assignments
              </h3>
              <div className="space-y-4">
                 {MOCK_ASSIGNMENTS.map(ass => (
                   <div key={ass.id} className="p-8 bg-[#0f2624] rounded-[32px] border border-[#1f4e4a] flex flex-col sm:flex-row justify-between items-center gap-6 group">
                      <div className="flex-1">
                         <div className="flex items-center gap-3 mb-2">
                           <h4 className="text-lg font-bold text-white">{ass.title}</h4>
                           <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${ass.status === 'Submitted' ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'}`}>
                             {ass.status}
                           </span>
                         </div>
                         <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{ass.course} • Due {ass.dueDate}</p>
                      </div>
                      <button className="px-6 py-3 bg-[#1f4e4a] hover:bg-[#4ea59d] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Submit Task</button>
                   </div>
                 ))}
              </div>
           </section>

           <section>
              <h3 className="text-xl font-black text-white uppercase tracking-tight mb-8">Grades & AI Feedback</h3>
              <div className="overflow-hidden rounded-[32px] border border-[#1f4e4a] shadow-2xl">
                 <table className="w-full text-left bg-[#0f2624]">
                    <thead className="bg-[#0a1a19]">
                       <tr>
                          <th className="px-8 py-5 text-[10px] font-black text-[#4ea59d] uppercase tracking-widest">Assessment</th>
                          <th className="px-8 py-5 text-[10px] font-black text-[#4ea59d] uppercase tracking-widest">Mark</th>
                          <th className="px-8 py-5 text-[10px] font-black text-[#4ea59d] uppercase tracking-widest">Faculty Insight</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1f4e4a]">
                       {DETAILED_GRADES.map((g, i) => (
                          <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                             <td className="px-8 py-6 font-bold text-sm text-white">{g.assignment}</td>
                             <td className="px-8 py-6 text-xl font-black text-[#4ea59d]">{g.grade}</td>
                             <td className="px-8 py-6 text-xs text-slate-400 italic font-medium leading-relaxed max-w-sm">{g.feedback}</td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </section>
        </div>

        <section className="bg-[#0f2624] p-10 rounded-[40px] border border-[#1f4e4a] shadow-xl h-fit sticky top-10">
           <h3 className="text-xl font-black text-white uppercase tracking-tight mb-8">Exam Schedule</h3>
           <div className="space-y-6">
              {UPCOMING_EXAMS.map((ex, i) => (
                <div key={i} className="relative pl-6 border-l-2 border-[#4ea59d]/30 group">
                   <div className="absolute left-[-5px] top-0 w-2 h-2 rounded-full bg-[#4ea59d] shadow-[0_0_10px_#4ea59d] group-hover:scale-150 transition-transform"></div>
                   <p className="text-[10px] font-black text-[#4ea59d] uppercase tracking-widest">{ex.date} @ {ex.time}</p>
                   <h4 className="text-sm font-bold text-white my-1">{ex.subject}</h4>
                   <p className="text-[10px] text-slate-500 font-bold uppercase"><i className="fa-solid fa-location-dot mr-2"></i> {ex.venue}</p>
                </div>
              ))}
           </div>
           <button className="w-full mt-10 py-4 bg-[#4ea59d]/5 border border-[#4ea59d]/20 text-[#4ea59d] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#4ea59d] hover:text-white transition-all">
              Download Full Schedule
           </button>
        </section>
      </div>
    </div>
  );

  const renderCourses = () => (
    <div className="space-y-12 animate-fadeIn text-slate-100 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-[#1f4e4a] pb-8">
        <div className="space-y-2">
          <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Academic Catalog</h2>
          <p className="text-[#4ea59d]/60 font-black text-[10px] uppercase tracking-[0.4em]">Explore available modules</p>
        </div>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {courses.map(course => (
          <CourseCard key={course.id} course={course} onClick={() => handleCourseClick(course)} />
        ))}
      </div>
    </div>
  );

  const renderStudies = () => (
    <div className="space-y-12 animate-fadeIn text-slate-100 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-[#1f4e4a] pb-8">
        <div className="space-y-2">
          <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Academic Records</h2>
          <p className="text-[#4ea59d]/60 font-black text-[10px] uppercase tracking-[0.4em]">Results & Achievements</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <section className="bg-[#0f2624] p-10 rounded-[40px] border border-[#1f4e4a] shadow-xl">
          <h3 className="text-xl font-black text-white uppercase tracking-tight mb-8">Exam Results</h3>
          <div className="space-y-4">
             {UPCOMING_EXAMS.map((ex, i) => (
               <div key={i} className="p-6 bg-[#0a1a19] rounded-3xl border border-[#1f4e4a] flex justify-between items-center">
                  <div>
                    <h4 className="text-sm font-bold text-white">{ex.subject}</h4>
                    <p className="text-[9px] font-black text-slate-500 uppercase">{ex.date}</p>
                  </div>
                  <span className={`text-lg font-black ${ex.result === 'Pending' ? 'text-orange-500' : 'text-[#4ea59d]'}`}>{ex.result}</span>
               </div>
             ))}
          </div>
        </section>

        <section className="bg-[#0f2624] p-10 rounded-[40px] border border-[#1f4e4a] shadow-xl">
          <h3 className="text-xl font-black text-white uppercase tracking-tight mb-8">Assignment Results</h3>
          <div className="space-y-4">
             {DETAILED_GRADES.map((g, i) => (
               <div key={i} className="p-6 bg-[#0a1a19] rounded-3xl border border-[#1f4e4a] flex justify-between items-center">
                  <h4 className="text-sm font-bold text-white">{g.assignment}</h4>
                  <span className="text-lg font-black text-[#4ea59d]">{g.grade}</span>
               </div>
             ))}
          </div>
        </section>

        <section className="lg:col-span-2 bg-[#0f2624] p-10 rounded-[40px] border border-[#1f4e4a] shadow-xl">
          <h3 className="text-xl font-black text-white uppercase tracking-tight mb-8">Achievements & Badges</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
             {/* Fix typo: STUDENT_ACHIECHEVEMENTS to STUDENT_ACHIEVEMENTS */}
             {STUDENT_ACHIEVEMENTS.map(ach => (
               <div key={ach.id} className="p-8 bg-[#0a1a19] rounded-[40px] border border-[#1f4e4a] text-center space-y-4 group hover:bg-[#4ea59d]/5 transition-all">
                  <div className={`w-20 h-20 mx-auto rounded-[28px] bg-white/5 flex items-center justify-center text-4xl ${ach.color} group-hover:scale-110 transition-transform`}>
                     <i className={`fa-solid ${ach.icon}`}></i>
                  </div>
                  <div>
                    <h4 className="text-base font-black text-white uppercase">{ach.title}</h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{ach.desc}</p>
                  </div>
               </div>
             ))}
          </div>
        </section>
      </div>
    </div>
  );

  const renderContact = () => (
    <div className="space-y-12 animate-fadeIn text-slate-100 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-[#1f4e4a] pb-8">
        <div className="space-y-2">
          <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Communications</h2>
          <p className="text-[#4ea59d]/60 font-black text-[10px] uppercase tracking-[0.4em]">Connect with your community</p>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
        <div className="xl:col-span-2 space-y-12">
          <section className="bg-[#0f2624] p-10 rounded-[40px] border border-[#1f4e4a] shadow-xl">
            <h3 className="text-xl font-black text-white uppercase tracking-tight mb-8 flex items-center gap-4">
               <i className="fa-solid fa-hashtag text-[#4ea59d]"></i> School Hive
            </h3>
            <div className="space-y-6">
               {SCHOOL_HIVE_POSTS.map(post => (
                 <div key={post.id} className="p-8 bg-[#0a1a19] rounded-[32px] border border-[#1f4e4a]">
                    <div className="flex justify-between items-start mb-4">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-[#4ea59d]/20 flex items-center justify-center text-[#4ea59d]">
                             <i className="fa-solid fa-user"></i>
                          </div>
                          <div>
                             <h4 className="text-sm font-bold text-white">{post.user}</h4>
                             <p className="text-[9px] text-slate-600 font-black uppercase">{post.time}</p>
                          </div>
                       </div>
                       <button className="text-slate-600 hover:text-white"><i className="fa-solid fa-ellipsis"></i></button>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed mb-6">{post.content}</p>
                    <div className="flex gap-6 border-t border-[#1f4e4a] pt-4">
                       <button className="text-[10px] font-black text-[#4ea59d] uppercase tracking-widest flex items-center gap-2 hover:opacity-80">
                          <i className="fa-solid fa-heart"></i> {post.likes}
                       </button>
                       <button className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 hover:text-white">
                          <i className="fa-solid fa-comment"></i> {post.replies}
                       </button>
                    </div>
                 </div>
               ))}
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <section className="bg-[#0f2624] p-8 rounded-[40px] border border-[#1f4e4a] shadow-xl">
             <h3 className="text-lg font-black text-white uppercase tracking-tight mb-8">Direct Phone</h3>
             <div className="space-y-4">
                {SCHOOL_CONTACTS.phone.map((ph, i) => (
                  <div key={i} className="p-5 bg-[#0a1a19] rounded-2xl border border-[#1f4e4a]">
                     <p className="text-[9px] font-black text-[#4ea59d] uppercase mb-1">{ph.label}</p>
                     <p className="text-base font-bold text-white">{ph.number}</p>
                     <p className="text-[8px] text-slate-600 uppercase font-black">{ph.hours}</p>
                  </div>
                ))}
             </div>
          </section>

          <section className="bg-[#0f2624] p-8 rounded-[40px] border border-[#1f4e4a] shadow-xl">
             <h3 className="text-lg font-black text-white uppercase tracking-tight mb-8">Social Media</h3>
             <div className="grid grid-cols-2 gap-4">
                {SCHOOL_CONTACTS.socials.map((soc, i) => (
                  <a key={i} href={soc.link} className="p-4 bg-[#0a1a19] rounded-2xl border border-[#1f4e4a] flex flex-col items-center gap-2 group transition-all hover:border-[#4ea59d]">
                     <div className="text-xl" style={{ color: soc.color }}>
                        <i className={`fa-brands ${soc.icon}`}></i>
                     </div>
                     <span className="text-[9px] font-black text-slate-500 group-hover:text-white uppercase">{soc.brand}</span>
                  </a>
                ))}
             </div>
          </section>
        </div>
      </div>
    </div>
  );

  const renderCourseDetail = () => {
    if (!selectedCourse) return null;
    return (
      <div className="space-y-12 animate-fadeIn text-slate-100 pb-20">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-[#1f4e4a] pb-8">
          <div className="space-y-4 flex-1">
            <button onClick={() => setCurrentView('courses')} className="text-[#4ea59d] font-black uppercase text-[10px] tracking-widest flex items-center gap-2 group">
              <i className="fa-solid fa-arrow-left transition-transform group-hover:-translate-x-1"></i> Back to Courses
            </button>
            <h2 className="text-5xl font-black text-white uppercase tracking-tight leading-none">{selectedCourse.title}</h2>
            <div className="flex flex-wrap gap-4 pt-2">
              <span className="bg-[#4ea59d]/10 text-[#4ea59d] px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-[#4ea59d]/20">
                {selectedCourse.category}
              </span>
              <span className="bg-blue-500/10 text-blue-500 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-500/20 flex items-center gap-2">
                <i className="fa-solid fa-clock"></i> {selectedCourse.scheduleDescription}
              </span>
            </div>
          </div>
          {selectedCourse.onlineClassUrl && (
            <a href={selectedCourse.onlineClassUrl} target="_blank" rel="noopener noreferrer" className="px-8 py-4 bg-[#4ea59d] text-white rounded-[24px] text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-[#4ea59d]/30 hover:scale-105 transition-all flex items-center gap-3">
              <i className="fa-solid fa-video animate-pulse"></i> Join Online Class
            </a>
          )}
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
          <div className="xl:col-span-2 space-y-12">
            <section className="bg-[#0f2624] p-10 rounded-[40px] border border-[#1f4e4a] shadow-xl">
               <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-6 flex items-center gap-4">
                 <i className="fa-solid fa-compass text-[#4ea59d]"></i> Module Introduction
               </h3>
               <p className="text-slate-200 text-lg leading-relaxed italic">{selectedCourse.moduleIntro}</p>
               <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedCourse.topics.map((t, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 bg-[#0a1a19] rounded-2xl border border-[#1f4e4a]">
                       <div className="w-8 h-8 rounded-full bg-[#4ea59d]/10 text-[#4ea59d] flex items-center justify-center text-xs font-black">
                          {i + 1}
                       </div>
                       <span className="text-sm font-bold text-white">{t}</span>
                    </div>
                  ))}
               </div>
            </section>

            <section className="bg-[#0f2624] p-10 rounded-[40px] border border-[#1f4e4a] shadow-xl">
               <h3 className="text-xl font-black text-white uppercase tracking-tight mb-8 flex items-center gap-4">
                 <i className="fa-solid fa-book-open text-[#4ea59d]"></i> Learning Resources
               </h3>
               <div className="space-y-8">
                 {selectedCourse.notes.map(note => (
                   <div key={note.id} className="p-8 bg-[#0a1a19] rounded-[40px] border border-[#1f4e4a] space-y-6">
                      <div className="flex justify-between items-start flex-col sm:flex-row gap-4">
                        <h4 className="text-xl font-black text-white">{note.title}</h4>
                        {note.ebookUrl && (
                          <a href={note.ebookUrl} target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 bg-[#4ea59d] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2">
                             <i className="fa-solid fa-download"></i> Download Ebook
                          </a>
                        )}
                      </div>
                      <p className="text-base text-slate-300 leading-relaxed">{note.content}</p>
                      <div className="flex flex-wrap gap-4 pt-4 border-t border-[#1f4e4a]">
                        <button onClick={() => handleSummarize(note)} className="px-6 py-3 bg-[#4ea59d]/10 border border-[#4ea59d]/30 text-[#4ea59d] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#4ea59d] hover:text-white transition-all">
                          AI Summary
                        </button>
                        <button onClick={() => handleGenerateQuiz(note)} className="px-6 py-3 bg-orange-500/10 border border-orange-500/30 text-orange-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-all">
                          Generate Quiz
                        </button>
                      </div>
                      {note.summary && (
                        <div className="mt-8 p-8 bg-[#4ea59d]/5 border-l-8 border-[#4ea59d] rounded-r-[32px] animate-slideIn">
                           <p className="text-[10px] font-black text-[#4ea59d] uppercase tracking-[0.2em] mb-4 italic">AI Intelligent Summary</p>
                           <p className="text-base text-slate-400 leading-relaxed">{note.summary}</p>
                        </div>
                      )}
                   </div>
                 ))}
                 {selectedCourse.notes.length === 0 && (
                   <div className="p-12 text-center bg-[#0a1a19] rounded-[40px] border border-dashed border-[#1f4e4a] text-slate-600 font-black uppercase tracking-widest italic">
                     No notes uploaded yet.
                   </div>
                 )}
               </div>
            </section>
          </div>

          <div className="space-y-8">
            <section className="bg-[#0f2624] p-8 rounded-[40px] border border-[#1f4e4a] shadow-xl">
               <h3 className="text-lg font-black text-white uppercase tracking-tight mb-8">Faculty Details</h3>
               <div className="space-y-6">
                  <div className="p-6 bg-[#0a1a19] rounded-3xl border border-[#1f4e4a] flex items-center gap-4">
                     <div className="w-14 h-14 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center text-xl shrink-0">
                        <i className="fa-solid fa-user-tie"></i>
                     </div>
                     <div>
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Faculty Lead</p>
                        <p className="text-base font-bold text-white">{selectedCourse.subTeacherName || "Lead Professor"}</p>
                     </div>
                  </div>
                  <div className="p-6 bg-[#0a1a19] rounded-3xl border border-[#1f4e4a] flex items-center gap-4">
                     <div className="w-14 h-14 rounded-2xl bg-[#4ea59d]/10 text-[#4ea59d] flex items-center justify-center text-xl shrink-0">
                        <i className="fa-solid fa-clock"></i>
                     </div>
                     <div>
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Class Timetable</p>
                        <p className="text-sm font-bold text-white leading-snug">{selectedCourse.scheduleDescription}</p>
                     </div>
                  </div>
               </div>
            </section>
          </div>
        </div>
      </div>
    );
  };

  const renderQuizPlayer = () => {
    if (!activeQuiz) return null;
    return (
      <div className="space-y-8 animate-fadeIn text-slate-100 pb-20">
        <header className="flex justify-between items-center">
          <h2 className="text-3xl font-black text-white uppercase tracking-tight">{activeQuiz.title}</h2>
          <button onClick={() => setCurrentView('course-detail')} className="px-6 py-3 bg-[#1f4e4a] hover:bg-[#4ea59d] text-white rounded-2xl text-xs font-bold transition-all">Exit Quiz</button>
        </header>
        <div className="max-w-3xl mx-auto space-y-6">
          {activeQuiz.questions.map((q, qIdx) => (
            <div key={qIdx} className="bg-[#0f2624] p-8 rounded-[32px] border border-[#1f4e4a] shadow-xl">
              <h4 className="text-lg font-bold text-white mb-6 flex gap-4"><span className="text-[#4ea59d]">Q{qIdx + 1}.</span>{q.question}</h4>
              <div className="grid grid-cols-1 gap-3">
                {q.options.map((opt, oIdx) => (
                  <button key={oIdx} className="p-5 text-left bg-[#0a1a19] border border-[#1f4e4a] rounded-2xl hover:border-[#4ea59d] transition-all text-sm">{opt}</button>
                ))}
              </div>
            </div>
          ))}
          <button onClick={() => { alert('Quiz submitted!'); setCurrentView('course-detail'); }} className="w-full py-5 bg-[#4ea59d] text-white rounded-[24px] font-black uppercase tracking-[0.2em] shadow-xl">Submit Answers</button>
        </div>
      </div>
    );
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex flex-col md:flex-row bg-[#0a1a19] min-h-screen text-[#f1f5f9]">
      <header className="md:hidden flex items-center justify-between p-4 bg-[#0f2624] border-b border-[#1f4e4a] sticky top-0 z-[50]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#4ea59d] rounded-lg flex items-center justify-center text-white"><i className="fa-solid fa-graduation-cap"></i></div>
          <h1 className="text-lg font-black tracking-tighter text-white uppercase italic">EduSphere</h1>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-white p-2">
          <i className={`fa-solid ${isSidebarOpen ? 'fa-xmark' : 'fa-bars'} text-xl`}></i>
        </button>
      </header>

      <Sidebar 
        currentView={currentView} 
        onViewChange={setCurrentView} 
        onLogout={handleLogout}
        userRole={user.role}
        userEmail={user.email}
        userName={user.name}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />
      <main className={`flex-1 md:ml-72 p-6 md:p-8 overflow-x-hidden ${isSidebarOpen ? 'hidden md:block' : 'block'}`}>
        {currentView === 'dashboard' && renderDashboard()}
        {currentView === 'instruction' && renderInstruction()}
        {currentView === 'activity' && renderActivity()}
        {currentView === 'courses' && renderCourses()}
        {currentView === 'course-detail' && renderCourseDetail()}
        {currentView === 'quiz-player' && renderQuizPlayer()}
        {currentView === 'studies' && renderStudies()}
        {currentView === 'contact' && renderContact()}
        {currentView === 'timetable' && renderTimetable()}
        {currentView === 'profile' && (
           <div className="space-y-8 animate-fadeIn text-slate-100">
             <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">Student Profile</h2>
             <div className="bg-[#0f2624] p-6 md:p-10 rounded-[32px] md:rounded-[40px] border border-[#1f4e4a] max-w-2xl shadow-2xl relative overflow-hidden">
                 <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-center relative z-10">
                     <img src={user.avatar} className="w-32 h-32 md:w-40 md:h-40 rounded-[24px] md:rounded-[40px] border-4 border-[#4ea59d] p-1 shadow-2xl object-cover" />
                     <div className="flex-1 space-y-4 text-center sm:text-left">
                         <div>
                             <p className="text-[9px] font-black text-[#4ea59d] uppercase mb-1">Full Name</p>
                             <h3 className="text-2xl md:text-3xl font-black text-white">{user.name}</h3>
                         </div>
                         <div className="grid grid-cols-1 gap-4 pt-4 border-t border-[#1f4e4a]">
                             <div>
                                 <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Email Address</p>
                                 <p className="text-xs font-bold text-slate-200">{user.email}</p>
                             </div>
                             <div>
                                 <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Student ID</p>
                                 <p className="text-xs font-mono font-bold text-[#4ea59d]">{user.studentId || 'N/A'}</p>
                             </div>
                         </div>
                     </div>
                 </div>
             </div>
           </div>
        )}
        {!['dashboard', 'instruction', 'activity', 'courses', 'course-detail', 'quiz-player', 'profile', 'studies', 'contact', 'timetable'].includes(currentView) && (
          <div className="flex items-center justify-center h-full text-slate-500 font-bold uppercase tracking-widest italic">
            Component "{currentView}" coming soon...
          </div>
        )}
      </main>
      
      {isLoading && (
        <div className="fixed inset-0 bg-[#0a1a19]/80 backdrop-blur-md flex items-center justify-center z-[200] animate-fadeIn">
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 border-4 border-[#4ea59d]/20 border-t-[#4ea59d] rounded-full animate-spin mb-6"></div>
            <div className="text-white font-bold text-2xl tracking-tight">EduSphere AI is thinking...</div>
            <p className="text-[#4ea59d] mt-2 animate-pulse uppercase text-[10px] font-black tracking-widest">Processing request</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
