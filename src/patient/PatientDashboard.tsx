import { useState, useEffect, useMemo, useRef, Component, ReactNode } from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  BedDouble, 
  FileText, 
  Star, 
  User, 
  Settings, 
  HelpCircle, 
  LogOut, 
  Bell, 
  ArrowRight, 
  Clock, 
  CheckCircle2, 
  Plus, 
  X, 
  Search, 
  Filter, 
  Stethoscope, 
  Building2, 
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  TestTube,
  Volume2,
  Award,
  Eye,
  PhoneCall,
  MapPin,
  Send,
  Trash2,
  Camera,
  AlertTriangle,
  Download
} from 'lucide-react';

import { getApiUrl } from '../utils/api.ts';

interface PatientDashboardProps {
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    patient_uid?: string;
  };
  onLogout: () => void;
  onNavigateTab?: (tab: string) => void;
}

// Helper: Get today ISO date string (YYYY-MM-DD)
const getTodayIsoString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper: Get tomorrow ISO date string (YYYY-MM-DD)
const getTomorrowIsoString = (): string => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper: Format ISO YYYY-MM-DD to readable date e.g. "Sep 06, 2026"
const formatIsoToReadableDate = (dateVal: string): string => {
  if (!dateVal) return '';
  if (dateVal.includes(',')) return dateVal;
  const d = new Date(dateVal + 'T00:00:00');
  if (isNaN(d.getTime())) return dateVal;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Helper: Convert any date string to YYYY-MM-DD format for <input type="date">
const convertToIsoDate = (dateVal: string): string => {
  if (!dateVal) return getTomorrowIsoString();
  const trimmed = dateVal.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const d = new Date(dateVal);
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return getTomorrowIsoString();
};

// Helper: Parse time string (supports dots like 1.45, am/pm, 24hr, midnight) to total minutes from 00:00
const parseTimeToMinutes = (timeStr: string): number | null => {
  if (!timeStr) return null;
  const cleaned = timeStr.trim().replace(/\./g, ':').replace(/adm/i, 'am').replace(/pdm/i, 'pm');
  const match = cleaned.match(/^(\d{1,2}):?(\d{2})?\s*(AM|PM)?$/i);
  if (!match) return null;
  
  let hours = parseInt(match[1], 10);
  let minutes = match[2] ? parseInt(match[2], 10) : 0;
  const ampm = match[3] ? match[3].toUpperCase() : null;

  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
};

// Helper: Check if requested time is within doctor schedule range (including 1:30 AM - 11:00 PM)
const validateTimeAgainstSchedule = (timeStr: string, scheduleStr?: string): { isValid: boolean; rangeText: string; warningMsg?: string } => {
  if (!scheduleStr || scheduleStr === 'Not specified') {
    return { isValid: true, rangeText: '' };
  }

  const rangeMatch = scheduleStr.match(/(\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)\s*-\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)/i);
  if (!rangeMatch) {
    return { isValid: true, rangeText: scheduleStr };
  }

  const rangeText = `${rangeMatch[1]} - ${rangeMatch[2]}`;
  const startMins = parseTimeToMinutes(rangeMatch[1]);
  const endMins = parseTimeToMinutes(rangeMatch[2]);
  const reqMins = parseTimeToMinutes(timeStr);

  if (startMins === null || endMins === null || reqMins === null) {
    return { isValid: true, rangeText };
  }

  if (startMins <= endMins) {
    const ok = reqMins >= startMins && reqMins <= endMins;
    return {
      isValid: ok,
      rangeText,
      warningMsg: ok ? undefined : `Selected time (${timeStr}) is outside doctor's consultation hours (${rangeText}).`
    };
  } else {
    // Overnight schedule e.g. 10:00 PM - 6:00 AM
    const ok = reqMins >= startMins || reqMins <= endMins;
    return {
      isValid: ok,
      rangeText,
      warningMsg: ok ? undefined : `Selected time (${timeStr}) is outside doctor's consultation hours (${rangeText}).`
    };
  }
};

const DEFAULT_HOSPITALS = [
  { id: 1, name: 'City Hospital, Dhaka', location: 'Dhanmondi, Dhaka', rating: 4.8, total_reviews: 142 },
  { id: 2, name: 'Square Hospital, Dhaka', location: 'Panthapath, Dhaka', rating: 4.9, total_reviews: 310 },
  { id: 3, name: 'Evercare Hospital, Dhaka', location: 'Bashundhara, Dhaka', rating: 4.9, total_reviews: 280 },
  { id: 4, name: 'United Hospital, Dhaka', location: 'Gulshan, Dhaka', rating: 4.7, total_reviews: 195 },
  { id: 5, name: 'Dhaka Medical College Hospital', location: 'Bakshibazar, Dhaka', rating: 4.6, total_reviews: 520 }
];

const DEFAULT_DOCTORS = [
  { 
    id: 1, 
    name: 'Dr. Nusrat Jahan', 
    doctor_name: 'Dr. Nusrat Jahan', 
    specialty: 'Cardiologist', 
    specialist: 'Cardiologist', 
    hospital: 'City Hospital, Dhaka • Dhaka Medical College Hospital',
    rating: 4.9, 
    experience: '12 Years',
    schedule: 'Sat - Mon: 10:00 AM - 2:00 PM',
    chambers: [
      { hospital: 'City Hospital, Dhaka', address: 'Building A, 3rd Floor, Room 302', schedule: 'Sat - Mon: 10:00 AM - 2:00 PM', default_time: '10:30 AM', is_available: true },
      { hospital: 'Dhaka Medical College Hospital', address: 'Building B, 2nd Floor, Room 204', schedule: 'Tue - Thu: 4:00 PM - 8:00 PM', default_time: '04:30 PM', is_available: false, unavailability_reason: 'On leave for 2 days due to medical conference.' }
    ]
  },
  { 
    id: 2, 
    name: 'Dr. Ahmed Rahman', 
    doctor_name: 'Dr. Ahmed Rahman', 
    specialty: 'Neurologist', 
    specialist: 'Neurologist', 
    hospital: 'Square Hospital, Dhaka • Evercare Hospital, Dhaka',
    rating: 4.8, 
    experience: '15 Years',
    schedule: 'Sat - Wed: 9:00 AM - 1:00 PM',
    chambers: [
      { hospital: 'Square Hospital, Dhaka', address: 'Building A, 3rd Floor, Room 302', schedule: 'Sat - Wed: 9:00 AM - 1:00 PM', default_time: '09:30 AM', is_available: false, unavailability_reason: 'Attending International Neurosurgery Seminar (Unavailable for 2 days).' },
      { hospital: 'Evercare Hospital, Dhaka', address: 'Building C, 4th Floor, Room 408', schedule: 'Thu - Fri: 5:00 PM - 9:00 PM', default_time: '05:30 PM', is_available: true }
    ]
  },
  { 
    id: 3, 
    name: 'Dr. Farhana Islam', 
    doctor_name: 'Dr. Farhana Islam', 
    specialty: 'Pediatrician', 
    specialist: 'Pediatrician', 
    hospital: 'Evercare Hospital, Dhaka • United Hospital, Dhaka',
    rating: 4.9, 
    experience: '8 Years',
    schedule: 'Sat - Thu: 10:00 AM - 4:00 PM',
    chambers: [
      { hospital: 'Evercare Hospital, Dhaka', address: 'Building A, 3rd Floor, Room 302', schedule: 'Sat - Thu: 10:00 AM - 4:00 PM', default_time: '11:00 AM', is_available: true },
      { hospital: 'United Hospital, Dhaka', address: 'Building D, 1st Floor, Room 102', schedule: 'Fri: 3:00 PM - 7:00 PM', default_time: '03:30 PM', is_available: true }
    ]
  },
  { 
    id: 4, 
    name: 'Dr. Shakil Ahmed', 
    doctor_name: 'Dr. Shakil Ahmed', 
    specialty: 'Orthopedic Surgeon', 
    specialist: 'Orthopedic Surgeon', 
    hospital: 'United Hospital, Dhaka • City Hospital, Dhaka',
    rating: 4.7, 
    experience: '14 Years',
    schedule: 'Sat - Wed: 11:00 AM - 5:00 PM',
    chambers: [
      { hospital: 'United Hospital, Dhaka', address: 'Building A, 3rd Floor, Room 302', schedule: 'Sat - Wed: 11:00 AM - 5:00 PM', default_time: '11:30 AM', is_available: true },
      { hospital: 'City Hospital, Dhaka', address: 'Building B, 2nd Floor, Room 210', schedule: 'Thu - Fri: 4:00 PM - 8:00 PM', default_time: '04:30 PM', is_available: true }
    ]
  },
  { 
    id: 5, 
    name: 'Dr. Tawhidul Islam', 
    doctor_name: 'Dr. Tawhidul Islam', 
    specialty: 'General Physician', 
    specialist: 'General Physician', 
    hospital: 'Dhaka Medical College Hospital • Square Hospital, Dhaka',
    rating: 4.8, 
    experience: '10 Years',
    schedule: 'Sat - Thu: 8:00 AM - 2:00 PM',
    chambers: [
      { hospital: 'Dhaka Medical College Hospital', address: 'Building A, 3rd Floor, Room 302', schedule: 'Sat - Thu: 8:00 AM - 2:00 PM', default_time: '09:00 AM', is_available: true },
      { hospital: 'Square Hospital, Dhaka', address: 'Building C, 3rd Floor, Room 305', schedule: 'Sat - Wed: 5:00 PM - 9:00 PM', default_time: '05:30 PM', is_available: true }
    ]
  },
  { 
    id: 6, 
    name: 'Dr. Tanhiad', 
    doctor_name: 'Dr. Tanhiad', 
    specialty: 'Neurosurgeon', 
    specialist: 'Neurosurgeon', 
    hospital: 'Dhaka Medical College Hospital • City Hospital, Dhaka',
    rating: 4.6, 
    experience: '5 Years',
    schedule: 'Sat - Thu: 1:30 AM - 11:00 PM',
    chambers: [
      { hospital: 'Dhaka Medical College Hospital', address: 'Building A, 4th Floor, Room 405', schedule: 'Sat - Thu: 1:30 AM - 11:00 PM', default_time: '01:30 AM', is_available: true },
      { hospital: 'City Hospital, Dhaka', address: 'Building B, 2nd Floor, Room 208', schedule: 'Sat - Thu: 1:30 AM - 11:00 PM', default_time: '01:45 AM', is_available: true }
    ]
  }
];

interface ErrorBoundaryProps {
  children: ReactNode;
  tabName?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class DashboardErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Dashboard Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-white/60 backdrop-blur-md rounded-3xl p-8 sm:p-12 text-center border border-rose-200 shadow-xl max-w-2xl mx-auto my-8 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-200">
            <X className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-black text-[#0A192F] tracking-tight">
            Unable to Load {this.props.tabName || 'Section'} Content
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 font-medium mt-2 max-w-md mx-auto">
            An unexpected error occurred while rendering this section. Your sidebar and dashboard structure remain fully accessible.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                if (this.props.onReset) this.props.onReset();
              }}
              className="bg-[#0066FF] hover:bg-[#0055E0] text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
            >
              Reload Section
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function PatientDashboard({ user, onLogout, onNavigateTab }: PatientDashboardProps) {
  const getInitialTabFromUrl = (): string => {
    const hash = window.location.hash.toLowerCase();
    const path = window.location.pathname.toLowerCase();
    if (hash.includes('appointment') || path.includes('appointment')) return 'Appointments';
    if (hash.includes('room') || path.includes('room')) return 'Room Booking';
    if (hash.includes('hospital') || path.includes('hospital')) return 'Hospitals';
    if (hash.includes('diagnostic') || path.includes('diagnostic')) return 'Diagnostics';
    if (hash.includes('prescription') || path.includes('prescription')) return 'Prescriptions';
    if (hash.includes('review') || hash.includes('rating') || path.includes('review')) return 'Reviews & Ratings';
    if (hash.includes('profile') || path.includes('profile')) return 'Profile';
    if (hash.includes('setting') || path.includes('setting')) return 'Settings';
    return 'Dashboard';
  };

  const [activeSidebar, setActiveSidebar] = useState<string>(getInitialTabFromUrl);

  useEffect(() => {
    const slugMap: Record<string, string> = {
      'Dashboard': 'Dashboard',
      'Appointments': 'Appointments',
      'Room Booking': 'Room-Booking',
      'Hospitals': 'Hospitals',
      'Diagnostics': 'Diagnostics',
      'Prescriptions': 'Prescriptions',
      'Reviews & Ratings': 'Reviews-Ratings',
      'Profile': 'Profile',
      'Settings': 'Settings'
    };
    const slug = slugMap[activeSidebar] || 'Dashboard';
    const newHash = `#/${slug}`;
    if (window.location.hash !== newHash) {
      window.history.pushState(null, '', `/Medinet/${newHash}`);
    }
  }, [activeSidebar]);

  useEffect(() => {
    const handleHashChange = () => {
      const tab = getInitialTabFromUrl();
      setActiveSidebar(tab);
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, []);
  const [profile, setProfile] = useState<any>({
    patient_uid: user.patient_uid || `P-2026-${String(user.id || 1).padStart(5, '0')}`,
    phone: '',
    blood_group: 'A+',
    allergies: 'None',
    address: '',
    date_of_birth: '',
    gender: 'Female',
    profile_image: ''
  });
  const [appointments, setAppointments] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [roomBookings, setRoomBookings] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [apiSpecialties, setApiSpecialties] = useState<string[]>([]);
  const [isDoctorsLoading, setIsDoctorsLoading] = useState<boolean>(false);
  void isDoctorsLoading;
  void DEFAULT_DOCTORS;
  const [hospitals, setHospitals] = useState<any[]>(DEFAULT_HOSPITALS);
  const [stats, setStats] = useState({
    prescriptionsCount: 0,
    appointmentsCount: 0,
    roomsCount: 0,
    reviewsCount: 0,
    diagnosticCount: 0
  });

  const getGlobalDiagLocation = (testName: string, fallbackLoc: string = '') => {
    try {
      const master = JSON.parse(localStorage.getItem('medinet_global_diag_locations') || '[]');
      const match = master.find((m: any) => m.name && testName && m.name.toLowerCase().trim() === testName.toLowerCase().trim());
      if (match && match.location) return match.location;
    } catch (e) {}
    return fallbackLoc || 'Diagnostic Wing, Ground Floor';
  };

  const getLatestDoctorChamber = (docNameStr: string, hospStr: string, fallbackChamber: string): string => {
    try {
      const notifs = JSON.parse(localStorage.getItem('medinet_doctor_room_notifs') || '[]');
      const normDoc = String(docNameStr || '').toLowerCase().replace(/^dr[\.\s]*/i, '').trim();
      const normHosp = String(hospStr || '').toLowerCase().trim();

      const matchedNotif = notifs.find((n: any) => {
        if (!n.doctor_name || n.status !== 'Accepted') return false;
        const nDoc = String(n.doctor_name).toLowerCase().replace(/^dr[\.\s]*/i, '').trim();
        const nHosp = String(n.hospital || '').toLowerCase().trim();
        const docMatches = nDoc.includes(normDoc) || normDoc.includes(nDoc);
        const hospMatches = !normHosp || !nHosp || nHosp.includes(normHosp) || normHosp.includes(nHosp);
        return docMatches && hospMatches;
      });

      if (matchedNotif && matchedNotif.new_chamber) {
        return matchedNotif.new_chamber;
      }
    } catch (e) {}

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('medinet_doc_profile_')) {
          const prof = JSON.parse(localStorage.getItem(key) || '{}');
          const pName = String(prof.name || '').toLowerCase().replace(/^dr[\.\s]*/i, '').trim();
          const normDoc = String(docNameStr || '').toLowerCase().replace(/^dr[\.\s]*/i, '').trim();
          if (pName && normDoc && (pName.includes(normDoc) || normDoc.includes(pName))) {
            if (Array.isArray(prof.chambers)) {
              const ch = prof.chambers.find((c: any) => {
                const cHosp = String(c.hospital || '').toLowerCase().trim();
                const normHosp = String(hospStr || '').toLowerCase().trim();
                return !normHosp || cHosp.includes(normHosp) || normHosp.includes(cHosp);
              });
              if (ch && ch.address) return ch.address;
            }
          }
        }
      }
    } catch (e) {}

    return fallbackChamber;
  };

  // Doctor search & preference filtering state (Single Source of Truth)
  const [doctorSearchQuery, setDoctorSearchQuery] = useState('');
  const [activeDoctorSearch, setActiveDoctorSearch] = useState('');
  const [selectedSpecialtyFilter, setSelectedSpecialtyFilter] = useState('All');
  const [isSpecialtyFilterOpen, setIsSpecialtyFilterOpen] = useState(false);
  const specialtyDropdownRef = useRef<HTMLDivElement>(null);
  const reviewFormRef = useRef<HTMLDivElement>(null);
  void reviewFormRef;

  // Modal states for creating appointment
  const [isAppModalOpen, setIsAppModalOpen] = useState(false);
  const [selectedDocForBooking, setSelectedDocForBooking] = useState<any | null>(null);
  const [docName, setDocName] = useState('Dr. Nusrat Jahan');
  const [specialty, setSpecialty] = useState('Cardiologist');
  const [hospital, setHospital] = useState('City Hospital, Dhaka');
  const [appDate, setAppDate] = useState(dateStrTomorrow());
  const [appTime, setAppTime] = useState('10:30 AM');
  const [appSerialNum, setAppSerialNum] = useState('SL-01');
  const [docChamber, setDocChamber] = useState('Building A, 3rd Floor, Room 302');
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState<string>('');
  const [isSavingApp, setIsSavingApp] = useState(false);

  // Diagnostic Modal Booking State
  const [isDiagBookModalOpen, setIsDiagBookModalOpen] = useState(false);
  const [selectedDiagTest, setSelectedDiagTest] = useState<any | null>(null);
  const [diagBookDate, setDiagBookDate] = useState(dateStrTomorrow());
  const [diagUserPhone, setDiagUserPhone] = useState('+880 1711-000000');
  const [isSavingDiagBooking, setIsSavingDiagBooking] = useState(false);

  // Live Call Out Alert State
  const [callOutNotifications, setCallOutNotifications] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('medinet_patient_callouts') || '[]');
    } catch {
      return [];
    }
  });

  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);

  useEffect(() => {
    const checkCallouts = () => {
      try {
        const saved = JSON.parse(localStorage.getItem('medinet_patient_callouts') || '[]');
        setCallOutNotifications(saved);
      } catch (e) {}
    };
    checkCallouts();
    const interval = setInterval(checkCallouts, 2000);
    return () => clearInterval(interval);
  }, []);

  // Prescription Upload Modal State
  const [isPrescUploadModalOpen, setIsPrescUploadModalOpen] = useState(false);
  const [prescTitle, setPrescTitle] = useState('Cardiology Prescription');
  const [prescDoctor, setPrescDoctor] = useState('Dr. Nusrat Jahan');
  const [prescHospital, setPrescHospital] = useState('City Hospital, Dhaka');
  const [prescDate, setPrescDate] = useState(dateStrNow());
  const [prescFile, setPrescFile] = useState<string | null>(null);
  const [isUploadingPresc, setIsUploadingPresc] = useState(false);
  const [selectedPrescPreview, setSelectedPrescPreview] = useState<any | null>(null);
  const [prescSearchQuery, setPrescSearchQuery] = useState('');

  // Verified Visit Rating Modal State
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [selectedVisitToRate, setSelectedVisitToRate] = useState<any | null>(null);
  const [rateStarRating, setRateStarRating] = useState(5);
  const [rateComment, setRateComment] = useState('');
  const [isSubmittingRate, setIsSubmittingRate] = useState(false);
  const [rateModalMsg, setRateModalMsg] = useState('');

  const openRateModalForVisit = (svc?: any) => {
    const target = svc || {
      target_name: (doctors && doctors.length > 0) ? (doctors[0].doctor_name || doctors[0].name || 'Dr. Tanhiad') : 'Dr. Tanhiad',
      target_type: 'doctor',
      service_date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };
    setSelectedVisitToRate(target);
    setRateStarRating(5);
    setRateComment('');
    setRateModalMsg('');
    setIsRateModalOpen(true);
  };

  const handleSubmitVerifiedVisitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisitToRate) return;
    setIsSubmittingRate(true);
    setRateModalMsg('');

    const finalComment = rateComment.trim() || `Verified patient rating of ${rateStarRating} stars for ${selectedVisitToRate.target_name}. Excellent service and medical care.`;

    try {
      const res = await fetch(getApiUrl('reviews.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_name: patientName,
          target_name: selectedVisitToRate.target_name,
          target_type: selectedVisitToRate.target_type || 'doctor',
          rating: rateStarRating,
          comment: finalComment
        })
      });
      const data = await res.json();
      setIsSubmittingRate(false);
      if (data.success) {
        setRateModalMsg('Thank you! Your verified review has been published.');
        if (selectedVisitToRate.id) {
          setDismissedServiceIds((prev) => new Set(prev).add(selectedVisitToRate.id));
        }
        await loadPatientData();
        setTimeout(() => {
          setIsRateModalOpen(false);
          setSelectedVisitToRate(null);
        }, 1200);
      } else {
        setRateModalMsg(data.message || 'Failed to submit review.');
      }
    } catch {
      setIsSubmittingRate(false);
      setRateModalMsg('Verified review submitted successfully!');
      if (selectedVisitToRate.id) {
        setDismissedServiceIds((prev) => new Set(prev).add(selectedVisitToRate.id));
      }
      await loadPatientData();
      setTimeout(() => {
        setIsRateModalOpen(false);
        setSelectedVisitToRate(null);
      }, 1200);
    }
  };

  // Support & Help Desk State
  const [supportPhone, setSupportPhone] = useState('');
  const [supportCategory, setSupportCategory] = useState('General Query');
  const [supportMessage, setSupportMessage] = useState('');
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);
  const [supportSubmitMsg, setSupportSubmitMsg] = useState('');

  // Profile Edit Modal State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editPhone, setEditPhone] = useState('');
  const [editRoad, setEditRoad] = useState('House 24, Road 5');
  const [editArea, setEditArea] = useState('Shantinagar');
  const [editCity, setEditCity] = useState('Dhaka');
  const [editAddress, setEditAddress] = useState('');
  const [editBloodGroup, setEditBloodGroup] = useState('A+');
  const [editAllergies, setEditAllergies] = useState('None');
  const [editDob, setEditDob] = useState('1998-05-14');
  const [editGender, setEditGender] = useState('Female');
  const [editProfileImage, setEditProfileImage] = useState<string>('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Settings Modal State
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Room & Hospital Dashboard State
  const [hospSearchQuery, setHospSearchQuery] = useState('');
  const [isHospitalsLoading, setIsHospitalsLoading] = useState(true);
  const [selectedHosp, setSelectedHosp] = useState<any | null>(DEFAULT_HOSPITALS[0]);
  const [activeRoomBookingHosp, setActiveRoomBookingHosp] = useState<any | null>(null);
  const [activeHospitalDetailModal, setActiveHospitalDetailModal] = useState<any | null>(null);
  const [isAddHospModalOpen, setIsAddHospModalOpen] = useState(false);
  const [newHospName, setNewHospName] = useState('');
  const [newHospLocation, setNewHospLocation] = useState('Dhaka');
  const [isAddingHosp, setIsAddingHosp] = useState(false);
  const [addHospMsg, setAddHospMsg] = useState('');

  const getTodayYYYYMMDD = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Live Room Booking State
  const [roomWard, setRoomWard] = useState('General Ward');
  const [roomStartDate, setRoomStartDate] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [roomEndDate, setRoomEndDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [dateErrorMsg, setDateErrorMsg] = useState<string>('');
  const [selectedRoomNum, setSelectedRoomNum] = useState('101');
  const [hospRooms, setHospRooms] = useState<any[]>([]);
  const [isReservingRoom, setIsReservingRoom] = useState(false);
  const [roomResMsg, setRoomResMsg] = useState('');

  // Dynamic Diagnostic & Summary State
  const [diagnosticServices, setDiagnosticServices] = useState<any[]>([]);
  const [diagnosticBookings, setDiagnosticBookings] = useState<any[]>([]);
  const [pastVisitedServices, setPastVisitedServices] = useState<any[]>([]);
  const [diagSearchQuery, setDiagSearchQuery] = useState('');
  const [diagBookingMsg, setDiagBookingMsg] = useState('');

  // Summary Item Delete / Undo Modal State
  const [manageSummaryModal, setManageSummaryModal] = useState<'diagnostic' | 'appointments' | 'prescriptions' | 'rooms' | 'reviews' | null>(null);
  const [isDeletingItemId, setIsDeletingItemId] = useState<number | null>(null);
  const [deleteMsg, setDeleteMsg] = useState('');

  const loadDiagnostics = () => {
    fetch(getApiUrl('diagnostics.php'))
      .then(res => res.json())
      .then(data => {
        if (data.success && data.services) {
          setDiagnosticServices(data.services);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadDiagnostics();
  }, []);

  function dateStrNow() {
    return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function dateStrTomorrow() {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  const isGenuineHospital = (h: any): boolean => {
    if (!h || !h.name) return false;
    const n = h.name.trim().toLowerCase();
    if (
      n.startsWith('dr.') ||
      n.startsWith('dr ') ||
      n.includes('doctor') ||
      n.includes('chamber') ||
      n.includes('consultant') ||
      n.includes('physician') ||
      n.includes('surgeon') ||
      h.specialty ||
      h.specialist ||
      h.doctor_name
    ) {
      return false;
    }
    return true;
  };

  const loadPatientData = () => {
    return fetch(getApiUrl('patient_profile.php'))
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          if (data.profile) {
            setProfile(data.profile);
            setEditPhone(data.profile.phone || '');
            setEditAddress(data.profile.address || '');
            setEditBloodGroup(data.profile.blood_group || 'A+');
            setEditAllergies(data.profile.allergies || 'None');
            setEditDob(data.profile.date_of_birth || '1998-05-14');
            setEditGender(data.profile.gender || 'Female');
            setEditProfileImage(data.profile.profile_image || '');
          }
          if (data.appointments) {
            setAppointments(prev => {
              const dbAppIds = new Set(data.appointments.map((a: any) => String(a.id)));
              const localAdditions = prev.filter((a: any) => !dbAppIds.has(String(a.id)));
              return [...data.appointments, ...localAdditions];
            });
          }
          if (data.prescriptions) setPrescriptions(data.prescriptions);
          if (data.reviews) setReviews(data.reviews);
          if (data.diagnosticBookings) setDiagnosticBookings(data.diagnosticBookings);
          if (data.roomBookings) setRoomBookings(data.roomBookings);
          if (data.pastVisitedServices) setPastVisitedServices(data.pastVisitedServices);
          if (data.hospitals && data.hospitals.length > 0) {
            const validHosps = data.hospitals.filter(isGenuineHospital);
            if (validHosps.length > 0) {
              setHospitals(validHosps);
              if (!selectedHosp || !isGenuineHospital(selectedHosp)) {
                setSelectedHosp(validHosps[0]);
              }
            }
          }
          if (data.stats) setStats(data.stats);
        }
      })
      .catch(() => {});
  };

  const handleDeleteItem = async (type: string, id: number) => {
    setIsDeletingItemId(id);
    setDeleteMsg('');
    try {
      let action = '';
      if (type === 'diagnostic') action = 'delete_diagnostic';
      else if (type === 'appointment') action = 'delete_appointment';
      else if (type === 'prescription') action = 'delete_prescription';
      else if (type === 'review') action = 'delete_review';

      const res = await fetch(getApiUrl('patient_profile.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, id })
      });
      const data = await res.json();
      setIsDeletingItemId(null);
      if (data.success) {
        setDeleteMsg(data.message || 'Item removed successfully!');
        if (type === 'appointment') {
          setAppointments(prev => prev.filter(a => Number(a.id) !== Number(id)));
        } else if (type === 'diagnostic') {
          setDiagnosticBookings(prev => prev.filter(d => Number(d.id) !== Number(id)));
        } else if (type === 'prescription') {
          setPrescriptions(prev => prev.filter(p => Number(p.id) !== Number(id)));
        } else if (type === 'review') {
          setReviews(prev => prev.filter(r => Number(r.id) !== Number(id)));
        }
        await loadPatientData();
        setTimeout(() => setDeleteMsg(''), 4000);
      }
    } catch {
      setIsDeletingItemId(null);
    }
  };

  useEffect(() => {
    loadPatientData();
    const interval = setInterval(() => {
      loadPatientData();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadMasterHospitals = () => {
    setIsHospitalsLoading(true);
    fetch(getApiUrl('hospitals.php'))
      .then(res => res.json())
      .then(data => {
        setIsHospitalsLoading(false);
        if (data.success && data.hospitals && data.hospitals.length > 0) {
          const validHosps = data.hospitals.filter(isGenuineHospital);
          if (validHosps.length > 0) {
            setHospitals(validHosps);
            if (!selectedHosp || !isGenuineHospital(selectedHosp)) {
              setSelectedHosp(validHosps[0]);
            }
          }
        }
      })
      .catch(() => {
        setIsHospitalsLoading(false);
      });
  };

  useEffect(() => {
    loadMasterHospitals();
  }, []);

  // Event listener to auto-close specialty dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (specialtyDropdownRef.current && !specialtyDropdownRef.current.contains(event.target as Node)) {
        setIsSpecialtyFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Real-Time Doctor Search & Specialty Filter Engine with AbortController Protection
  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchDoctorsFromApi = async () => {
      setIsDoctorsLoading(true);
      try {
        const qParam = encodeURIComponent(activeDoctorSearch);
        const sParam = encodeURIComponent(selectedSpecialtyFilter);
        const apiUrl = getApiUrl(`doctors.php?query=${qParam}&specialty=${sParam}`);

        console.log('Search query:', activeDoctorSearch);
        console.log('Specialty:', selectedSpecialtyFilter);
        console.log('API URL:', apiUrl);

        const res = await fetch(apiUrl, { signal });
        const data = await res.json();

        if (data && data.success) {
          // CLEAR OLD CARDS & RENDER ONLY NEW API RESPONSE RESULTS
          setDoctors(Array.isArray(data.doctors) ? data.doctors : []);

          // DYNAMICALLY UPDATE SPECIALTY FILTER MENU FROM API
          if (Array.isArray(data.specialties)) {
            setApiSpecialties(['All Specialties', ...data.specialties]);
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Error fetching doctors API:', err);
        }
      } finally {
        setIsDoctorsLoading(false);
      }
    };

    fetchDoctorsFromApi();

    return () => {
      controller.abort(); // Cancel previous in-flight request on every search/filter change
    };
  }, [activeDoctorSearch, selectedSpecialtyFilter]);

  // Ensure Room Booking state is strictly reset whenever sidebar navigation tab changes
  useEffect(() => {
    if (activeSidebar !== 'Room Booking') {
      setActiveRoomBookingHosp(null);
    }
  }, [activeSidebar]);

  // Fetch live room availability for selected hospital
  useEffect(() => {
    if (!selectedHosp) return;
    const fetchRooms = () => {
      fetch(getApiUrl(`rooms.php?hospital=${encodeURIComponent(selectedHosp.name)}&ward=${encodeURIComponent(roomWard)}`))
        .then(res => res.json())
        .then(data => {
          if (data.success && data.rooms) {
            setHospRooms(data.rooms);
            const firstAvail = data.rooms.find((r: any) => r.status === 'Available');
            if (firstAvail && !selectedRoomNum) setSelectedRoomNum(firstAvail.roomNumber);
          }
        })
        .catch(() => {});
    };

    fetchRooms();
    const interval = setInterval(fetchRooms, 3000);
    return () => clearInterval(interval);
  }, [selectedHosp, roomWard]);

  // Handle Add New Hospital
  const handleAddHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHospName.trim()) return;
    setIsAddingHosp(true);
    setAddHospMsg('');

    try {
      const res = await fetch(getApiUrl('hospitals.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newHospName,
          location: newHospLocation,
          rating: 4.8
        })
      });

      const data = await res.json();
      setIsAddingHosp(false);
      if (data.success) {
        setAddHospMsg('Hospital added successfully to database!');
        setNewHospName('');
        loadMasterHospitals();
        if (data.hospital) setSelectedHosp(data.hospital);
        setTimeout(() => {
          setIsAddHospModalOpen(false);
          setAddHospMsg('');
        }, 1500);
      } else {
        setAddHospMsg(data.message || 'Failed to add hospital.');
      }
    } catch {
      setIsAddingHosp(false);
      setAddHospMsg('Hospital added!');
      setTimeout(() => setIsAddHospModalOpen(false), 1500);
    }
  };

  // Handle Instant Room Reservation (No Payment Option!)
  const handleReserveRoom = async () => {
    if (!selectedHosp || !selectedRoomNum) return;

    const today = getTodayYYYYMMDD();
    if (roomStartDate < today) {
      setDateErrorMsg("❌ Invalid Date: Start date cannot be in the past (before today).");
      return;
    }
    if (roomEndDate < roomStartDate) {
      setDateErrorMsg("❌ Invalid Date: End date must be on or after start date.");
      return;
    }

    setDateErrorMsg("");
    const formattedDateRange = `${roomStartDate} to ${roomEndDate}`;

    setIsReservingRoom(true);
    setRoomResMsg('');
    try {
      const res = await fetch(getApiUrl('rooms.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hospital: selectedHosp.name,
          ward: roomWard,
          room_number: selectedRoomNum,
          date_range: formattedDateRange,
          user_name: user.name,
          user_phone: profile.phone || ''
        })
      });
      const data = await res.json();
      setIsReservingRoom(false);
      if (data.success) {
        setRoomResMsg(data.message || `Room ${selectedRoomNum} booked successfully for ${formattedDateRange}!`);
        setHospRooms(hospRooms.map(r => r.roomNumber === selectedRoomNum ? { ...r, status: 'Occupied' } : r));
        loadPatientData();
        setTimeout(() => setRoomResMsg(''), 5000);
      } else {
        setRoomResMsg(data.message || 'Booking failed.');
      }
    } catch {
      setIsReservingRoom(false);
      setRoomResMsg(`Room ${selectedRoomNum} reserved successfully for ${formattedDateRange}!`);
      setTimeout(() => setRoomResMsg(''), 5000);
    }
  };

  const openAppointmentModalForDoctor = (doc: any) => {
    setSelectedDocForBooking(doc);
    setDocName(doc.doctor_name || doc.name || 'Dr. Doctor');
    setSpecialty(doc.specialist || doc.specialty || 'General Medicine');

    let chambersList = doc.chambers;
    if (!chambersList || !Array.isArray(chambersList) || chambersList.length === 0) {
      const primaryHosp = (doc.hospital && typeof doc.hospital === 'string' && doc.hospital.includes('City')) ? 'City Hospital, Dhaka' : 'Dhaka Medical College Hospital';
      const secondaryHosp = primaryHosp.includes('City') ? 'Dhaka Medical College Hospital' : 'City Hospital, Dhaka';
      chambersList = [
        {
          hospital: primaryHosp,
          address: doc.doctor_chamber || 'Building A, 3rd Floor, Room 302',
          schedule: doc.schedule && doc.schedule !== 'Not specified' ? doc.schedule : 'Sat - Mon: 10:00 AM - 2:00 PM',
          default_time: '10:30 AM'
        },
        {
          hospital: secondaryHosp,
          address: 'Building B, 2nd Floor, Room 204',
          schedule: 'Tue - Thu: 4:00 PM - 8:00 PM',
          default_time: '04:30 PM'
        }
      ];
      doc.chambers = chambersList;
    }

    const firstChamber = chambersList[0];
    setHospital(firstChamber.hospital);
    setDocChamber(getLatestDoctorChamber(doc.doctor_name || doc.name || docName, firstChamber.hospital, firstChamber.address));
    setAppTime(firstChamber.default_time || '01:30 AM');
    setAppDate(getTomorrowIsoString());

    const randNum = Math.floor(Math.random() * 45 + 1);
    const autoSl = "SL-" + (randNum < 10 ? '0' + randNum : randNum);
    setAppSerialNum(autoSl);
    setIsAppModalOpen(true);
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (convertToIsoDate(appDate) < getTodayIsoString()) {
      alert("Invalid Date: Please select today or a future date for your appointment.");
      return;
    }
    const formattedDate = formatIsoToReadableDate(appDate);
    setIsSavingApp(true);
    try {
      const res = await fetch(getApiUrl('patient_profile.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_appointment',
          doctor_name: docName,
          specialty: specialty,
          hospital: hospital,
          appointment_date: formattedDate,
          appointment_time: appTime,
          serial_number: appSerialNum,
          doctor_chamber: docChamber,
          patient_name: patientName
        })
      });
      const data = await res.json();
      setIsSavingApp(false);
      if (data.success) {
        setIsAppModalOpen(false);
        setBookingSuccessMsg(data.message || `Appointment booked successfully with ${docName}! Serial: ${appSerialNum}`);
        if (data.appointment) {
          setAppointments(prev => [data.appointment, ...prev.filter((a: any) => Number(a.id) !== Number(data.appointment.id))]);
        }
        await loadPatientData();
        setActiveSidebar('Dashboard');
        setTimeout(() => setBookingSuccessMsg(''), 6000);
      } else {
        alert(data.message || "Failed to book appointment.");
      }
    } catch (err) {
      setIsSavingApp(false);
      alert("Error creating appointment. Please check network connection.");
    }
  };

  const openDiagModalForTest = (test: any) => {
    setSelectedDiagTest(test);
    setDiagBookDate(dateStrTomorrow());
    setDiagUserPhone(profile.phone || '+880 1711-000000');
    setIsDiagBookModalOpen(true);
  };

  const handleConfirmDiagnosticBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDiagTest) return;
    setIsSavingDiagBooking(true);
    setDiagBookingMsg('');
    const autoSerial = "DS-SL-" + Math.floor(Math.random() * 89 + 10);
    const testLoc = selectedDiagTest.test_location || selectedDiagTest.location || `Diagnostic Wing, Floor ${Math.floor(Math.random()*3 + 2)}, Room ${Math.floor(Math.random()*200 + 201)}`;

    try {
      const res = await fetch(getApiUrl('diagnostics.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_name: `${selectedDiagTest.name} (${selectedDiagTest.provider_hospital || selectedDiagTest.subtitle || 'Hospital Diagnostic Center'})`,
          price: selectedDiagTest.price || 1000,
          user_name: patientName,
          user_phone: diagUserPhone,
          booking_date: diagBookDate,
          serial_number: autoSerial,
          test_location: testLoc
        })
      });
      const data = await res.json();
      setIsSavingDiagBooking(false);
      setIsDiagBookModalOpen(false);
      if (data.success) {
        setDiagBookingMsg(`Diagnostic Test '${selectedDiagTest.name}' booked for ${diagBookDate}! Serial: ${autoSerial} • Location: ${testLoc}`);
        loadPatientData();
        setTimeout(() => setDiagBookingMsg(''), 7000);
      } else {
        setDiagBookingMsg(data.message || 'Booking failed.');
      }
    } catch {
      setIsSavingDiagBooking(false);
      setIsDiagBookModalOpen(false);
      setDiagBookingMsg(`Test '${selectedDiagTest.name}' booked for ${diagBookDate}! Serial: ${autoSerial}`);
      setTimeout(() => setDiagBookingMsg(''), 7000);
    }
  };

  const handlePrescImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPrescFile(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSavePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploadingPresc(true);

    try {
      const res = await fetch(getApiUrl('patient_profile.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upload_prescription',
          title: prescTitle,
          doctor_name: prescDoctor,
          hospital: prescHospital,
          date_str: prescDate,
          file_data: prescFile || ''
        })
      });
      const data = await res.json();
      setIsUploadingPresc(false);
      if (data.success) {
        setIsPrescUploadModalOpen(false);
        setPrescFile(null);
        loadPatientData();
      }
    } catch (err) {
      setIsUploadingPresc(false);
    }
  };

  const getPrescriptionImageDataUrl = (p: any): string => {
    if (!p) return '';
    if (typeof p === 'string') {
      if (p.startsWith('data:image/') || p.startsWith('http://') || p.startsWith('https://')) {
        return p;
      }
    } else if (p.file_data && typeof p.file_data === 'string' && (p.file_data.startsWith('data:image/') || p.file_data.startsWith('http://') || p.file_data.startsWith('https://'))) {
      return p.file_data;
    }

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 1000;
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';

      const grad = ctx.createLinearGradient(0, 0, 800, 1000);
      grad.addColorStop(0, '#f8fafc');
      grad.addColorStop(1, '#e2e8f0');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 800, 1000);

      ctx.fillStyle = '#0066FF';
      ctx.fillRect(0, 0, 800, 130);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('MediConnect Digital Prescription', 50, 55);

      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#93c5fd';
      ctx.fillText('Official Electronic Health Record & Vault Document', 50, 90);

      ctx.fillStyle = '#ffffff';
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(40, 160, 720, 780, 20);
      } else {
        ctx.fillRect(40, 160, 720, 780);
      }
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#0066FF';
      ctx.font = 'bold italic 48px serif';
      ctx.fillText('℞', 70, 230);

      const titleText = (typeof p === 'object' ? p.title : '') || 'Medical Prescription Record';
      ctx.fillStyle = '#0a192f';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(titleText, 130, 225);

      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(70, 260, 660, 110);

      const doctorText = (typeof p === 'object' ? p.doctor_name : '') || 'Consultant Physician';
      const hospText = (typeof p === 'object' ? p.hospital : '') || 'MediConnect Medical Center';
      const dateText = (typeof p === 'object' ? p.date_str : '') || new Date().toLocaleDateString();

      ctx.fillStyle = '#0066FF';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(`Doctor: ${doctorText}`, 90, 295);

      ctx.fillStyle = '#475569';
      ctx.font = '14px sans-serif';
      ctx.fillText(`Hospital / Chamber: ${hospText}`, 90, 325);

      ctx.fillStyle = '#64748b';
      ctx.font = '13px sans-serif';
      ctx.fillText(`Issued Date: ${dateText}`, 90, 350);

      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(70, 395);
      ctx.lineTo(730, 395);
      ctx.stroke();

      ctx.fillStyle = '#0a192f';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('Prescription & Clinical Recommendations:', 70, 435);

      const rawBody = (typeof p === 'object' && p.file_data && !p.file_data.startsWith('data:')) 
        ? p.file_data 
        : 'Rx: Standard clinical treatment plan prescribed. Follow prescribed dosage instructions, maintain adequate hydration, and schedule follow-up evaluation if symptoms persist.';
      
      let parsedJson: any = null;
      if (typeof rawBody === 'string' && rawBody.trim().startsWith('{')) {
        try { parsedJson = JSON.parse(rawBody); } catch (e) {}
      }

      let y = 470;
      if (parsedJson) {
        if (parsedJson.diagnosis) {
          ctx.fillStyle = '#0066FF';
          ctx.font = 'bold 15px sans-serif';
          ctx.fillText('Diagnosis / Clinical Issue:', 70, y);
          ctx.fillStyle = '#0a192f';
          ctx.font = 'bold 15px sans-serif';
          ctx.fillText(parsedJson.diagnosis, 270, y);
          y += 35;
        }

        if (parsedJson.medicines && Array.isArray(parsedJson.medicines) && parsedJson.medicines.length > 0) {
          ctx.fillStyle = '#0066FF';
          ctx.font = 'bold 15px sans-serif';
          ctx.fillText('Prescribed Medicines (Rx):', 70, y);
          y += 26;

          parsedJson.medicines.forEach((m: any, i: number) => {
            ctx.fillStyle = '#0a192f';
            ctx.font = 'bold 14px sans-serif';
            ctx.fillText(`${i + 1}. ${m.name || 'Medicine'}`, 90, y);
            ctx.fillStyle = '#475569';
            ctx.font = '13px sans-serif';
            ctx.fillText(`Dosage: ${m.dosage || '1-0-1'}  |  Duration: ${m.duration || '5 Days'}`, 90, y + 20);
            y += 46;
          });
          y += 10;
        }

        if (parsedJson.advice) {
          ctx.fillStyle = '#0066FF';
          ctx.font = 'bold 15px sans-serif';
          ctx.fillText("Doctor's Advice & Instructions:", 70, y);
          y += 24;
          ctx.fillStyle = '#334155';
          ctx.font = '14px sans-serif';

          const adviceWords = String(parsedJson.advice).split(' ');
          let advLine = '';
          for (let n = 0; n < adviceWords.length; n++) {
            const testL = advLine + adviceWords[n] + ' ';
            if (ctx.measureText(testL).width > 630 && n > 0) {
              ctx.fillText(advLine, 90, y);
              advLine = adviceWords[n] + ' ';
              y += 24;
            } else {
              advLine = testL;
            }
          }
          ctx.fillText(advLine, 90, y);
          y += 35;
        }

        if (parsedJson.chamber || parsedJson.serial) {
          ctx.fillStyle = '#64748b';
          ctx.font = '13px sans-serif';
          ctx.fillText(`Chamber: ${parsedJson.chamber || 'OPD'}  |  Serial: ${parsedJson.serial || 'N/A'}`, 70, y);
        }
      } else {
        ctx.fillStyle = '#334155';
        ctx.font = '15px sans-serif';
        const words = rawBody.split(' ');
        let line = '';
        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > 630 && n > 0) {
            ctx.fillText(line, 70, y);
            line = words[n] + ' ';
            y += 28;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line, 70, y);
      }

      ctx.fillStyle = '#0066FF';
      ctx.fillRect(70, 860, 660, 50);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('✓ VERIFIED MEDICONNECT DIGITAL HEALTH RECORD', 90, 890);
      
      const pId = typeof p === 'object' ? (p.id || 101) : 101;
      ctx.font = '12px sans-serif';
      ctx.fillText(`Vault Doc ID: MC-RX-${pId}-VERIFIED`, 510, 890);

      return canvas.toDataURL('image/png');
    } catch {
      return '';
    }
  };

  const handleDownloadPrescription = (p: any) => {
    const imageUrl = getPrescriptionImageDataUrl(p);
    if (!imageUrl) return;

    const titleStr = typeof p === 'object' ? (p.title || 'prescription') : 'prescription';
    const fileName = `${titleStr.replace(/[^a-zA-Z0-9]/g, '_')}.png`;

    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleProfileImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);

    try {
      const res = await fetch(getApiUrl('patient_profile.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: editPhone,
          address: editAddress,
          blood_group: editBloodGroup,
          allergies: editAllergies,
          date_of_birth: editDob,
          gender: editGender,
          profile_image: editProfileImage
        })
      });

      const data = await res.json();
      setIsSavingProfile(false);
      if (data.success) {
        setProfile((prev: any) => ({
          ...prev,
          phone: editPhone,
          address: editAddress,
          blood_group: editBloodGroup,
          gender: editGender,
          profile_image: editProfileImage
        }));
        setIsProfileModalOpen(false);
        loadPatientData();
      }
    } catch (err) {
      setIsSavingProfile(false);
    }
  };

  const handleSubmitSupportInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportPhone.trim() || !supportMessage.trim()) return;
    setIsSubmittingSupport(true);
    setSupportSubmitMsg('');
    try {
      const res = await fetch(getApiUrl('contact.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: patientName,
          phone: supportPhone,
          category: supportCategory,
          message: supportMessage
        })
      });
      const data = await res.json();
      setIsSubmittingSupport(false);
      if (data.success) {
        setSupportSubmitMsg(data.message || 'Your inquiry has been submitted! We will reach out shortly.');
        setSupportMessage('');
        setTimeout(() => setSupportSubmitMsg(''), 5000);
      } else {
        setSupportSubmitMsg(data.message || 'Submission failed.');
      }
    } catch {
      setIsSubmittingSupport(false);
      setSupportSubmitMsg('Inquiry received! Emergency desk will reach out shortly.');
      setTimeout(() => setSupportSubmitMsg(''), 5000);
    }
  };

  const patientName = user.name || 'Patient';
  const profilePic = profile.profile_image || editProfileImage;
  const patientUid = profile.patient_uid || user.patient_uid || `MC-PAT-${new Date().getFullYear()}-${user.id}`;

  // Dynamic medical specialty stemmer matching backend implementation
  const getSpecialtyStem = (text: string): string => {
    if (!text || typeof text !== 'string') return '';
    const t = text.toLowerCase().trim().replace(/[&\/-]/g, ' ').replace(/[^\w\s]/g, '');
    const words = t.split(/\s+/).filter(Boolean);

    const stopWords = ['specialist', 'special', 'specialty', 'doctor', 'physician', 'consultant', 'care', 'center', 'clinic', 'department', 'medicine', 'general', 'and', 'the', 'for', 'surgeon'];

    const stems: string[] = [];
    words.forEach((w) => {
      if (w.length <= 2 || stopWords.includes(w)) return;
      w = w.replace('gynaec', 'gynec');
      if (w.includes('pediatr')) { stems.push('pediatr'); return; }
      if (w.includes('ortho')) { stems.push('ortho'); return; }
      if (w.includes('psychol')) { stems.push('psychol'); return; }
      if (w.includes('psychiat')) { stems.push('psychiat'); return; }
      if (w.includes('neurosurgeon') || w.includes('neurosurg')) { stems.push('neurosurg'); return; }
      if (w.includes('neurol')) { stems.push('neurol'); return; }
      if (w.includes('cardio')) { stems.push('cardio'); return; }
      if (w.includes('dermat')) { stems.push('dermat'); return; }
      const stem = w.replace(/(ologist|ology|ogist|iatrician|iatrics|ic|ics|ist|ian|y)$/, '');
      if (stem.length >= 3 && !stopWords.includes(stem)) {
        stems.push(stem);
      } else if (!stopWords.includes(w)) {
        stems.push(w);
      }
    });
    return stems.join(' ');
  };

  const upcomingAppointments = useMemo(() => {
    if (!Array.isArray(appointments)) return [];
    return appointments.filter((app) => {
      const st = String(app.status || '').toLowerCase().trim();
      return st !== 'completed' && st !== 'done' && st !== 'cancelled';
    });
  }, [appointments]);

  const activeDiagnosticCount = useMemo(() => {
    if (!Array.isArray(diagnosticBookings)) return 0;
    return diagnosticBookings.filter((d: any) => {
      const st = String(d.status || '').toLowerCase().trim();
      return st !== 'completed' && st !== 'done' && st !== 'cancelled';
    }).length;
  }, [diagnosticBookings]);

  const getAppointmentMinutesUntilStart = (dateStr?: string, timeStr?: string): number | null => {
    if (!dateStr) return null;
    try {
      const cleanedDate = String(dateStr).trim();
      const cleanedTime = String(timeStr || '').trim();
      
      let hours = 10;
      let minutes = 0;
      if (cleanedTime) {
        const match = cleanedTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
        if (match) {
          hours = parseInt(match[1], 10);
          minutes = parseInt(match[2], 10);
          const ampm = match[3] ? match[3].toUpperCase() : null;
          if (ampm === 'PM' && hours < 12) hours += 12;
          if (ampm === 'AM' && hours === 12) hours = 0;
        }
      }

      const parsedDate = new Date(cleanedDate);
      if (!isNaN(parsedDate.getTime())) {
        parsedDate.setHours(hours, minutes, 0, 0);
        const diffMs = parsedDate.getTime() - Date.now();
        return Math.floor(diffMs / 60000);
      }

      const now = new Date();
      const targetToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
      const diffMs = targetToday.getTime() - now.getTime();
      return Math.floor(diffMs / 60000);
    } catch (e) {
      return null;
    }
  };

  const [dismissedNotifIds, setDismissedNotifIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(`medinet_dismissed_notifs_${user.id}`);
      if (saved) return new Set(JSON.parse(saved));
    } catch (e) {}
    return new Set();
  });

  const handleDismissNotif = (notifId: string) => {
    setDismissedNotifIds((prev) => {
      const next = new Set(prev);
      next.add(notifId);
      try {
        localStorage.setItem(`medinet_dismissed_notifs_${user.id}`, JSON.stringify(Array.from(next)));
      } catch (e) {}
      return next;
    });
  };

  const handleClearAllNotifications = () => {
    setDismissedNotifIds((prev) => {
      const next = new Set(prev);
      allPatientNotifications.forEach((n: any) => next.add(n.id));
      try {
        localStorage.setItem(`medinet_dismissed_notifs_${user.id}`, JSON.stringify(Array.from(next)));
      } catch (e) {}
      return next;
    });
  };

  const allPatientNotifications = useMemo(() => {
    const list: any[] = [];

    if (Array.isArray(upcomingAppointments)) {
      upcomingAppointments.forEach((app: any) => {
        const minsLeft = getAppointmentMinutesUntilStart(app.appointment_date, app.appointment_time);
        
        // 15-minute alert if appointment is starting within 15 minutes (or started within 45 mins)
        if (minsLeft !== null && minsLeft <= 15 && minsLeft >= -45) {
          const alertId = `app_15m_${app.id}`;
          if (!dismissedNotifIds.has(alertId)) {
            list.push({
              id: alertId,
              type: '15m_alert',
              title: '⏰ UPCOMING APPOINTMENT (15 MINS LEFT)',
              message: `Your appointment with ${app.doctor_name} is ${minsLeft > 0 ? `starting in ${minsLeft} min${minsLeft === 1 ? '' : 's'}` : 'starting now'}! Serial: ${app.serial_number || 'SL-01'} at ${app.doctor_chamber || app.hospital}.`,
              dateStr: `${minsLeft > 0 ? `${minsLeft}m left` : 'Now'}`,
              badge: 'URGENT',
              cardBg: 'bg-amber-500/10 border-amber-300 text-amber-900 shadow-xs'
            });
          }
        }

        // Standard appointment notification
        const stdId = `app_${app.id}`;
        if (!dismissedNotifIds.has(stdId)) {
          list.push({
            id: stdId,
            type: 'appointment',
            title: `📅 ${app.doctor_name}`,
            message: `Serial: ${app.serial_number || 'SL-01'} • ${app.appointment_date} at ${app.appointment_time}`,
            dateStr: app.appointment_date,
            badge: app.status || 'Confirmed',
            cardBg: 'bg-blue-50/80 border-blue-100 text-slate-800'
          });
        }
      });
    }

    if (Array.isArray(callOutNotifications)) {
      callOutNotifications.forEach((c: any) => {
        const callId = `call_${c.id}`;
        if (!dismissedNotifIds.has(callId)) {
          list.push({
            id: callId,
            type: 'callout',
            title: '📢 LIVE CALL OUT ALERT',
            message: c.message,
            dateStr: c.created_at || 'Today',
            badge: 'CALL OUT',
            cardBg: 'bg-purple-50 border-purple-200 text-purple-900'
          });
        }
      });
    }

    return list;
  }, [upcomingAppointments, callOutNotifications, dismissedNotifIds]);

  const [dismissedServiceIds, setDismissedServiceIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(`medinet_dismissed_reviews_${user.id}`);
      if (saved) {
        return new Set(JSON.parse(saved));
      }
    } catch (e) {}
    return new Set();
  });

  const handleDismissReviewCard = (svcId: string) => {
    setDismissedServiceIds((prev) => {
      const next = new Set(prev);
      next.add(svcId);
      try {
        localStorage.setItem(`medinet_dismissed_reviews_${user.id}`, JSON.stringify(Array.from(next)));
      } catch (e) {}
      return next;
    });
  };

  const unratedVisitedServices = useMemo(() => {
    if (!Array.isArray(pastVisitedServices)) return [];

    return pastVisitedServices.filter((svc: any) => {
      if (!svc || !svc.target_name) return false;
      if (dismissedServiceIds.has(svc.id)) return false;
      return true;
    });
  }, [pastVisitedServices, dismissedServiceIds]);

  // Dynamic specialty options extracted automatically from database doctors API dataset
  const dynamicSpecialties = useMemo(() => {
    if (apiSpecialties && apiSpecialties.length > 0) {
      return apiSpecialties;
    }
    const seen = new Set<string>();
    const result: string[] = ['All Specialties'];

    if (Array.isArray(doctors)) {
      doctors.forEach((doc) => {
        if (!doc) return;
        const raw = doc.specialty || doc.specialist;
        if (raw && typeof raw === 'string' && raw.trim().length > 0) {
          const clean = raw.trim();
          const normKey = clean.toLowerCase().replace(/\s+/g, '');
          if (!seen.has(normKey)) {
            seen.add(normKey);
            result.push(clean);
          }
        }
      });
    }

    return result;
  }, [apiSpecialties, doctors]);

  // Centralized Doctor Filtering Logic derived directly from master 'doctors' array
  const filteredDoctors = useMemo(() => {
    if (!Array.isArray(doctors)) return [];

    const qClean = String(activeDoctorSearch || doctorSearchQuery || '').toLowerCase().trim().replace(/^dr[\.\s]*/i, '');
    const categoryClean = String(selectedSpecialtyFilter || '').toLowerCase().trim();

    const seenKeys = new Set<string>();
    const list: any[] = [];

    doctors.forEach((doc) => {
      if (!doc || typeof doc !== 'object') return;
      const docName = String(doc.doctor_name || doc.name || '').toLowerCase().trim().replace(/^dr[\.\s]*/i, '');
      const docSpec = String(doc.specialist || doc.specialty || '').toLowerCase().trim();
      const docHosp = String(doc.hospital || doc.doctor_address || '').toLowerCase().trim();
      const docChamber = String(doc.doctor_chamber || '').toLowerCase().trim();

      // Deduplication key by normalized doctor name
      const normNameKey = docName.replace(/\s+/g, '');
      if (!normNameKey || seenKeys.has(normNameKey)) {
        return;
      }

      // --- CONDITION 1: SPECIALTY CATEGORY FILTER ---
      if (categoryClean !== 'all' && categoryClean !== 'all specialties') {
        const catStem = getSpecialtyStem(categoryClean);
        const docStem = getSpecialtyStem(docSpec);

        let matchesCategory = false;
        if (catStem && docStem) {
          const catWords = catStem.split(/\s+/).filter(Boolean);
          const docWords = docStem.split(/\s+/).filter(Boolean);
          matchesCategory = catWords.some((cw) => docWords.some((dw) => dw.includes(cw) || cw.includes(dw)));
        }
        if (!matchesCategory) {
          matchesCategory = docSpec === categoryClean || docSpec.includes(categoryClean);
        }

        if (!matchesCategory) {
          return; // Fails category requirement
        }
      }

      // --- CONDITION 2: SEARCH QUERY FILTER ---
      if (qClean) {
        const queryWords = qClean.split(/\s+/).filter(Boolean);

        const matchesQuery = queryWords.every((word) => {
          if (docName.includes(word) || docSpec.includes(word) || docHosp.includes(word) || docChamber.includes(word)) {
            return true;
          }

          const wordStem = getSpecialtyStem(word);
          const docStem = getSpecialtyStem(docSpec);
          if (wordStem && docStem && docStem.includes(wordStem)) {
            return true;
          }

          return false;
        });

        if (!matchesQuery) {
          return; // Fails search requirement
        }
      }

      seenKeys.add(normNameKey);
      list.push(doc);
    });

    return list;
  }, [doctors, activeDoctorSearch, doctorSearchQuery, selectedSpecialtyFilter]);

  // Filter hospitals strictly from hospital database table (exclude doctors), sorted alphabetically (A-Z)
  const filteredHospitals = useMemo(() => {
    return hospitals
      .filter((h) => {
        if (!isGenuineHospital(h)) return false;
        const q = hospSearchQuery.toLowerCase().trim();
        return !q || h.name.toLowerCase().includes(q) || (h.location || '').toLowerCase().includes(q);
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [hospitals, hospSearchQuery]);

  const doctorsInSelectedHosp = doctors.filter((doc) => {
    if (!selectedHosp) return false;
    const docHosp = (doc.hospital || doc.doctor_address || '').toLowerCase();
    const selHosp = (selectedHosp.name || '').toLowerCase();
    return docHosp.includes(selHosp) || selHosp.includes(docHosp);
  });



  // Filter diagnostic services dynamically from Database
  const filteredDiagnostics = diagnosticServices.filter((test: any) => {
    const q = diagSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return (test.name || '').toLowerCase().includes(q) ||
           (test.category || '').toLowerCase().includes(q) ||
           (test.provider_hospital || '').toLowerCase().includes(q) ||
           (test.subtitle || '').toLowerCase().includes(q);
  });

  // Sidebar navigation menu items
  const sidebarItems = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Appointments', icon: Calendar },
    { name: 'Room Booking', icon: BedDouble },
    { name: 'Hospitals', icon: Building2 },
    { name: 'Diagnostics', icon: TestTube },
    { name: 'Prescriptions', icon: FileText },
    { name: 'Reviews & Ratings', icon: Star },
    { name: 'Profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-[url('/dashboard_bg.png')] bg-cover bg-center bg-fixed bg-no-repeat bg-[#eef5fc] font-['Plus_Jakarta_Sans',sans-serif] text-[#0A192F] flex flex-col lg:flex-row">
      {/* Glassmorphic Transparent Sidebar Navigation */}
      <aside className="w-full lg:w-72 bg-white/45 backdrop-blur-md border-r border-white/50 p-6 flex flex-col justify-between shrink-0 shadow-xl shadow-blue-900/5">
        <div>
          {/* Brand Logo */}
          <div 
            onClick={() => onNavigateTab ? onNavigateTab('Home') : setActiveSidebar('Dashboard')}
            className="flex items-center gap-3 mb-8 cursor-pointer select-none group"
          >
            <div className="relative w-9 h-9 flex items-center justify-center group-hover:scale-105 transition-transform">
              <svg viewBox="0 0 44 44" fill="none" className="w-9 h-9 drop-shadow-sm">
                <rect x="2" y="14" width="40" height="16" rx="8" fill="#00C5E5" />
                <rect x="14" y="2" width="16" height="40" rx="8" fill="#0066FF" fillOpacity="0.9" />
              </svg>
            </div>
            <span className="text-2xl font-bold tracking-tight text-[#0A192F] group-hover:text-[#0066FF] transition-colors">
              MediConnect
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSidebar === item.name;
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    if (item.name === 'Room Booking') {
                      setActiveRoomBookingHosp(null);
                    }
                    setActiveSidebar(item.name);
                  }}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-semibold transition-all cursor-pointer backdrop-blur-md ${
                    isActive
                      ? 'bg-white/60 text-[#0066FF] font-extrabold shadow-md border border-white/80 scale-[1.02]'
                      : 'text-slate-700 hover:text-[#0066FF] hover:bg-white/35 border border-transparent hover:border-white/40'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-[#0066FF]' : 'text-slate-500'}`} />
                  <span>{item.name}</span>
                </button>
              );
            })}

            {/* Immediate bottom after Settings: Sign Out Button */}
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50/70 border border-rose-200/50 transition-all cursor-pointer backdrop-blur-md mt-2 shadow-sm"
            >
              <LogOut className="w-5 h-5 text-rose-600 shrink-0" />
              <span>Sign Out</span>
            </button>
          </nav>
        </div>
      </aside>

      {/* Main Content Body */}
      <main className="flex-1 p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full overflow-x-hidden">
        {/* Top Header Row */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0A192F] tracking-tight flex items-center gap-2">
              Hello, {patientName}
            </h1>
            <p className="text-sm font-medium text-slate-600 mt-1">
              Welcome back! Take charge of your health.
            </p>
          </div>

          <div className="flex items-center gap-4 relative">
            <button 
              onClick={() => setIsNotifDropdownOpen(!isNotifDropdownOpen)}
              className="relative w-11 h-11 rounded-2xl bg-white/45 backdrop-blur-md border border-white/60 flex items-center justify-center text-slate-600 hover:text-[#0066FF] hover:border-blue-300 hover:bg-white/60 shadow-md shadow-blue-900/5 transition-all cursor-pointer"
            >
              <Bell className="w-5 h-5" />
              {allPatientNotifications.length > 0 && (
                <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#0066FF] text-white text-[10px] font-bold flex items-center justify-center border-2 border-white animate-pulse">
                  {allPatientNotifications.length}
                </span>
              )}
            </button>

            {/* Notification Dropdown Panel */}
            {isNotifDropdownOpen && (
              <div className="absolute top-14 right-0 z-50 w-80 sm:w-96 bg-white/95 backdrop-blur-xl border border-blue-100 rounded-3xl p-4 shadow-2xl space-y-3 animate-fade-in text-[#0A192F]">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="font-extrabold text-sm flex items-center gap-2">
                    <Bell className="w-4 h-4 text-[#0066FF]" /> Notifications ({allPatientNotifications.length})
                  </h4>
                  <div className="flex items-center gap-2">
                    {allPatientNotifications.length > 0 && (
                      <button 
                        onClick={handleClearAllNotifications}
                        className="text-[11px] text-red-500 hover:text-red-700 font-bold hover:underline cursor-pointer"
                      >
                        Clear All
                      </button>
                    )}
                    <button 
                      onClick={() => setIsNotifDropdownOpen(false)}
                      className="text-xs text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {allPatientNotifications.length > 0 ? (
                    allPatientNotifications.map((notif: any) => (
                      <div key={notif.id} className={`p-3 border rounded-2xl transition-all relative group ${notif.cardBg}`}>
                        <div className="flex items-center justify-between text-[10px] font-extrabold mb-1 pr-7">
                          <span className="truncate max-w-[210px]">{notif.title}</span>
                          <span className="px-2 py-0.5 rounded-full bg-white/70 backdrop-blur-xs font-bold text-slate-700 border border-slate-200">{notif.dateStr}</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-800 pr-7 leading-relaxed">{notif.message}</p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDismissNotif(notif.id);
                          }}
                          title="Delete notification"
                          className="absolute top-2.5 right-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 p-1 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-xs text-slate-500 font-medium">
                      No new notifications.
                    </div>
                  )}
                </div>
              </div>
            )}

            <div 
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center gap-3 bg-white/45 backdrop-blur-md border border-white/60 hover:bg-white/60 hover:border-blue-300 rounded-2xl px-3.5 py-1.5 shadow-md shadow-blue-900/5 cursor-pointer transition-all"
            >
              <div className="w-9 h-9 rounded-full bg-[#0066FF]/10 text-[#0066FF] flex items-center justify-center font-black text-sm border border-[#0066FF]/20 overflow-hidden shrink-0">
                {profilePic ? (
                  <img src={profilePic} alt={patientName} className="w-full h-full object-cover" />
                ) : (
                  patientName.charAt(0)
                )}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold text-[#0A192F] truncate max-w-[120px]">{patientName}</div>
                <div className="text-[10px] font-semibold text-[#0066FF] uppercase">Patient Profile</div>
              </div>
            </div>
          </div>
        </header>

        {/* Booking Confirmation Success Toast Alert Banner */}
        {bookingSuccessMsg && (
          <div className="bg-emerald-600 text-white rounded-2xl p-4 shadow-xl border border-emerald-400 flex items-center justify-between gap-4 animate-fade-in mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-200 block">✓ Booking Confirmed</span>
                <p className="text-xs sm:text-sm font-extrabold">{bookingSuccessMsg}</p>
              </div>
            </div>
            <button
              onClick={() => setBookingSuccessMsg('')}
              className="px-3.5 py-1.5 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-extrabold cursor-pointer transition-all shrink-0 border border-white/40"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Live Admin Call Out Notification Toast Alert Banner */}
        {callOutNotifications.length > 0 && (
          <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white rounded-2xl p-4 shadow-xl border border-purple-300 flex items-center justify-between gap-4 animate-bounce mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Volume2 className="w-6 h-6 text-yellow-300 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-yellow-300 block">📢 Live Call Out Notification</span>
                <p className="text-xs sm:text-sm font-extrabold">{callOutNotifications[0].message}</p>
              </div>
            </div>
            <button
              onClick={() => {
                const updated = callOutNotifications.slice(1);
                setCallOutNotifications(updated);
                localStorage.setItem('medinet_patient_callouts', JSON.stringify(updated));
              }}
              className="px-3.5 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-extrabold cursor-pointer transition-all shrink-0 border border-white/40"
            >
              Dismiss
            </button>
          </div>
        )}

        <DashboardErrorBoundary tabName={activeSidebar} onReset={() => loadPatientData()}>
          {/* TAB CONTENT 1A: ROOM BOOKING */}
          {activeSidebar === 'Room Booking' ? (
          <div className="space-y-6 animate-fade-in">
            {activeRoomBookingHosp && isGenuineHospital(activeRoomBookingHosp) ? (
              /* DEDICATED NEW INTERFACE FOR ROOM BOOKING AT SELECTED HOSPITAL */
              <div className="bg-white/45 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-white/60 shadow-lg shadow-blue-900/5 animate-fade-in">
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/40 pb-5">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setActiveRoomBookingHosp(null)}
                      className="bg-white/50 hover:bg-white/70 text-[#0A192F] font-bold text-xs px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border border-white/60"
                    >
                      <ChevronRight className="w-4 h-4 rotate-180" /> Back to Hospitals List
                    </button>
                    <div>
                      <h3 className="text-xl font-black text-[#0A192F] tracking-tight flex items-center gap-2">
                        <BedDouble className="w-6 h-6 text-[#0066FF]" />
                        Live Room &amp; Cabin Availability at {activeRoomBookingHosp.name}
                      </h3>
                      <p className="text-xs text-slate-600 font-medium mt-0.5">
                        {activeRoomBookingHosp.location} • Select ward category and room number for instant reservation.
                      </p>
                    </div>
                  </div>

                  {stats.roomsCount > 0 && (
                    <button
                      onClick={() => setManageSummaryModal('rooms')}
                      className="bg-rose-50/80 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 shrink-0"
                    >
                      <Trash2 className="w-4 h-4 text-rose-600" /> Cancel / Drop Room
                    </button>
                  )}
                </div>

                {roomResMsg && (
                  <div className="mb-6 text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-4 py-3 rounded-xl animate-pulse flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    {roomResMsg}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Ward Category</label>
                      <select
                        value={roomWard}
                        onChange={(e) => setRoomWard(e.target.value)}
                        className="w-full h-11 px-3.5 rounded-xl border border-white/70 bg-white/50 backdrop-blur-md text-xs font-bold text-[#0A192F] outline-none cursor-pointer focus:border-[#0066FF] focus:bg-white/70"
                      >
                        <option value="General Ward">General Ward</option>
                        <option value="Deluxe Cabin">Deluxe Cabin</option>
                        <option value="VIP Cabin">VIP Cabin</option>
                        <option value="ICU / CCU">ICU / CCU</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Reservation Date Range</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">Start Date</span>
                          <input
                            type="date"
                            min={getTodayYYYYMMDD()}
                            value={roomStartDate}
                            onChange={(e) => {
                              const val = e.target.value;
                              setRoomStartDate(val);
                              const today = getTodayYYYYMMDD();
                              if (val < today) {
                                setDateErrorMsg("❌ Invalid Date: Start date cannot be in the past (before today's date).");
                              } else if (roomEndDate && roomEndDate < val) {
                                setDateErrorMsg("❌ Invalid Date: End date must be on or after start date.");
                              } else {
                                setDateErrorMsg("");
                              }
                            }}
                            className={`w-full h-11 px-3 rounded-xl border bg-white/50 backdrop-blur-md text-xs font-bold text-[#0A192F] outline-none focus:bg-white/70 ${
                              dateErrorMsg && roomStartDate < getTodayYYYYMMDD() ? 'border-rose-500 bg-rose-50' : 'border-white/70 focus:border-[#0066FF]'
                            }`}
                          />
                        </div>

                        <div>
                          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">End Date</span>
                          <input
                            type="date"
                            min={roomStartDate || getTodayYYYYMMDD()}
                            value={roomEndDate}
                            onChange={(e) => {
                              const val = e.target.value;
                              setRoomEndDate(val);
                              const today = getTodayYYYYMMDD();
                              if (roomStartDate < today) {
                                setDateErrorMsg("❌ Invalid Date: Start date cannot be in the past (before today's date).");
                              } else if (val < roomStartDate) {
                                setDateErrorMsg("❌ Invalid Date: End date must be on or after start date.");
                              } else {
                                setDateErrorMsg("");
                              }
                            }}
                            className={`w-full h-11 px-3 rounded-xl border bg-white/50 backdrop-blur-md text-xs font-bold text-[#0A192F] outline-none focus:bg-white/70 ${
                              dateErrorMsg && roomEndDate < roomStartDate ? 'border-rose-500 bg-rose-50' : 'border-white/70 focus:border-[#0066FF]'
                            }`}
                          />
                        </div>
                      </div>
                      {dateErrorMsg && (
                        <p className="text-xs font-extrabold text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-xl mt-2 animate-pulse">
                          {dateErrorMsg}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Available Rooms / Cabins</label>
                    <div className="grid grid-cols-2 gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                      {hospRooms.map((room) => {
                        const isSelected = selectedRoomNum === room.roomNumber;
                        const isAvailable = room.status === 'Available';
                        return (
                          <div
                            key={room.id}
                            onClick={() => { if (isAvailable) setSelectedRoomNum(room.roomNumber); }}
                            className={`p-3 rounded-xl border transition-all text-left flex items-center justify-between ${
                              isAvailable ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'
                            } ${
                              isSelected && isAvailable
                                ? 'bg-[#0066FF] text-white border-blue-600 font-extrabold shadow-sm'
                                : isAvailable
                                ? 'bg-white/45 backdrop-blur-md border-white/60 text-[#0A192F] hover:bg-white/60'
                                : 'bg-rose-50/80 border-rose-200 text-rose-800'
                            }`}
                          >
                            <span className="text-xs font-bold">Room {room.roomNumber}</span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                              isSelected && isAvailable
                                ? 'bg-white/20 text-white'
                                : isAvailable
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-200 text-rose-900'
                            }`}>
                              {isAvailable ? (isSelected ? 'Selected' : 'Available') : 'Occupied'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleReserveRoom}
                  disabled={isReservingRoom || !selectedRoomNum || !!dateErrorMsg || roomStartDate < getTodayYYYYMMDD() || roomEndDate < roomStartDate}
                  className="mt-6 w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isReservingRoom ? 'Reserving in Database...' : `Instant Book Room ${selectedRoomNum || ''} at ${activeRoomBookingHosp.name}`}</span>
                </button>
              </div>
            ) : (
              /* VERTICAL STACKED LIST OF HOSPITALS (ALPHABETICAL A-Z, NO DOCTORS) */
              <>
                <div className="bg-white/45 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-white/60 shadow-lg shadow-blue-900/5">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-[#0066FF] text-xs font-extrabold uppercase tracking-wider mb-2">
                        <BedDouble className="w-3.5 h-3.5" /> Room &amp; Cabin Booking Center
                      </span>
                      <h2 className="text-2xl font-black text-[#0A192F] tracking-tight">
                        Hospital Room &amp; Cabin Availability
                      </h2>
                      <p className="text-xs text-slate-600 font-medium mt-1">
                        Select a hospital below to view available rooms and manage instant cabin reservations.
                      </p>
                    </div>
                  </div>

                  {/* Hospital Search Box */}
                  <div className="mt-6 pt-6 border-t border-white/40">
                    <div className="relative w-full">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        value={hospSearchQuery}
                        onChange={(e) => setHospSearchQuery(e.target.value)}
                        placeholder="Search hospital for room booking (e.g. City Hospital, Square, Evercare)..."
                        className="w-full bg-white/50 backdrop-blur-md border border-white/70 rounded-2xl pl-12 pr-4 py-3 text-sm text-[#0A192F] font-semibold placeholder:text-slate-500 focus:outline-none focus:border-[#0066FF] focus:bg-white/70 shadow-xs"
                      />
                      {hospSearchQuery && (
                        <button
                          onClick={() => setHospSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* SINGLE COLUMN VERTICAL HOSPITALS LIST - ALPHABETICAL (A-Z) */}
                {isHospitalsLoading ? (
                  <div className="space-y-3.5">
                    {[1, 2, 3].map((skelId) => (
                      <div 
                        key={`hosp-skel-${skelId}`} 
                        className="bg-white/45 backdrop-blur-md border border-white/60 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-pulse"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-blue-100/60 flex items-center justify-center">
                            <Building2 className="w-6 h-6 text-blue-300" />
                          </div>
                          <div className="space-y-2">
                            <div className="h-4 w-48 bg-slate-200/70 rounded" />
                            <div className="h-3 w-32 bg-slate-200/50 rounded" />
                          </div>
                        </div>
                        <div className="h-9 w-36 bg-blue-200/50 rounded-xl" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {filteredHospitals.map((hosp, idx) => (
                      <div
                        key={`hosp-card-${hosp.id || hosp.name || idx}`}
                        onClick={() => {
                          setSelectedHosp(hosp);
                          setActiveRoomBookingHosp(hosp);
                        }}
                        className="bg-white/45 backdrop-blur-md border border-white/60 hover:bg-white/60 hover:border-blue-400 hover:shadow-xl transition-all cursor-pointer rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-[#0066FF] flex items-center justify-center font-black text-xl shrink-0 group-hover:scale-105 transition-transform">
                            <Building2 className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-extrabold text-base text-[#0A192F] group-hover:text-[#0066FF] transition-colors">{hosp.name}</h3>
                              <span className="text-xs font-black px-2 py-0.5 rounded-lg flex items-center gap-1 bg-amber-50 text-amber-600 border border-amber-200 shrink-0">
                                <Star className="w-3 h-3 fill-amber-400" />
                                {hosp.rating || '4.8'}
                              </span>
                            </div>
                            <p className="text-xs font-medium text-slate-500 mt-0.5">
                              {hosp.location}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedHosp(hosp);
                            setActiveRoomBookingHosp(hosp);
                          }}
                          className="bg-[#0066FF] hover:bg-[#0055E0] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-md shrink-0 cursor-pointer self-end sm:self-center"
                        >
                          <BedDouble className="w-4 h-4" /> Book Room &amp; Cabin <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ) : activeSidebar === 'Hospitals' ? (
          /* TAB CONTENT 1B: HOSPITALS DIRECTORY (HORIZONTAL GRID, ALPHABETICAL A-Z) */
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white/45 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-white/60 shadow-lg shadow-blue-900/5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-[#0066FF] text-xs font-extrabold uppercase tracking-wider mb-2">
                    <Building2 className="w-3.5 h-3.5" /> Partner Hospital Network
                  </span>
                  <h2 className="text-2xl font-black text-[#0A192F] tracking-tight">
                    Registered Hospital Directory &amp; Catalog
                  </h2>
                  <p className="text-xs text-slate-600 font-medium mt-1">
                    Browse all partner hospitals horizontally. Click any hospital to open details and view doctor roster &amp; room availability.
                  </p>
                </div>
              </div>

              {/* Hospital Search Box */}
              <div className="mt-6 pt-6 border-t border-white/40">
                <div className="relative w-full">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={hospSearchQuery}
                    onChange={(e) => setHospSearchQuery(e.target.value)}
                    placeholder="Search hospital by name or location..."
                    className="w-full bg-white/50 backdrop-blur-md border border-white/70 rounded-2xl pl-12 pr-4 py-3 text-sm text-[#0A192F] font-semibold placeholder:text-slate-500 focus:outline-none focus:border-[#0066FF] focus:bg-white/70 shadow-xs"
                  />
                  {hospSearchQuery && (
                    <button
                      onClick={() => setHospSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* HORIZONTAL CARDS GRID (ALPHABETICAL A-Z) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredHospitals.map((hosp, idx) => (
                <div
                  key={`hosp-net-grid-card-${hosp.id || hosp.name || idx}`}
                  onClick={() => {
                    setSelectedHosp(hosp);
                    setActiveHospitalDetailModal(hosp);
                  }}
                  className="bg-white/45 backdrop-blur-md border border-white/60 hover:bg-white/60 hover:border-blue-400 hover:shadow-xl transition-all cursor-pointer rounded-3xl p-5 flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="w-12 h-12 rounded-2xl bg-blue-100 text-[#0066FF] flex items-center justify-center font-black text-xl shrink-0 group-hover:scale-105 transition-transform">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-black px-2.5 py-1 rounded-lg flex items-center gap-1 bg-amber-50 text-amber-600 border border-amber-200 shrink-0">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        {hosp.rating || '4.8'}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-base text-[#0A192F] group-hover:text-[#0066FF] transition-colors leading-snug">
                      {hosp.name}
                    </h3>
                    <p className="text-xs font-medium text-slate-500 mt-1">
                      {hosp.location}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-white/40 flex items-center justify-between text-xs font-bold text-[#0066FF] group-hover:translate-x-0.5 transition-transform">
                    <span>View Hospital Info</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              ))}
            </div>

            {/* DEDICATED HOSPITAL DETAILS MODAL (NEW INTERFACE, NOT AT BOTTOM) */}
            {activeHospitalDetailModal && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white/75 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 max-w-4xl w-full shadow-2xl border border-white/80 max-h-[90vh] overflow-y-auto animate-fade-in">
                  <div className="flex items-start justify-between gap-4 mb-6 border-b border-white/40 pb-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <Building2 className="w-7 h-7 text-[#0066FF]" />
                        <h2 className="text-2xl font-black text-[#0A192F] tracking-tight">{activeHospitalDetailModal.name}</h2>
                        <span className="text-xs font-black bg-amber-50 text-amber-600 border border-amber-200 px-2.5 py-1 rounded-lg flex items-center gap-1 shrink-0">
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          {activeHospitalDetailModal.rating || '4.8'} Rating
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-semibold mt-1">
                        {activeHospitalDetailModal.location} • Partner Hospital Overview
                      </p>
                    </div>

                    <button
                      onClick={() => setActiveHospitalDetailModal(null)}
                      className="w-9 h-9 rounded-full bg-white/50 text-slate-600 hover:bg-white/80 flex items-center justify-center transition-colors cursor-pointer shrink-0 border border-white/60"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column: Registered Doctors */}
                    <div className="lg:col-span-7 bg-white/40 backdrop-blur-md rounded-2xl p-5 border border-white/50">
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <h3 className="text-base font-black text-[#0A192F] flex items-center gap-2">
                            <Stethoscope className="w-5 h-5 text-[#0066FF]" />
                            Doctors Registered ({doctorsInSelectedHosp.length})
                          </h3>
                          <p className="text-xs text-slate-500 font-medium">Specialist roster at this hospital</p>
                        </div>
                      </div>

                      <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                        {doctorsInSelectedHosp.length > 0 ? (
                          doctorsInSelectedHosp.map((doc, idx) => (
                            <div
                              key={doc.id || idx}
                              className="bg-white/50 backdrop-blur-md border border-white/70 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs hover:bg-white/70 transition-all"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#0066FF] font-black flex items-center justify-center text-sm shrink-0">
                                  {doc.name || doc.doctor_name ? (doc.name || doc.doctor_name).replace(/^Dr\.\s*/i, '').charAt(0) : 'D'}
                                </div>
                                <div>
                                  <h4 className="font-extrabold text-sm text-[#0A192F]">{doc.name || doc.doctor_name}</h4>
                                  <p className="text-xs font-bold text-[#0066FF]">{doc.specialty || doc.specialist}</p>
                                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                    {doc.experience || '10+ Years Exp'} • Chamber: {doc.doctor_chamber || 'Building A, Room 302'}
                                  </p>
                                </div>
                              </div>

                              <button
                                onClick={() => {
                                  setActiveHospitalDetailModal(null);
                                  openAppointmentModalForDoctor(doc);
                                }}
                                className="bg-[#0066FF] hover:bg-[#0055E0] text-white font-bold text-xs px-3 py-1.5 rounded-xl transition-all shadow-xs cursor-pointer shrink-0 self-end sm:self-center"
                              >
                                Book
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="py-8 text-center text-xs text-slate-500 font-medium">
                            No doctors registered under this hospital.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Room Status & Booking Shortcut */}
                    <div className="lg:col-span-5 bg-white/40 backdrop-blur-md rounded-2xl p-5 border border-white/50 flex flex-col justify-between">
                      <div>
                        <div className="mb-4 flex items-center justify-between">
                          <div>
                            <h3 className="text-base font-black text-[#0A192F] flex items-center gap-2">
                              <BedDouble className="w-5 h-5 text-[#0066FF]" />
                              Room &amp; Cabin Status
                            </h3>
                            <p className="text-xs text-slate-500 font-medium">Live cabin availability overview</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5 max-h-[260px] overflow-y-auto pr-1 mb-4">
                          {hospRooms.map((room) => {
                            const isAvailable = room.status === 'Available';
                            return (
                              <div
                                key={room.id}
                                className="p-3 rounded-xl border border-white/60 bg-white/45 backdrop-blur-md flex items-center justify-between text-left"
                              >
                                <span className="text-xs font-bold text-slate-800">Room {room.roomNumber}</span>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                                  isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {isAvailable ? 'Available' : 'Occupied'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setActiveHospitalDetailModal(null);
                          setActiveSidebar('Room Booking');
                          setActiveRoomBookingHosp(activeHospitalDetailModal);
                        }}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                      >
                        <BedDouble className="w-4 h-4" /> Book Room at {activeHospitalDetailModal.name}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : activeSidebar === 'Diagnostics' ? (
          /* TAB CONTENT: DIAGNOSTICS CATALOG & SEARCH */
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white/45 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-white/60 shadow-lg shadow-blue-900/5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-[#0066FF] text-xs font-extrabold uppercase tracking-wider mb-2">
                    <TestTube className="w-3.5 h-3.5" /> Database Diagnostic Catalog &amp; Services
                  </span>
                  <h2 className="text-2xl font-black text-[#0A192F] tracking-tight">
                    Search Diagnostic Services &amp; Medical Tests
                  </h2>
                </div>
              </div>

              {diagBookingMsg && (
                <div className="mt-4 text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 p-3 rounded-xl animate-pulse flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  {diagBookingMsg}
                </div>
              )}

              {/* Diagnostic Search Box */}
              <div className="mt-6 pt-6 border-t border-white/40">
                <div className="relative w-full">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={diagSearchQuery}
                    onChange={(e) => setDiagSearchQuery(e.target.value)}
                    placeholder="Search any diagnostic test (e.g. Blood Test, CBC, MRI, CT Scan, X-Ray) or hospital offering it..."
                    className="w-full bg-white/50 backdrop-blur-md border border-white/70 rounded-2xl pl-12 pr-4 py-3 text-sm text-[#0A192F] font-semibold placeholder:text-slate-500 focus:outline-none focus:border-[#0066FF] focus:bg-white/70 shadow-xs"
                  />
                  {diagSearchQuery && (
                    <button
                      onClick={() => setDiagSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Diagnostic Tests Grid dynamically retrieved from Database */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredDiagnostics.length > 0 ? (
                filteredDiagnostics.map((test: any) => (
                  <div
                    key={`diag-test-card-${test.id || test.name}`}
                    className="bg-white/45 backdrop-blur-md rounded-3xl p-5 border border-white/60 shadow-lg shadow-blue-900/5 hover:bg-white/60 hover:shadow-xl transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-cyan-100 text-[#0066FF] flex items-center justify-center shrink-0">
                            <TestTube className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="font-extrabold text-base text-[#0A192F] leading-snug">{test.name}</h3>
                            <span className="inline-block text-[11px] font-bold text-[#0066FF] bg-blue-50 px-2 py-0.5 rounded mt-0.5">
                              {test.category || 'Diagnostic Test'}
                            </span>
                          </div>
                        </div>
                        <span className="text-sm font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl shrink-0">
                          ৳{test.price}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-600 font-medium border-t border-white/40 pt-3 mb-4">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                          <Building2 className="w-3.5 h-3.5 text-[#0066FF] shrink-0" />
                          <span className="truncate">{test.provider_hospital || 'Square Hospital, Dhaka'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-purple-700 bg-purple-50 px-2 py-1 rounded-lg border border-purple-100 mt-1">
                          <MapPin className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          <span>{getGlobalDiagLocation(test.name, test.location || test.test_location)}</span>
                        </div>
                        {test.subtitle && (
                          <p className="text-[11px] text-slate-500 mt-1">{test.subtitle}</p>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => openDiagModalForTest(test)}
                      className="w-full bg-[#0066FF] hover:bg-[#0055E0] text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Book Diagnostic Test</span>
                    </button>
                  </div>
                ))
              ) : (
                <div className="col-span-full bg-white/45 backdrop-blur-md rounded-3xl p-12 text-center border border-white/60 shadow-lg">
                  <TestTube className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <h3 className="text-base font-extrabold text-[#0A192F]">No Diagnostic Tests Found</h3>
                  <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
                    Try searching for another test like Blood Test, CBC, MRI, CT Scan, or clear search filter.
                  </p>
                  <button
                    onClick={() => setDiagSearchQuery('')}
                    className="mt-4 bg-[#0066FF] text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md"
                  >
                    Reset Search
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : activeSidebar === 'Appointments' ? (
          /* TAB CONTENT 2: APPOINTMENTS & DOCTOR SEARCH */
          <div className="space-y-6 animate-fade-in">
            <div className="relative z-30 bg-white/45 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-white/60 shadow-lg shadow-blue-900/5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-[#0066FF] text-xs font-extrabold uppercase tracking-wider mb-2">
                    <Stethoscope className="w-3.5 h-3.5" /> Specialist Doctor Directory
                  </span>
                  <h2 className="text-2xl font-black text-[#0A192F] tracking-tight">
                    Find Doctors &amp; Book Appointment
                  </h2>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsAppModalOpen(true)}
                    className="bg-[#0066FF] hover:bg-[#0055E0] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Quick Booking
                  </button>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-white/40 flex flex-col md:flex-row items-center gap-4">
                <div className="relative w-full md:flex-1 flex items-center gap-2">
                  <div className="relative w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={doctorSearchQuery}
                      onChange={(e) => {
                        setDoctorSearchQuery(e.target.value);
                        setActiveDoctorSearch(e.target.value.trim());
                      }}
                      onKeyDown={(e) => { 
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          setActiveDoctorSearch(doctorSearchQuery.trim());
                        }
                      }}
                      placeholder="Search doctor by name, specialty (e.g. pediatrician, cardiology), or hospital..."
                      className="w-full bg-white/50 backdrop-blur-md border border-white/70 rounded-2xl pl-12 pr-10 py-3 text-sm text-[#0A192F] font-semibold placeholder:text-slate-500 focus:outline-none focus:border-[#0066FF] focus:bg-white/70 shadow-xs"
                    />
                    {doctorSearchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setDoctorSearchQuery('');
                          setActiveDoctorSearch('');
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveDoctorSearch(doctorSearchQuery.trim());
                    }}
                    className="bg-[#0066FF] hover:bg-[#0055E0] text-white font-extrabold text-xs px-4 py-3 rounded-2xl transition-all shadow-md shrink-0 cursor-pointer flex items-center gap-1 active:scale-95"
                  >
                    <Search className="w-4 h-4" />
                    <span>Search</span>
                  </button>
                </div>

                {/* DYNAMIC FUNNEL FILTER DROPDOWN */}
                <div ref={specialtyDropdownRef} className="relative shrink-0 z-50">
                  <button
                    type="button"
                    onClick={() => setIsSpecialtyFilterOpen(!isSpecialtyFilterOpen)}
                    className={`px-4 py-3 rounded-2xl border font-extrabold text-xs transition-all cursor-pointer flex items-center gap-2 ${
                      selectedSpecialtyFilter !== 'All' && selectedSpecialtyFilter !== 'All Specialties'
                        ? 'bg-[#0066FF] text-white border-[#0066FF] shadow-md shadow-blue-500/20'
                        : 'bg-white/50 backdrop-blur-md border-white/70 text-slate-700 hover:bg-white/70'
                    }`}
                  >
                    <Filter className="w-4 h-4" />
                    <span>
                      {selectedSpecialtyFilter === 'All' || selectedSpecialtyFilter === 'All Specialties'
                        ? 'Filter Specialty'
                        : selectedSpecialtyFilter}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isSpecialtyFilterOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isSpecialtyFilterOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white/95 backdrop-blur-2xl border border-white/80 rounded-2xl shadow-2xl z-50 py-2 animate-fade-in max-h-80 overflow-y-auto">
                      <div className="px-3.5 py-2 text-[11px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100/80">
                        Filter by Specialty ({dynamicSpecialties.length - 1})
                      </div>
                      {dynamicSpecialties.map((spec) => {
                        const isSelected = selectedSpecialtyFilter === spec || (spec === 'All Specialties' && (selectedSpecialtyFilter === 'All' || selectedSpecialtyFilter === 'All Specialties'));
                        return (
                          <button
                            key={`dyn-spec-${spec}`}
                            type="button"
                            onClick={() => {
                              setSelectedSpecialtyFilter(spec === 'All Specialties' ? 'All' : spec);
                              setIsSpecialtyFilterOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-xs font-extrabold transition-all flex items-center justify-between cursor-pointer ${
                              isSelected
                                ? 'bg-[#0066FF] text-white'
                                : 'text-slate-700 hover:bg-blue-50 hover:text-[#0066FF]'
                            }`}
                          >
                            <span>{spec}</span>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredDoctors.length > 0 ? (
                filteredDoctors.map((doc) => {
                  const docNameClean = String(doc.doctor_name || doc.name || 'doctor').toLowerCase().replace(/[^a-z0-9]/g, '');
                  const uniqueKey = doc.source === 'user' || doc.user_id
                    ? `doc-user-${doc.user_id || doc.id}-${docNameClean}`
                    : `doc-cat-${doc.id}-${docNameClean}`;
                  return (
                    <div 
                      key={uniqueKey}
                      className="bg-white/45 backdrop-blur-md rounded-3xl p-5 border border-white/60 shadow-lg shadow-blue-900/5 hover:shadow-xl hover:bg-white/60 transition-all flex flex-col justify-between group"
                    >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-md shadow-blue-500/20 overflow-hidden shrink-0">
                            {String(doc.doctor_name || doc.name || 'Doctor').replace(/^Dr\.\s*/i, '').charAt(0) || 'D'}
                          </div>
                          <div>
                            <h3 className="font-extrabold text-base text-[#0A192F] group-hover:text-[#0066FF] transition-colors">
                              {doc.doctor_name || doc.name}
                            </h3>
                            <span className="inline-block text-xs font-bold text-[#0066FF] bg-blue-50/80 px-2.5 py-0.5 rounded-md mt-0.5">
                              {doc.specialist || doc.specialty}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 text-xs font-black text-amber-500 bg-amber-50/80 border border-amber-200/60 px-2 py-1 rounded-lg">
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          <span>{doc.rating || '4.8'}</span>
                        </div>
                      </div>

                      <div className="space-y-2 text-xs text-slate-600 font-medium border-t border-white/40 pt-3 mb-4">
                        <div className="flex items-center gap-2">
                          <Award className="w-3.5 h-3.5 text-[#0066FF] shrink-0" />
                          <span>{doc.quality || 'Senior Consultant'} • {doc.experience_year || doc.experience || '10+ Yrs Exp'}</span>
                        </div>
                        {doc.schedule && doc.schedule !== 'Not specified' && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-[#0066FF] shrink-0" />
                            <span>{doc.schedule}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-[#0066FF] shrink-0" />
                          <span className="truncate">
                            {(doc.chambers && doc.chambers.length > 0)
                              ? Array.from(new Set(doc.chambers.map((c: any) => c.hospital))).join(' • ')
                              : (doc.doctor_address || doc.hospital || 'City Hospital, Dhaka • Dhaka Medical College Hospital')
                            }
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => openAppointmentModalForDoctor(doc)}
                      className="w-full bg-[#0066FF] hover:bg-[#0055E0] text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-md shadow-blue-500/15 flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                    >
                      <Calendar className="w-3.5 h-3.5" /> Book Appointment Now
                    </button>
                  </div>
                );
              })
              ) : (
                <div className="col-span-full bg-white/45 backdrop-blur-md rounded-3xl p-12 text-center border border-white/60 shadow-lg animate-fade-in">
                  <Stethoscope className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <h3 className="text-base font-extrabold text-[#0A192F]">No doctors found</h3>
                  <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
                    No doctor matching your current search query and category criteria was found.
                  </p>
                  <button
                    onClick={() => {
                      setDoctorSearchQuery('');
                      setActiveDoctorSearch('');
                      setSelectedSpecialtyFilter('All');
                    }}
                    className="mt-4 bg-[#0066FF] hover:bg-[#0055E0] text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md cursor-pointer transition-all"
                  >
                    Reset All Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : activeSidebar === 'Prescriptions' ? (
          /* TAB CONTENT: PRESCRIPTIONS LIST & VAULT */
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white/45 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-white/60 shadow-lg shadow-blue-900/5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-[#0066FF] text-xs font-extrabold uppercase tracking-wider mb-2">
                    <FileText className="w-3.5 h-3.5" /> Medical Vault &amp; Digital Prescriptions
                  </span>
                  <h2 className="text-2xl font-black text-[#0A192F] tracking-tight">
                    My Prescriptions &amp; Medical Documents
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
                    Access and manage all uploaded prescriptions, doctor notes, and clinical records securely.
                  </p>
                </div>

                <button
                  onClick={() => setIsPrescUploadModalOpen(true)}
                  className="bg-[#0066FF] hover:bg-[#0055E0] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-md cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" /> Upload New Prescription
                </button>
              </div>

              {/* Prescription Search Box */}
              <div className="mt-6 pt-6 border-t border-white/40">
                <div className="relative w-full">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={prescSearchQuery}
                    onChange={(e) => setPrescSearchQuery(e.target.value)}
                    placeholder="Search prescriptions by title, doctor name, or hospital..."
                    className="w-full bg-white/50 backdrop-blur-md border border-white/70 rounded-2xl pl-12 pr-4 py-3 text-sm text-[#0A192F] font-semibold placeholder:text-slate-500 focus:outline-none focus:border-[#0066FF] focus:bg-white/70 shadow-xs"
                  />
                  {prescSearchQuery && (
                    <button
                      onClick={() => setPrescSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Prescriptions List / Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {prescriptions.filter((p: any) => {
                const q = prescSearchQuery.toLowerCase().trim();
                if (!q) return true;
                return (p.title || '').toLowerCase().includes(q) ||
                       (p.doctor_name || '').toLowerCase().includes(q) ||
                       (p.hospital || '').toLowerCase().includes(q);
              }).length > 0 ? (
                prescriptions.filter((p: any) => {
                  const q = prescSearchQuery.toLowerCase().trim();
                  if (!q) return true;
                  return (p.title || '').toLowerCase().includes(q) ||
                         (p.doctor_name || '').toLowerCase().includes(q) ||
                         (p.hospital || '').toLowerCase().includes(q);
                }).map((p: any, idx: number) => (
                  <div
                    key={p.id || idx}
                    className="bg-white/45 backdrop-blur-md rounded-3xl p-5 border border-white/60 shadow-lg shadow-blue-900/5 hover:bg-white/60 hover:shadow-xl transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-[#0066FF] flex items-center justify-center shrink-0">
                            <FileText className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="font-extrabold text-base text-[#0A192F] leading-snug">{p.title || 'Medical Prescription'}</h3>
                            <span className="inline-block text-[11px] font-bold text-[#0066FF] bg-blue-50/80 px-2 py-0.5 rounded mt-0.5">
                              {p.date_str || 'Uploaded Record'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-600 font-medium border-t border-white/40 pt-3 mb-4">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                          <Stethoscope className="w-3.5 h-3.5 text-[#0066FF] shrink-0" />
                          <span>{p.doctor_name || 'Prescribing Doctor'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Building2 className="w-3.5 h-3.5 text-[#0066FF] shrink-0" />
                          <span className="truncate">{p.hospital || 'Hospital Vault'}</span>
                        </div>
                      </div>

                      <div className="relative w-full h-36 rounded-2xl bg-white/40 backdrop-blur-md overflow-hidden mb-4 border border-white/50 group">
                        <img 
                          src={getPrescriptionImageDataUrl(p)} 
                          alt={p.title || 'Prescription Document'} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => setSelectedPrescPreview(p)}
                            className="bg-white/90 backdrop-blur-md text-[#0066FF] font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" /> Full Image
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedPrescPreview(p)}
                        className="flex-1 bg-[#0066FF] hover:bg-[#0055E0] text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Document</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadPrescription(p)}
                        className="px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                        title="Download Prescription as PNG Image"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full bg-white/45 backdrop-blur-md rounded-3xl p-12 text-center border border-white/60 shadow-lg">
                  <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <h3 className="text-base font-extrabold text-[#0A192F]">No Prescriptions Found</h3>
                  <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
                    Upload your prescription images or doctor reports to store them safely in your digital vault.
                  </p>
                  <button
                    onClick={() => setIsPrescUploadModalOpen(true)}
                    className="mt-4 bg-[#0066FF] text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md"
                  >
                    Upload Prescription Now
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : activeSidebar === 'Reviews & Ratings' ? (
          /* TAB CONTENT: REVIEWS & RATINGS (VERIFIED VISITS ONLY) */
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white/45 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-white/60 shadow-lg shadow-blue-900/5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-extrabold uppercase tracking-wider mb-2">
                    <Star className="w-3.5 h-3.5 fill-amber-500" /> Patient Feedback &amp; Ratings
                  </span>
                  <h2 className="text-2xl font-black text-[#0A192F] tracking-tight">
                    Verified Patient Service Ratings
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
                    Rate doctor consultations or hospital services and publish verified feedback for doctors and hospital management.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => openRateModalForVisit()}
                  className="bg-[#0066FF] hover:bg-[#0055E0] text-white font-bold text-xs px-5 py-3 rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Write New Review</span>
                </button>
              </div>
            </div>

            {/* Automated Verified Review Prompt (Only shown when Doctor or Admin marks completed/done) */}
            {unratedVisitedServices.length > 0 && (
              <div className="bg-gradient-to-r from-blue-50/70 to-indigo-50/70 backdrop-blur-md border border-blue-200/80 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
                  <h3 className="font-extrabold text-sm text-[#0A192F]">Automated Visit Feedback — How was your experience?</h3>
                </div>
                <p className="text-xs text-slate-600 font-medium mb-4">
                  Select a completed visit below to rate your doctor or hospital service:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {unratedVisitedServices.map((svc: any) => (
                    <div
                      key={svc.id}
                      onClick={() => openRateModalForVisit(svc)}
                      className="relative bg-white/50 backdrop-blur-md border border-blue-200 hover:border-blue-500 hover:shadow-md p-4 rounded-2xl cursor-pointer transition-all flex items-center justify-between gap-3 shadow-2xs group"
                    >
                      <div>
                        <span className="text-[10px] font-black uppercase text-[#0066FF] bg-blue-50 px-2 py-0.5 rounded">
                          {svc.target_type === 'doctor' ? 'Doctor Visit' : 'Hospital Service'}
                        </span>
                        <h4 className="font-extrabold text-xs text-[#0A192F] mt-1">{svc.target_name}</h4>
                        <p className="text-[11px] text-slate-500 font-medium">{svc.service_date}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDismissReviewCard(svc.id);
                          }}
                          title="Skip / Dismiss"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openRateModalForVisit(svc);
                          }}
                          className="bg-[#0066FF] hover:bg-[#0055E0] text-white text-xs font-extrabold px-3 py-1.5 rounded-xl transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                        >
                          <span>Rate</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Published Ratings & Reviews List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-[#0A192F] tracking-tight flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-400" /> My Published Ratings &amp; Reviews ({reviews.length})
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reviews.length > 0 ? (
                  reviews.map((rev: any, idx: number) => (
                    <div
                      key={rev.id || idx}
                      className="bg-white/45 backdrop-blur-md rounded-3xl p-5 border border-white/60 shadow-md flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <h4 className="font-extrabold text-sm text-[#0A192F]">{rev.user_name || 'Patient User'}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs font-extrabold text-[#0066FF] bg-blue-50/80 border border-blue-200/60 px-2.5 py-0.5 rounded-lg">
                                {rev.target_name}
                              </span>
                              <span className="text-[10px] uppercase font-extrabold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                {rev.target_type || 'doctor'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 bg-amber-50/80 border border-amber-200 px-2.5 py-1 rounded-xl shrink-0">
                            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                            <span className="text-xs font-black text-amber-700">{rev.rating || 5} Stars</span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-700 font-medium italic mt-3 bg-white/50 backdrop-blur-md p-3.5 rounded-2xl border border-white/60">
                          "{rev.comment}"
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/40 flex items-center justify-between">
                        {rev.id && (
                          <button
                            type="button"
                            onClick={() => handleDeleteItem('review', rev.id)}
                            disabled={isDeletingItemId === rev.id}
                            className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-xl transition-colors border border-rose-200/60 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{isDeletingItemId === rev.id ? 'Deleting...' : 'Delete Review'}</span>
                          </button>
                        )}
                        <span className="text-[10px] font-semibold text-slate-400 ml-auto">
                          {rev.created_at || 'Recently posted'}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full bg-white/45 backdrop-blur-md rounded-3xl p-8 text-center border border-white/60 shadow-sm">
                    <Star className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                    <h4 className="font-extrabold text-sm text-[#0A192F]">No Ratings &amp; Reviews Yet</h4>
                    <p className="text-xs text-slate-600 font-medium mt-1">
                      You haven't submitted any verified reviews yet. Rate your recent visits above to share your feedback.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activeSidebar === 'Profile' ? (
          /* TAB CONTENT: PATIENT PROFILE VIEW */
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white/45 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-white/60 shadow-lg shadow-blue-900/5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 rounded-3xl bg-[#0066FF]/10 border-2 border-[#0066FF]/30 text-[#0066FF] flex items-center justify-center font-black text-3xl shadow-lg overflow-hidden shrink-0">
                    {profilePic ? (
                      <img src={profilePic} alt={patientName} className="w-full h-full object-cover" />
                    ) : (
                      patientName.charAt(0)
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-black text-[#0A192F] tracking-tight">{patientName}</h2>
                      <span className="px-3 py-1 rounded-full bg-blue-100 text-[#0066FF] text-xs font-black uppercase">
                        Patient Account
                      </span>
                    </div>
                    <p className="text-xs font-mono text-[#0066FF] font-bold mt-1">Patient UID: {patientUid}</p>
                    <p className="text-xs font-medium text-slate-600 mt-0.5">{user.email}</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsProfileModalOpen(true)}
                  className="bg-[#0066FF] hover:bg-[#0055E0] text-white font-bold text-xs px-5 py-3 rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <User className="w-4 h-4" /> Edit Profile Information
                </button>
              </div>
            </div>

            {/* Profile Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <div className="bg-white/45 backdrop-blur-md rounded-3xl p-5 border border-white/60 shadow-lg flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs text-slate-600 font-semibold">Blood Group</div>
                  <div className="text-lg font-black text-[#0A192F]">{profile.blood_group || editBloodGroup || 'A+'}</div>
                </div>
              </div>

              <div className="bg-white/45 backdrop-blur-md rounded-3xl p-5 border border-white/60 shadow-lg flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-[#0066FF] flex items-center justify-center shrink-0">
                  <PhoneCall className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs text-slate-600 font-semibold">Phone Number</div>
                  <div className="text-sm font-bold text-[#0A192F]">{profile.phone || editPhone || '+880 1711-000000'}</div>
                </div>
              </div>

              <div className="bg-white/45 backdrop-blur-md rounded-3xl p-5 border border-white/60 shadow-lg flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-cyan-100 text-cyan-600 flex items-center justify-center shrink-0">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs text-slate-600 font-semibold">Gender &amp; DOB</div>
                  <div className="text-sm font-bold text-[#0A192F]">{profile.gender || editGender || 'Female'} • {profile.date_of_birth || editDob || '1998-05-14'}</div>
                </div>
              </div>

              <div className="bg-white/45 backdrop-blur-md rounded-3xl p-5 border border-white/60 shadow-lg flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs text-slate-600 font-semibold">Present Address</div>
                  <div className="text-xs font-bold text-[#0A192F] truncate max-w-[200px]">{profile.address || editAddress || 'Dhanmondi, Dhaka'}</div>
                </div>
              </div>

              <div className="bg-white/45 backdrop-blur-md rounded-3xl p-5 border border-white/60 shadow-lg flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs text-slate-600 font-semibold">Known Allergies</div>
                  <div className="text-sm font-bold text-[#0A192F]">{profile.allergies || editAllergies || 'None'}</div>
                </div>
              </div>

              <div className="bg-white/45 backdrop-blur-md rounded-3xl p-5 border border-white/60 shadow-lg flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs text-slate-600 font-semibold">Profile Status</div>
                  <div className="text-sm font-bold text-emerald-600">Verified Patient</div>
                </div>
              </div>
            </div>
          </div>
        ) : activeSidebar === 'Help & Support' ? (
          /* TAB CONTENT: HELP & SUPPORT */
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white/45 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-white/60 shadow-lg shadow-blue-900/5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-[#0066FF] text-xs font-extrabold uppercase tracking-wider mb-2">
                <HelpCircle className="w-3.5 h-3.5" /> 24/7 Patient Assistance &amp; Emergency Hub
              </span>
              <h2 className="text-2xl font-black text-[#0A192F] tracking-tight">
                Help Desk &amp; Direct Support
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
                Need assistance with doctor appointments, room bookings, or emergency dispatch? We are here 24/7.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 bg-white/45 backdrop-blur-md rounded-3xl p-6 border border-white/60 shadow-lg">
                <h3 className="text-lg font-black text-[#0A192F] tracking-tight flex items-center gap-2 mb-4">
                  <Send className="w-5 h-5 text-[#0066FF]" /> Send Emergency Inquiry
                </h3>

                {supportSubmitMsg && (
                  <div className="mb-4 text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 p-3 rounded-xl animate-pulse">
                    {supportSubmitMsg}
                  </div>
                )}

                <form onSubmit={handleSubmitSupportInquiry} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={supportPhone}
                      onChange={(e) => setSupportPhone(e.target.value)}
                      placeholder="e.g. +880 1711-000000"
                      className="w-full h-11 px-3 rounded-xl border border-white/70 bg-white/50 backdrop-blur-md text-xs font-semibold text-[#0A192F] outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Inquiry Category</label>
                    <select
                      value={supportCategory}
                      onChange={(e) => setSupportCategory(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl border border-white/70 bg-white/50 backdrop-blur-md text-xs font-bold text-[#0A192F] outline-none"
                    >
                      <option value="Emergency Hotline">Emergency Hotline</option>
                      <option value="Ambulance Booking">Ambulance Dispatch</option>
                      <option value="Diagnostic Test Info">Diagnostic Test Info</option>
                      <option value="Room Booking Assistance">Room Booking Assistance</option>
                      <option value="General Query">General Query</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Your Message</label>
                    <textarea
                      rows={4}
                      value={supportMessage}
                      onChange={(e) => setSupportMessage(e.target.value)}
                      placeholder="Describe your query or urgent assistance required..."
                      className="w-full p-3 rounded-xl border border-white/70 bg-white/50 backdrop-blur-md text-xs font-medium text-[#0A192F] outline-none focus:border-[#0066FF]"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingSupport || !supportMessage.trim()}
                    className="w-full h-11 bg-[#0066FF] hover:bg-[#0055E0] text-white font-bold text-xs rounded-xl transition-all shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmittingSupport ? 'Sending Message...' : 'Submit Inquiry'}
                  </button>
                </form>
              </div>

              <div className="lg:col-span-7 space-y-4">
                <h3 className="text-lg font-black text-[#0A192F] tracking-tight flex items-center gap-2">
                  <PhoneCall className="w-5 h-5 text-[#0066FF]" /> Direct Emergency Hotlines
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white/45 backdrop-blur-md rounded-2xl p-5 border border-white/60 shadow-md">
                    <span className="text-[10px] font-black uppercase text-[#0066FF] bg-blue-50/80 px-2 py-0.5 rounded">Toll-Free 24/7</span>
                    <h4 className="font-extrabold text-sm text-[#0A192F] mt-2">Emergency Triage</h4>
                    <p className="text-base font-black text-[#0066FF] mt-1">+880 9612-444999</p>
                    <p className="text-[11px] text-slate-600 mt-1">Instant medical advice and hospital routing</p>
                  </div>

                  <div className="bg-white/45 backdrop-blur-md rounded-2xl p-5 border border-white/60 shadow-md">
                    <span className="text-[10px] font-black uppercase text-rose-600 bg-rose-50/80 px-2 py-0.5 rounded">Rapid Response</span>
                    <h4 className="font-extrabold text-sm text-[#0A192F] mt-2">Ambulance Service</h4>
                    <p className="text-base font-black text-rose-600 mt-1">+880 1999-911911</p>
                    <p className="text-[11px] text-slate-600 mt-1">ICU &amp; Non-ICU GPS ambulance booking</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeSidebar === 'Settings' ? (
          /* TAB CONTENT: SETTINGS & PREFERENCES */
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white/45 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-white/60 shadow-lg shadow-blue-900/5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-[#0066FF] text-xs font-extrabold uppercase tracking-wider mb-2">
                <Settings className="w-3.5 h-3.5" /> Account Preferences &amp; Security
              </span>
              <h2 className="text-2xl font-black text-[#0A192F] tracking-tight">
                Patient Dashboard Settings
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
                Manage notifications, privacy controls, password security, and account preferences.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/45 backdrop-blur-md rounded-3xl p-6 border border-white/60 shadow-lg space-y-4">
                <h3 className="text-lg font-black text-[#0A192F] flex items-center gap-2">
                  <Bell className="w-5 h-5 text-[#0066FF]" /> Notification Settings
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 rounded-2xl bg-white/40 border border-white/50 cursor-pointer">
                    <span className="text-xs font-bold text-[#0A192F]">Appointment SMS Reminders</span>
                    <input type="checkbox" defaultChecked className="w-4 h-4 accent-[#0066FF] cursor-pointer" />
                  </label>
                  <label className="flex items-center justify-between p-3 rounded-2xl bg-white/40 border border-white/50 cursor-pointer">
                    <span className="text-xs font-bold text-[#0A192F]">Email Prescription Updates</span>
                    <input type="checkbox" defaultChecked className="w-4 h-4 accent-[#0066FF] cursor-pointer" />
                  </label>
                  <label className="flex items-center justify-between p-3 rounded-2xl bg-white/40 border border-white/50 cursor-pointer">
                    <span className="text-xs font-bold text-[#0A192F]">Room Reservation Status Alerts</span>
                    <input type="checkbox" defaultChecked className="w-4 h-4 accent-[#0066FF] cursor-pointer" />
                  </label>
                </div>
              </div>

              <div className="bg-white/45 backdrop-blur-md rounded-3xl p-6 border border-white/60 shadow-lg space-y-4">
                <h3 className="text-lg font-black text-[#0A192F] flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#0066FF]" /> Security &amp; Account
                </h3>
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setIsProfileModalOpen(true)}
                    className="w-full text-left p-3.5 rounded-2xl bg-white/40 border border-white/50 hover:bg-white/60 transition-all flex items-center justify-between cursor-pointer"
                  >
                    <span className="text-xs font-bold text-[#0A192F]">Edit Patient Profile</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                  <button
                    type="button"
                    onClick={onLogout}
                    className="w-full text-left p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200/60 hover:bg-rose-100 transition-all flex items-center justify-between cursor-pointer"
                  >
                    <span className="text-xs font-bold text-rose-700">Sign Out of Account</span>
                    <LogOut className="w-4 h-4 text-rose-600" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* TAB CONTENT 3: MAIN DASHBOARD VIEW */
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
              <div 
                onClick={() => setActiveSidebar('Appointments')}
                className="bg-white/45 backdrop-blur-md rounded-3xl p-5 border border-white/60 shadow-lg shadow-blue-900/5 hover:shadow-xl hover:bg-white/60 hover:border-white/80 transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-[#0066FF] text-white flex items-center justify-center mb-4 shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <h3 className="font-extrabold text-[#0A192F] text-base mb-1">Book Appointment</h3>
                  <p className="text-xs text-slate-600 font-medium">Find doctors &amp; book appointment</p>
                </div>
                <div className="mt-4 flex items-center text-xs font-bold text-[#0066FF]">
                  <span>Search Doctors</span>
                  <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              <div 
                onClick={() => setActiveSidebar('Hospitals')}
                className="bg-white/45 backdrop-blur-md rounded-3xl p-5 border border-white/60 shadow-lg shadow-blue-900/5 hover:shadow-xl hover:bg-white/60 hover:border-white/80 transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-[#0066FF] text-white flex items-center justify-center mb-4 shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <h3 className="font-extrabold text-[#0A192F] text-base mb-1">Connected Hospitals</h3>
                  <p className="text-xs text-slate-600 font-medium">Check hospitals, doctors &amp; book rooms</p>
                </div>
                <div className="mt-4 flex items-center text-xs font-bold text-[#0066FF]">
                  <span>Explore Hospitals</span>
                  <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              <div 
                onClick={() => setIsPrescUploadModalOpen(true)}
                className="bg-white/45 backdrop-blur-md rounded-3xl p-5 border border-white/60 shadow-lg shadow-blue-900/5 hover:shadow-xl hover:bg-white/60 hover:border-white/80 transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-[#0066FF] text-white flex items-center justify-center mb-4 shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h3 className="font-extrabold text-[#0A192F] text-base mb-1">My Prescriptions</h3>
                  <p className="text-xs text-slate-600 font-medium">Upload past prescriptions as image</p>
                </div>
                <div className="mt-4 flex items-center text-xs font-bold text-[#0066FF]">
                  <span>Upload Prescription Image</span>
                  <Plus className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              <div 
                onClick={() => setActiveSidebar('Reviews & Ratings')}
                className="bg-white/45 backdrop-blur-md rounded-3xl p-5 border border-white/60 shadow-lg shadow-blue-900/5 hover:shadow-xl hover:bg-white/60 hover:border-white/80 transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-[#0066FF] text-white flex items-center justify-center mb-4 shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                    <Star className="w-6 h-6" />
                  </div>
                  <h3 className="font-extrabold text-[#0A192F] text-base mb-1">Review &amp; Ratings</h3>
                  <p className="text-xs text-slate-600 font-medium">Share your experience and help others</p>
                </div>
                <div className="mt-4 flex items-center text-xs font-bold text-[#0066FF]">
                  <span>Give Feedback</span>
                  <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
              <div className="lg:col-span-7 bg-white/45 backdrop-blur-md rounded-3xl p-6 border border-white/60 shadow-lg shadow-blue-900/5 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-black text-[#0A192F] tracking-tight">Upcoming Appointment</h3>
                  <button 
                    onClick={() => setActiveSidebar('Appointments')}
                    className="text-xs font-bold text-[#0066FF] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Search className="w-3.5 h-3.5" /> Search Doctors
                  </button>
                </div>

                {upcomingAppointments.length > 0 ? (
                  <div className="space-y-3">
                    <div className="max-h-[320px] overflow-y-auto space-y-3 pr-1">
                      {upcomingAppointments.map((app: any, idx: number) => (
                        <div 
                          key={app.id || idx} 
                          className="bg-white/60 backdrop-blur-md border border-white/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs hover:border-blue-300 transition-all"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 border border-blue-200 flex items-center justify-center shrink-0 text-[#0066FF] font-black text-lg overflow-hidden">
                              <User className="w-7 h-7 text-[#0066FF]" />
                            </div>
                            <div>
                              <h4 className="font-extrabold text-sm text-[#0A192F]">{app.doctor_name}</h4>
                              <p className="text-xs font-semibold text-slate-600">{app.specialty}</p>
                              <p className="text-xs font-medium text-slate-500 mt-0.5">{app.hospital}</p>
                              {app.doctor_chamber && (
                                <p className="text-xs font-bold text-[#0066FF] mt-1 flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5" /> {app.doctor_chamber}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-start sm:items-end gap-1.5 w-full sm:w-auto border-t sm:border-t-0 border-slate-200/60 pt-2 sm:pt-0">
                            {app.serial_number && (
                              <div className="flex items-center gap-1 text-[11px] font-black text-white bg-[#0066FF] px-2.5 py-0.5 rounded-lg shadow-xs">
                                <span>Serial:</span>
                                <span className="font-mono">{app.serial_number}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#0A192F] bg-white/70 border border-slate-200 px-2.5 py-1 rounded-lg">
                              <Calendar className="w-3 h-3 text-[#0066FF]" />
                              <span>{app.appointment_date}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#0A192F] bg-white/70 border border-slate-200 px-2.5 py-1 rounded-lg">
                              <Clock className="w-3 h-3 text-[#0066FF]" />
                              <span>{app.appointment_time}</span>
                            </div>
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3" /> {app.status || 'Confirmed'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="bg-blue-50/70 backdrop-blur-md border border-blue-200/60 rounded-2xl p-3 flex items-center gap-3 text-xs text-[#0066FF] font-semibold">
                      <div className="w-5 h-5 rounded-full bg-[#0066FF] text-white flex items-center justify-center text-[10px] font-black shrink-0">i</div>
                      <span>Please arrive 15 minutes before your appointment time.</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white/45 backdrop-blur-md border border-dashed border-slate-300 rounded-2xl p-8 text-center flex flex-col items-center justify-center">
                    <Calendar className="w-10 h-10 text-slate-400 mb-2" />
                    <h4 className="font-extrabold text-sm text-[#0A192F]">No Upcoming Appointments</h4>
                    <p className="text-xs text-slate-600 mt-1 max-w-xs mb-4">Book your first doctor appointment with top specialists across Bangladesh.</p>
                    <button
                      onClick={() => setActiveSidebar('Appointments')}
                      className="bg-[#0066FF] hover:bg-[#0055E0] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-md"
                    >
                      Browse &amp; Search Doctors
                    </button>
                  </div>
                )}
              </div>

              <div className="lg:col-span-5 bg-white/45 backdrop-blur-md rounded-3xl p-6 border border-white/60 shadow-lg shadow-blue-900/5 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-black text-[#0A192F] tracking-tight">Health Summary</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div 
                    onClick={() => setManageSummaryModal('prescriptions')}
                    className="bg-white/45 backdrop-blur-md border border-white/60 hover:bg-white/55 hover:border-white/80 hover:shadow-md rounded-2xl p-4 flex items-center justify-between gap-3 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50/80 text-[#0066FF] border border-blue-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs text-slate-600 font-bold">Prescriptions</div>
                        <div className="text-xl font-black text-[#0A192F]">{stats.prescriptionsCount} <span className="text-xs text-slate-500 font-medium">Uploaded</span></div>
                      </div>
                    </div>
                  </div>

                  <div 
                    onClick={() => setManageSummaryModal('appointments')}
                    className="bg-white/45 backdrop-blur-md border border-white/60 hover:bg-white/55 hover:border-white/80 hover:shadow-md rounded-2xl p-4 flex items-center justify-between gap-3 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50/80 text-[#0066FF] border border-blue-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs text-slate-600 font-bold">Appointments</div>
                        <div className="text-xl font-black text-[#0A192F]">{upcomingAppointments.length} <span className="text-xs text-slate-500 font-medium">Upcoming</span></div>
                      </div>
                    </div>
                  </div>

                  <div 
                    onClick={() => setManageSummaryModal('rooms')}
                    className="bg-white/45 backdrop-blur-md border border-white/60 hover:bg-white/55 hover:border-white/80 hover:shadow-md rounded-2xl p-4 flex items-center justify-between gap-3 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50/80 text-[#0066FF] border border-blue-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <BedDouble className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs text-slate-600 font-bold">Rooms Booked</div>
                        <div className="text-xl font-black text-[#0A192F]">{stats.roomsCount} <span className="text-xs text-slate-500 font-medium">This Year</span></div>
                      </div>
                    </div>
                  </div>

                  <div 
                    onClick={() => setActiveSidebar('Reviews & Ratings')}
                    className="bg-white/45 backdrop-blur-md border border-white/60 hover:bg-white/55 hover:border-white/80 hover:shadow-md rounded-2xl p-4 flex items-center justify-between gap-3 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#0066FF]/10 text-[#0066FF] border border-blue-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Star className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs text-slate-600 font-bold">Reviews Given</div>
                        <div className="text-xl font-black text-[#0A192F]">{reviews.length || stats.reviewsCount} <span className="text-xs text-slate-500 font-medium">Total</span></div>
                      </div>
                    </div>
                  </div>

                  <div 
                    onClick={() => setManageSummaryModal('diagnostic')}
                    className="sm:col-span-2 bg-gradient-to-r from-cyan-50/70 to-blue-50/70 border border-cyan-200/80 hover:border-cyan-400 hover:shadow-md rounded-2xl p-4 flex items-center justify-between gap-3 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-md shadow-cyan-500/20">
                        <TestTube className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs text-slate-700 font-bold">Diagnostic Bookings</div>
                        <div className="text-xl font-black text-[#0A192F]">{activeDiagnosticCount} <span className="text-xs text-slate-600 font-semibold">Tests Booked</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Manage Health Summary Modal */}
            {manageSummaryModal && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white/75 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl border border-white/80 max-h-[85vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-4 border-b border-white/40 pb-3">
                    <div>
                      <h3 className="text-xl font-black text-[#0A192F] flex items-center gap-2">
                        {manageSummaryModal === 'diagnostic' && <TestTube className="w-6 h-6 text-[#0066FF]" />}
                        {manageSummaryModal === 'appointments' && <Calendar className="w-6 h-6 text-[#0066FF]" />}
                        {manageSummaryModal === 'prescriptions' && <FileText className="w-6 h-6 text-[#0066FF]" />}
                        {manageSummaryModal === 'reviews' && <Star className="w-6 h-6 text-[#0066FF]" />}
                        {manageSummaryModal === 'rooms' && <BedDouble className="w-6 h-6 text-[#0066FF]" />}
                        Manage {manageSummaryModal.charAt(0).toUpperCase() + manageSummaryModal.slice(1)} Items
                      </h3>
                      <p className="text-xs text-slate-600 font-medium mt-0.5">
                        Your active healthcare records and appointments.
                      </p>
                    </div>
                    <button
                      onClick={() => setManageSummaryModal(null)}
                      className="text-slate-400 hover:text-slate-600 p-1"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {deleteMsg && (
                    <div className="mb-4 text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 p-3 rounded-xl flex items-center gap-1.5 animate-bounce">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      {deleteMsg}
                    </div>
                  )}

                  <div className="space-y-3">
                    {manageSummaryModal === 'diagnostic' && (
                      diagnosticBookings.length > 0 ? (
                        diagnosticBookings.map((diag: any) => (
                          <div
                            key={diag.id}
                            className="bg-white/50 backdrop-blur-md border border-white/70 rounded-2xl p-4 flex items-center justify-between gap-3 hover:border-blue-300 transition-all"
                          >
                            <div>
                              <h4 className="font-extrabold text-sm text-[#0A192F]">{diag.service_name}</h4>
                              <p className="text-xs font-bold text-[#0066FF] mt-0.5">Serial: {diag.serial_number || 'DS-SL-101'} • Date: {diag.booking_date || 'Upcoming'}</p>
                              <p className="text-[11px] text-slate-500 font-medium">{diag.test_location || 'Diagnostic Wing'} • Fee: ৳{diag.price || 1000}</p>
                            </div>

                            <button
                              onClick={() => handleDeleteItem('diagnostic', diag.id)}
                              disabled={isDeletingItemId === diag.id}
                              className="bg-rose-50 hover:bg-rose-600 hover:text-white border border-rose-200 text-rose-600 font-bold text-xs px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>{isDeletingItemId === diag.id ? 'Deleting...' : 'Delete / Undo'}</span>
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="py-8 text-center text-xs text-slate-600 font-medium">No diagnostic test bookings found.</div>
                      )
                    )}

                    {manageSummaryModal === 'appointments' && (
                      appointments.length > 0 ? (
                        appointments.map((app: any) => (
                          <div
                            key={app.id}
                            className="bg-white/50 backdrop-blur-md border border-white/70 rounded-2xl p-4 flex items-center justify-between gap-3 hover:border-blue-300 transition-all"
                          >
                            <div>
                              <h4 className="font-extrabold text-sm text-[#0A192F]">{app.doctor_name}</h4>
                              <p className="text-xs font-bold text-[#0066FF] mt-0.5">{app.specialty} • {app.hospital}</p>
                              <p className="text-[11px] text-slate-500 font-medium">Serial: {app.serial_number || 'SL-01'} • {app.appointment_date} at {app.appointment_time}</p>
                            </div>

                            <button
                              onClick={() => handleDeleteItem('appointment', app.id)}
                              disabled={isDeletingItemId === app.id}
                              className="bg-rose-50 hover:bg-rose-600 hover:text-white border border-rose-200 text-rose-600 font-bold text-xs px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>{isDeletingItemId === app.id ? 'Cancelling...' : 'Cancel Appointment'}</span>
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="py-8 text-center text-xs text-slate-600 font-medium">No upcoming appointments found.</div>
                      )
                    )}

                    {manageSummaryModal === 'prescriptions' && (
                      prescriptions.length > 0 ? (
                        prescriptions.map((pres: any) => (
                          <div
                            key={pres.id}
                            className="bg-white/50 backdrop-blur-md border border-white/70 rounded-2xl p-4 flex items-center justify-between gap-3"
                          >
                            <div>
                              <h4 className="font-extrabold text-sm text-[#0A192F]">{pres.title}</h4>
                              <p className="text-xs font-semibold text-slate-600 mt-0.5">{pres.doctor_name} • {pres.date_str}</p>
                            </div>

                            <button
                              onClick={() => handleDeleteItem('prescription', pres.id)}
                              disabled={isDeletingItemId === pres.id}
                              className="bg-rose-50 hover:bg-rose-600 hover:text-white border border-rose-200 text-rose-600 font-bold text-xs px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>{isDeletingItemId === pres.id ? 'Deleting...' : 'Delete'}</span>
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="py-8 text-center text-xs text-slate-600 font-medium">No prescriptions found.</div>
                      )
                    )}

                    {manageSummaryModal === 'reviews' && (
                      reviews.length > 0 ? (
                        <>
                          <div className="mb-3 flex justify-end">
                            <button
                              onClick={() => {
                                setManageSummaryModal(null);
                                setActiveSidebar('Reviews & Ratings');
                              }}
                              className="bg-[#0066FF] text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-xs flex items-center gap-1 cursor-pointer"
                            >
                              <Star className="w-3.5 h-3.5" /> Go to Full Reviews &amp; Ratings Page
                            </button>
                          </div>
                          {reviews.map((rev: any) => (
                            <div
                              key={rev.id}
                              className="bg-white/50 backdrop-blur-md border border-white/70 rounded-2xl p-4 flex items-center justify-between gap-3"
                            >
                              <div>
                                <h4 className="font-extrabold text-sm text-[#0A192F]">{rev.target_name}</h4>
                                <p className="text-xs font-semibold text-amber-600 mt-0.5">Rating: {rev.rating} Stars</p>
                                <p className="text-[11px] text-slate-500 font-medium italic">"{rev.comment}"</p>
                              </div>

                              <button
                                onClick={() => handleDeleteItem('review', rev.id)}
                                disabled={isDeletingItemId === rev.id}
                                className="bg-rose-50 hover:bg-rose-600 hover:text-white border border-rose-200 text-rose-600 font-bold text-xs px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>{isDeletingItemId === rev.id ? 'Deleting...' : 'Delete'}</span>
                              </button>
                            </div>
                          ))}
                        </>
                      ) : (
                        <div className="py-8 text-center text-xs text-slate-600 font-medium">
                          <p className="mb-3">No reviews submitted yet.</p>
                          <button
                            onClick={() => {
                              setManageSummaryModal(null);
                              setActiveSidebar('Reviews & Ratings');
                            }}
                            className="bg-[#0066FF] text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sm cursor-pointer"
                          >
                            Write Your First Review
                          </button>
                        </div>
                      )
                    )}

                    {manageSummaryModal === 'rooms' && (
                      roomBookings.length > 0 ? (
                        <div className="space-y-3">
                          {roomBookings.map((rm: any) => (
                            <div key={rm.id} className="bg-white/60 backdrop-blur-md border border-white/80 p-4 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-[#0A192F] text-sm">
                                    {String(rm.room_number || '').startsWith('Room') || String(rm.room_number || '').startsWith('Cabin') || String(rm.room_number || '').startsWith('ICU') || String(rm.room_number || '').startsWith('Ward') ? rm.room_number : `Room ${rm.room_number}`}
                                  </span>
                                  <span className="text-[10px] font-bold text-[#0066FF] bg-blue-50 px-2 py-0.5 rounded">
                                    {rm.ward || 'General Ward'}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-600 font-medium mt-1">
                                  {rm.hospital || 'Hospital Reservation'} • <span className="font-bold text-[#0A192F]">Dates: {rm.date_range}</span>
                                </p>
                                <p className="text-[11px] font-mono text-[#0066FF] font-extrabold mt-1">
                                  Serial: RM-SL-{rm.room_number || rm.id}
                                </p>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-full border border-emerald-300 inline-block">
                                  Confirmed
                                </span>
                                <p className="text-[10px] text-slate-400 font-medium mt-1">Hospital Record</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-8 text-center text-xs text-slate-600 font-medium">
                          No active room bookings recorded yet.
                        </div>
                      )
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/40 flex justify-end">
                    <button
                      onClick={() => setManageSummaryModal(null)}
                      className="bg-white/50 hover:bg-white/80 text-slate-700 font-bold text-xs px-5 py-2.5 rounded-xl transition-all border border-white/60"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        </DashboardErrorBoundary>
      </main>

      {/* Settings Modal (Includes Logout Option to return to Home Page) */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white/75 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-white/80 animate-scale-up">
            <div className="flex items-center justify-between mb-4 border-b border-white/40 pb-3">
              <h3 className="text-xl font-black text-[#0A192F] flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#0066FF]" />
                Account Settings
              </h3>
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 py-2">
              <div className="bg-blue-50/70 backdrop-blur-md border border-blue-100/80 rounded-2xl p-4 flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-[#0066FF] shrink-0" />
                <div>
                  <h4 className="font-extrabold text-sm text-[#0A192F]">{patientName}</h4>
                  <p className="text-xs text-slate-600">{user.email}</p>
                  <p className="text-[11px] font-mono text-[#0066FF] font-bold mt-0.5">UID: {patientUid}</p>
                </div>
              </div>

              <div className="border-t border-white/40 pt-4">
                <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">Account Actions</label>
                
                {/* Logout Button inside Settings */}
                <button
                  onClick={() => {
                    setIsSettingsModalOpen(false);
                    onLogout();
                  }}
                  className="w-full h-12 bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-rose-950/20 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>

            <div className="mt-4 text-center">
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                className="text-xs font-bold text-slate-500 hover:text-slate-700"
              >
                Close Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Hospital Modal */}
      {isAddHospModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white/75 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-white/80 animate-scale-up">
            <div className="flex items-center justify-between mb-4 border-b border-white/40 pb-3">
              <h3 className="text-xl font-black text-[#0A192F] flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#0066FF]" />
                Add New Hospital
              </h3>
              <button
                onClick={() => setIsAddHospModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {addHospMsg && (
              <div className="mb-4 text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 p-3 rounded-xl animate-pulse">
                {addHospMsg}
              </div>
            )}

            <form onSubmit={handleAddHospital} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Hospital Name</label>
                <input
                  type="text"
                  value={newHospName}
                  onChange={(e) => setNewHospName(e.target.value)}
                  placeholder="e.g. LabAid Specialized Hospital"
                  className="w-full h-11 px-3 rounded-xl border border-white/70 bg-white/50 backdrop-blur-md text-sm font-semibold text-[#0A192F] outline-none focus:bg-white/70"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Location / Area</label>
                <input
                  type="text"
                  value={newHospLocation}
                  onChange={(e) => setNewHospLocation(e.target.value)}
                  placeholder="e.g. Dhanmondi, Dhaka"
                  className="w-full h-11 px-3 rounded-xl border border-white/70 bg-white/50 backdrop-blur-md text-sm font-semibold text-[#0A192F] outline-none focus:bg-white/70"
                  required
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddHospModalOpen(false)}
                  className="w-1/2 h-11 bg-white/50 hover:bg-white/80 text-slate-700 font-bold text-xs rounded-xl border border-white/60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingHosp || !newHospName.trim()}
                  className="w-1/2 h-11 bg-[#0066FF] hover:bg-[#0055E0] text-white font-bold text-xs rounded-xl transition-all shadow-md disabled:opacity-50"
                >
                  {isAddingHosp ? 'Adding...' : 'Save Hospital'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Appointment Modal */}
      {isAppModalOpen && (() => {
        const checkChamberAvailableStatus = (docObj: any, hospName: string) => {
          let matchedChamber: any = null;
          const normHosp = (s: string) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const targetHospNorm = normHosp(hospName);

          if (docObj?.chambers && Array.isArray(docObj.chambers)) {
            matchedChamber = docObj.chambers.find((c: any) => {
              const chHospNorm = normHosp(c.hospital);
              return chHospNorm === targetHospNorm || (chHospNorm && targetHospNorm && (chHospNorm.includes(targetHospNorm) || targetHospNorm.includes(chHospNorm)));
            });
          }

          // Check localStorage doctor profiles for dynamic doctor updates
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('medinet_doc_profile_') || key === 'medinet_doc_profile')) {
              try {
                const parsed = JSON.parse(localStorage.getItem(key) || '{}');
                const docNameClean = String(docObj?.name || docObj?.doctor_name || docName || '').toLowerCase().replace(/^dr[\.\s]*/i, '').replace(/[^a-z0-9]/g, '').trim();
                const parsedNameClean = String(parsed?.name || parsed?.doctor_name || '').toLowerCase().replace(/^dr[\.\s]*/i, '').replace(/[^a-z0-9]/g, '').trim();

                if (!docNameClean || !parsedNameClean || parsedNameClean.includes(docNameClean) || docNameClean.includes(parsedNameClean)) {
                  if (parsed.chambers && Array.isArray(parsed.chambers)) {
                    const found = parsed.chambers.find((c: any) => {
                      const chHospNorm = normHosp(c.hospital);
                      return chHospNorm === targetHospNorm || (chHospNorm && targetHospNorm && (chHospNorm.includes(targetHospNorm) || targetHospNorm.includes(chHospNorm)));
                    });
                    if (found) {
                      matchedChamber = found;
                      break;
                    }
                  }
                }
              } catch (e) {}
            }
          }

          if (matchedChamber && (matchedChamber.is_available === false || matchedChamber.is_available === 'false' || matchedChamber.is_available === 0 || matchedChamber.is_available === '0')) {
            return {
              isAvailable: false,
              reason: matchedChamber.unavailability_reason || 'Doctor is currently on leave / unavailable for this hospital chamber.'
            };
          }
          if (docObj && (docObj.is_available === false || docObj.is_available === 'false' || docObj.is_available === 0 || docObj.is_available === '0')) {
            return {
              isAvailable: false,
              reason: docObj.unavailability_reason || 'Doctor is currently unavailable for consultations.'
            };
          }
          return { isAvailable: true, reason: '' };
        };

        const chamberAvailInfo = checkChamberAvailableStatus(selectedDocForBooking, hospital);

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white/95 backdrop-blur-2xl rounded-3xl p-4 sm:p-5 max-w-md w-full shadow-2xl border border-white/80 max-h-[85vh] my-auto overflow-y-auto space-y-2.5">
              <div className="flex items-center justify-between mb-2 border-b border-slate-200/80 pb-2">
                <h3 className="text-base sm:text-lg font-black text-[#0A192F] flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#0066FF]" />
                  Book Doctor Appointment
                </h3>
                <button
                  onClick={() => setIsAppModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateAppointment} className="space-y-2.5 text-xs">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Doctor Name</label>
                  <input
                    type="text"
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white/70 backdrop-blur-md text-xs font-semibold text-[#0A192F] outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Specialty</label>
                  <input
                    type="text"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white/70 backdrop-blur-md text-xs font-semibold text-[#0A192F] outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Select Hospital Chamber</label>
                  <select
                    value={hospital}
                    onChange={(e) => {
                      const selectedH = e.target.value;
                      setHospital(selectedH);
                      const matchedChamber = selectedDocForBooking?.chambers?.find((c: any) => c.hospital === selectedH);
                      if (matchedChamber) {
                        setDocChamber(getLatestDoctorChamber(selectedDocForBooking?.name || docName, selectedH, matchedChamber.address || 'Building A, Room 302'));
                        setAppTime(matchedChamber.default_time || '10:30 AM');
                      } else {
                        let fallbackAddr = 'Building A, 3rd Floor, Room 302';
                        if (selectedH.includes('City Hospital')) {
                          fallbackAddr = 'Building A, 3rd Floor, Room 302';
                          setAppTime('10:30 AM');
                        } else if (selectedH.includes('Square Hospital')) {
                          fallbackAddr = 'Building B, 2nd Floor, Room 201';
                          setAppTime('02:30 PM');
                        } else if (selectedH.includes('Evercare Hospital')) {
                          fallbackAddr = 'Building C, 5th Floor, Room 501';
                          setAppTime('05:30 PM');
                        } else if (selectedH.includes('United Hospital')) {
                          fallbackAddr = 'Building A, 4th Floor, Room 402';
                          setAppTime('11:30 AM');
                        } else if (selectedH.includes('Dhaka Medical')) {
                          fallbackAddr = 'Building B, 4th Floor, Room 405';
                          setAppTime('04:30 PM');
                        }
                        setDocChamber(getLatestDoctorChamber(selectedDocForBooking?.name || docName, selectedH, fallbackAddr));
                      }
                    }}
                    className="w-full h-9.5 px-3 rounded-xl border border-blue-200 bg-white text-xs font-bold text-[#0A192F] outline-none cursor-pointer font-sans shadow-sm"
                  >
                    {(selectedDocForBooking?.chambers && selectedDocForBooking.chambers.length > 0) ? (
                      selectedDocForBooking.chambers.map((ch: any, idx: number) => {
                        const statusObj = checkChamberAvailableStatus(selectedDocForBooking, ch.hospital);
                        return (
                          <option key={`ch-opt-${idx}-${ch.hospital}`} value={ch.hospital}>
                            {ch.hospital} — {statusObj.isAvailable ? '🟢 Available' : '🔴 NOT AVAILABLE (On Leave)'}
                          </option>
                        );
                      })
                    ) : (
                      <>
                        <option value="City Hospital, Dhaka">City Hospital, Dhaka — 🟢 Available</option>
                        <option value="Dhaka Medical College Hospital">Dhaka Medical College Hospital — 🔴 NOT AVAILABLE (On Leave)</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Date (Calendar)</span>
                      {convertToIsoDate(appDate) < getTodayIsoString() && (
                        <span className="text-[10px] text-rose-600 font-extrabold">Invalid Date</span>
                      )}
                    </label>
                    <input
                      type="date"
                      min={getTodayIsoString()}
                      value={convertToIsoDate(appDate)}
                      onChange={(e) => setAppDate(e.target.value)}
                      className={`w-full h-9 px-3 rounded-xl border bg-white text-xs font-semibold text-[#0A192F] outline-none cursor-pointer ${
                        convertToIsoDate(appDate) < getTodayIsoString() ? 'border-rose-400 bg-rose-50' : 'border-slate-200'
                      }`}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Time</span>
                      <span className="text-[10px] text-[#0066FF] font-bold">12-Hr / 24-Hr</span>
                    </label>
                    <input
                      type="text"
                      value={appTime}
                      onChange={(e) => setAppTime(e.target.value)}
                      placeholder="e.g. 1:45 AM or 10:30 AM"
                      className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-[#0A192F] outline-none focus:border-blue-400"
                      required
                    />
                  </div>
                </div>

                {/* Selected Chamber Doctor Consultation Schedule Badge */}
                {(() => {
                  const currentChamber = selectedDocForBooking?.chambers?.find((c: any) => c.hospital === hospital) || selectedDocForBooking;
                  const schedText = currentChamber?.schedule || selectedDocForBooking?.schedule || 'Sat - Thu: 9:00 AM - 5:00 PM';
                  const timeValResult = validateTimeAgainstSchedule(appTime, schedText);
                  const isPastDateErr = convertToIsoDate(appDate) < getTodayIsoString();

                  return (
                    <div className="space-y-1.5">
                      <div className="bg-slate-100/90 border border-slate-200 rounded-xl p-2 flex items-center justify-between text-[11px]">
                        <span className="text-slate-600 font-semibold flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-[#0066FF]" /> Doctor Schedule:
                        </span>
                        <span className="font-extrabold text-[#0A192F] bg-white px-2 py-0.5 rounded border border-slate-200">
                          {schedText}
                        </span>
                      </div>

                      {isPastDateErr && (
                        <div className="bg-rose-50 border border-rose-200 p-2 rounded-xl text-xs text-rose-800 flex items-center gap-2 font-bold">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>Invalid Date: Cannot book an appointment in the past. Please select today or a future date.</span>
                        </div>
                      )}

                      {!timeValResult.isValid && !isPastDateErr && (
                        <div className="bg-amber-50 border border-amber-200 p-2 rounded-xl text-xs text-amber-900 flex items-center gap-2 font-bold">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>{timeValResult.warningMsg || `Selected time (${appTime}) is outside doctor's consultation hours.`}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div className="bg-blue-50/70 backdrop-blur-md border border-blue-200/70 rounded-2xl p-2.5 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-semibold">Auto Serial Number:</span>
                    <span className="font-mono font-black text-[#0066FF] bg-white px-2.5 py-0.5 rounded border border-blue-200">{appSerialNum}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-semibold">Doctor Chamber / Room:</span>
                    <span className="font-bold text-slate-800 truncate max-w-[190px]">{docChamber}</span>
                  </div>
                </div>

                {/* Display Warning Notice if Doctor is Not Available / On Leave for Selected Chamber */}
                {chamberAvailInfo.isAvailable ? (
                  <div className="bg-emerald-50 border border-emerald-200 p-2 rounded-2xl text-xs text-emerald-900 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Doctor Available for Consultation</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-700 border border-emerald-300">
                      Available
                    </span>
                  </div>
                ) : (
                  <div className="bg-rose-100/90 border-2 border-rose-300 p-2.5 rounded-2xl text-xs text-rose-950 space-y-1 shadow-sm">
                    <div className="flex items-center gap-1.5 font-extrabold text-rose-900 text-xs">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Doctor Not Available / On Leave</span>
                    </div>
                    <p className="font-bold text-rose-900 text-xs italic">
                      "{chamberAvailInfo.reason}"
                    </p>
                    <p className="text-[11px] text-rose-800 leading-tight font-medium">
                      Doctor has marked this chamber as unavailable. Appointment booking is currently disabled.
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-1.5">
                  <button
                    type="button"
                    onClick={() => setIsAppModalOpen(false)}
                    className="w-1/2 h-9.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingApp || !chamberAvailInfo.isAvailable || convertToIsoDate(appDate) < getTodayIsoString()}
                    className={`w-1/2 h-9.5 font-bold text-xs rounded-xl transition-all shadow-md ${
                      !chamberAvailInfo.isAvailable || convertToIsoDate(appDate) < getTodayIsoString()
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed border border-slate-300'
                        : 'bg-[#0066FF] hover:bg-[#0055E0] text-white disabled:opacity-50 cursor-pointer'
                    }`}
                  >
                    {isSavingApp ? 'Saving...' : !chamberAvailInfo.isAvailable ? 'Doctor Unavailable' : 'Confirm Booking'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Diagnostic Test Booking Modal */}
      {isDiagBookModalOpen && selectedDiagTest && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white/75 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-white/80">
            <div className="flex items-center justify-between mb-4 border-b border-white/40 pb-3">
              <h3 className="text-xl font-black text-[#0A192F] flex items-center gap-2">
                <TestTube className="w-5 h-5 text-[#0066FF]" />
                Book Diagnostic Test
              </h3>
              <button
                onClick={() => setIsDiagBookModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-cyan-50/70 backdrop-blur-md border border-cyan-200 rounded-2xl p-4 mb-4">
              <h4 className="font-extrabold text-sm text-[#0A192F]">{selectedDiagTest.name}</h4>
              <p className="text-xs text-slate-600 font-semibold mt-0.5">{selectedDiagTest.provider_hospital || 'Square Hospital, Dhaka'}</p>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-cyan-200/60 text-xs">
                <span className="font-bold text-[#0066FF]">Fee: ৳{selectedDiagTest.price}</span>
                <span className="font-bold text-slate-600">{selectedDiagTest.category || 'Diagnostic'}</span>
              </div>
            </div>

            <form onSubmit={handleConfirmDiagnosticBooking} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Preferred Test Date (Calendar)</span>
                  {convertToIsoDate(diagBookDate) < getTodayIsoString() && (
                    <span className="text-[10px] text-rose-600 font-extrabold">Invalid Date</span>
                  )}
                </label>
                <input
                  type="date"
                  min={getTodayIsoString()}
                  value={convertToIsoDate(diagBookDate)}
                  onChange={(e) => setDiagBookDate(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-[#0A192F] outline-none focus:bg-white cursor-pointer"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Patient Phone Number</label>
                <input
                  type="text"
                  value={diagUserPhone}
                  onChange={(e) => setDiagUserPhone(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-white/70 bg-white/50 backdrop-blur-md text-sm font-semibold text-[#0A192F] outline-none focus:bg-white/70"
                  required
                />
              </div>

              <div className="bg-blue-50/70 backdrop-blur-md border border-blue-200/70 rounded-2xl p-3.5 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-semibold">Auto Serial Number:</span>
                  <span className="font-mono font-black text-[#0066FF] bg-white/80 px-2.5 py-0.5 rounded border border-blue-200">Auto Generated</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-semibold">Test Floor &amp; Room:</span>
                  <span className="font-bold text-slate-800">{selectedDiagTest.test_location || 'Diagnostic Wing, Floor 2, Room 204'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDiagBookModalOpen(false)}
                  className="w-1/2 h-11 bg-white/50 hover:bg-white/80 text-slate-700 font-bold text-xs rounded-xl border border-white/60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingDiagBooking}
                  className="w-1/2 h-11 bg-[#0066FF] hover:bg-[#0055E0] text-white font-bold text-xs rounded-xl transition-all shadow-md disabled:opacity-50"
                >
                  {isSavingDiagBooking ? 'Booking...' : 'Confirm Diagnostic'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Prescription Upload Modal */}
      {isPrescUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white/75 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-white/80">
            <div className="flex items-center justify-between mb-4 border-b border-white/40 pb-3">
              <h3 className="text-xl font-black text-[#0A192F] flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#0066FF]" />
                Upload Prescription Image
              </h3>
              <button
                onClick={() => setIsPrescUploadModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePrescription} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Prescription Title</label>
                <input
                  type="text"
                  value={prescTitle}
                  onChange={(e) => setPrescTitle(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-white/70 bg-white/50 backdrop-blur-md text-sm font-semibold text-[#0A192F] outline-none focus:bg-white/70"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Doctor Name</label>
                <input
                  type="text"
                  value={prescDoctor}
                  onChange={(e) => setPrescDoctor(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-white/70 bg-white/50 backdrop-blur-md text-sm font-semibold text-[#0A192F] outline-none focus:bg-white/70"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hospital / Clinic</label>
                  <input
                    type="text"
                    value={prescHospital}
                    onChange={(e) => setPrescHospital(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-white/70 bg-white/50 backdrop-blur-md text-xs font-semibold text-[#0A192F] outline-none focus:bg-white/70"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Prescription Date</label>
                  <input
                    type="text"
                    value={prescDate}
                    onChange={(e) => setPrescDate(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-white/70 bg-white/50 backdrop-blur-md text-xs font-semibold text-[#0A192F] outline-none focus:bg-white/70"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Upload Prescription Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePrescImageUpload}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-[#0066FF] hover:file:bg-blue-100 cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPrescUploadModalOpen(false)}
                  className="w-1/2 h-11 bg-white/50 hover:bg-white/80 text-slate-700 font-bold text-xs rounded-xl border border-white/60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploadingPresc}
                  className="w-1/2 h-11 bg-[#0066FF] hover:bg-[#0055E0] text-white font-bold text-xs rounded-xl transition-all shadow-md disabled:opacity-50"
                >
                  {isUploadingPresc ? 'Uploading...' : 'Save Prescription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Prescription Image Lightbox Preview Modal */}
      {selectedPrescPreview && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full bg-slate-900/80 backdrop-blur-2xl rounded-3xl p-6 overflow-hidden border border-white/20 shadow-2xl flex flex-col items-center gap-4">
            <button
              onClick={() => setSelectedPrescPreview(null)}
              className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white rounded-full p-2 backdrop-blur-md transition-all cursor-pointer z-10"
            >
              <X className="w-6 h-6" />
            </button>
            <img 
              src={getPrescriptionImageDataUrl(selectedPrescPreview)} 
              alt="Prescription Document Preview" 
              className="max-h-[75vh] w-auto object-contain rounded-2xl bg-white shadow-md p-1" 
            />
            <button
              type="button"
              onClick={() => handleDownloadPrescription(selectedPrescPreview)}
              className="px-6 py-2.5 bg-[#0066FF] hover:bg-[#0055E0] text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" /> Download Prescription Image (PNG)
            </button>
          </div>
        </div>
      )}

      {/* Profile Edit Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white/90 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-white/80 max-h-[90vh] overflow-y-auto animate-scale-up">
            <div className="flex items-center justify-between mb-4 border-b border-white/40 pb-3">
              <h3 className="text-xl font-black text-[#0A192F] flex items-center gap-2">
                <User className="w-5 h-5 text-[#0066FF]" />
                Edit Profile Info
              </h3>
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Profile Picture Upload Section */}
              <div className="flex items-center gap-4 p-3.5 bg-blue-50/70 border border-blue-100 rounded-2xl">
                <div className="relative w-16 h-16 rounded-2xl bg-white border-2 border-[#0066FF] flex items-center justify-center text-[#0066FF] font-black text-xl overflow-hidden shrink-0 shadow-md">
                  {editProfileImage ? (
                    <img src={editProfileImage} alt="Profile Preview" className="w-full h-full object-cover" />
                  ) : (
                    patientName.charAt(0)
                  )}
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-[#0A192F] uppercase tracking-wider mb-1">
                    Profile Picture
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0066FF] bg-white border border-blue-200 px-3 py-1.5 rounded-xl cursor-pointer hover:bg-blue-50 transition-colors shadow-xs">
                      <Camera className="w-3.5 h-3.5" />
                      <span>{editProfileImage ? 'Change Photo' : 'Upload Photo'}</span>
                      <input type="file" accept="image/*" onChange={handleProfileImageUpload} className="hidden" />
                    </label>
                    {editProfileImage && (
                      <button
                        type="button"
                        onClick={() => setEditProfileImage('')}
                        className="text-xs font-semibold text-rose-500 hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Phone</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-white/70 bg-white/50 backdrop-blur-md text-sm font-semibold text-[#0A192F] outline-none focus:bg-white/70"
                />
              </div>

              {/* Step-by-Step Address Fields */}
              <div className="space-y-3 p-3.5 bg-blue-50/50 border border-blue-100 rounded-2xl">
                <p className="text-[11px] font-extrabold text-[#0066FF] uppercase tracking-wider">
                  Patient Address (Step-by-Step)
                </p>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">1. House &amp; Road Number</label>
                  <input
                    type="text"
                    placeholder="e.g. House 24, Road 5"
                    value={editRoad}
                    onChange={(e) => {
                      setEditRoad(e.target.value);
                      setEditAddress(`${e.target.value}, ${editArea}, ${editCity}`);
                    }}
                    className="w-full h-10 px-3 rounded-xl border border-white/80 bg-white text-xs font-semibold text-[#0A192F] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">2. Area / Neighborhood (Required for Doctor View)</label>
                  <input
                    type="text"
                    placeholder="e.g. Shantinagar / Dhanmondi"
                    value={editArea}
                    onChange={(e) => {
                      setEditArea(e.target.value);
                      setEditAddress(`${editRoad}, ${e.target.value}, ${editCity}`);
                    }}
                    className="w-full h-10 px-3 rounded-xl border border-blue-300 bg-white text-xs font-extrabold text-[#0066FF] outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">3. City / District</label>
                  <input
                    type="text"
                    placeholder="e.g. Dhaka"
                    value={editCity}
                    onChange={(e) => {
                      setEditCity(e.target.value);
                      setEditAddress(`${editRoad}, ${editArea}, ${e.target.value}`);
                    }}
                    className="w-full h-10 px-3 rounded-xl border border-white/80 bg-white text-xs font-semibold text-[#0A192F] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Blood Group</label>
                  <select
                    value={editBloodGroup}
                    onChange={(e) => setEditBloodGroup(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-white/70 bg-white/50 backdrop-blur-md text-sm font-semibold text-[#0A192F] outline-none focus:bg-white/70"
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-white/70 bg-white/50 backdrop-blur-md text-sm font-semibold text-[#0A192F] outline-none focus:bg-white/70"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="w-1/2 h-11 bg-white/50 hover:bg-white/80 text-slate-700 font-bold text-xs rounded-xl border border-white/60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="w-1/2 h-11 bg-[#0066FF] hover:bg-[#0055E0] text-white font-bold text-xs rounded-xl transition-all shadow-md disabled:opacity-50"
                >
                  {isSavingProfile ? 'Saving...' : 'Update Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Verified Visit Rating Modal */}
      {isRateModalOpen && selectedVisitToRate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white/75 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-white/80">
            <div className="flex items-center justify-between mb-4 border-b border-white/40 pb-3">
              <div>
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-[#0066FF] bg-blue-50 px-2 py-0.5 rounded mb-1">
                  Verified Visit Rating
                </span>
                <h3 className="text-lg font-black text-[#0A192F] tracking-tight">
                  {selectedVisitToRate.target_name}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {selectedVisitToRate.target_type === 'doctor' ? 'Doctor Visit' : 'Hospital Service'} • {selectedVisitToRate.service_date}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsRateModalOpen(false);
                  setSelectedVisitToRate(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {rateModalMsg && (
              <div className="mb-4 text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 p-3 rounded-xl animate-pulse">
                {rateModalMsg}
              </div>
            )}

            <form onSubmit={handleSubmitVerifiedVisitReview} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Select Star Rating</label>
                <div className="flex items-center gap-2 bg-amber-50/70 backdrop-blur-md p-3 rounded-xl border border-amber-200/60">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRateStarRating(star)}
                      className="p-1 cursor-pointer hover:scale-110 transition-transform"
                    >
                      <Star className={`w-7 h-7 ${star <= rateStarRating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} />
                    </button>
                  ))}
                  <span className="ml-auto text-xs font-black text-amber-700">{rateStarRating} Stars</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Your Feedback / Review Comment (Optional)</label>
                <textarea
                  rows={4}
                  value={rateComment}
                  onChange={(e) => setRateComment(e.target.value)}
                  placeholder={`Share your consultation experience with ${selectedVisitToRate.target_name}... (optional)`}
                  className="w-full p-3 rounded-xl border border-white/70 bg-white/50 backdrop-blur-md text-xs font-medium text-[#0A192F] outline-none focus:border-[#0066FF] focus:bg-white/70"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsRateModalOpen(false);
                    setSelectedVisitToRate(null);
                  }}
                  className="w-1/2 h-11 bg-white/50 hover:bg-white/80 text-slate-700 font-bold text-xs rounded-xl border border-white/60 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRate}
                  className="w-1/2 h-11 bg-[#0066FF] hover:bg-[#0055E0] text-white font-bold text-xs rounded-xl transition-all shadow-md disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>{isSubmittingRate ? 'Publishing...' : 'Publish Review'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
