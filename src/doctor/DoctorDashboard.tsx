import { useState, useEffect, useMemo } from 'react';
import { 
  Stethoscope, 
  Calendar, 
  Star, 
  LogOut, 
  CheckCircle2, 
  Clock, 
  Send, 
  Plus, 
  Building2, 
  ShieldCheck, 
  Search,
  MapPin,
  Award,
  X,
  User,
  Trash2,
  Sparkles,
  LayoutDashboard,
  FileText,
  Eye,
  MessageSquare,
  Zap,
  Bell,
  Camera
} from 'lucide-react';
import { getApiUrl } from '../utils/api.ts';

interface DoctorDashboardProps {
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  onLogout: () => void;
}

export function DoctorDashboard({ user, onLogout }: DoctorDashboardProps) {
  const getInitialDoctorTabFromUrl = (): string => {
    const hash = window.location.hash.toLowerCase();
    const path = window.location.pathname.toLowerCase();
    if (hash.includes('appointment') || path.includes('appointment')) return 'Appointment List';
    if (hash.includes('referral') || path.includes('referral')) return 'Doctor Referrals';
    if (hash.includes('schedule') || path.includes('schedule')) return 'Chamber & Schedule';
    if (hash.includes('review') || path.includes('review')) return 'Patient Reviews';
    if (hash.includes('profile') || path.includes('profile')) return 'Doctor Profile';
    return 'Doctor Dashboard';
  };

  const [activeSidebar, setActiveSidebar] = useState<string>(getInitialDoctorTabFromUrl);

  useEffect(() => {
    const slugMap: Record<string, string> = {
      'Doctor Dashboard': 'Doctor-Dashboard',
      'Appointment List': 'Doctor-Appointments',
      'Doctor Referrals': 'Doctor-Referrals',
      'Chamber & Schedule': 'Doctor-Schedule',
      'Patient Reviews': 'Doctor-Reviews',
      'Doctor Profile': 'Doctor-Profile'
    };
    const slug = slugMap[activeSidebar] || 'Doctor-Dashboard';
    const newHash = `#/${slug}`;
    if (window.location.hash !== newHash) {
      window.history.pushState(null, '', `/Medinet/${newHash}`);
    }
  }, [activeSidebar]);

  useEffect(() => {
    const handleHashChange = () => {
      const tab = getInitialDoctorTabFromUrl();
      setActiveSidebar(tab);
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, []);

  // Doctor Profile State (Support Multiple Hospital Chambers)
  const [doctorProfile, setDoctorProfile] = useState<any>(() => {
    const saved = localStorage.getItem(`medinet_doc_profile_${user.id}`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      name: user.name || 'Dr. Tanhiad',
      phone: '+880 1711-889900',
      specialty: 'Neurosurgeon',
      education: 'MBBS (DMC), FCPS (Surgery), MS (Neurosurgery)',
      experience: '10+ Years',
      license_no: 'BMDC-99201',
      chambers: [
        {
          id: 1,
          hospital: 'Dhaka Medical College Hospital',
          address: 'Building A, 4th Floor, Room 405',
          schedule: 'Sat - Mon: 9:00 AM - 2:00 PM'
        },
        {
          id: 2,
          hospital: 'City Hospital, Dhaka',
          address: 'Building B, 2nd Floor, Room 208',
          schedule: 'Tue - Thu: 4:00 PM - 8:00 PM'
        }
      ]
    };
  });

  const [doctorInfo, setDoctorInfo] = useState<any>({
    name: doctorProfile.name || user.name || 'Dr. Tanhiad',
    specialty: doctorProfile.specialty || 'Neurosurgeon',
    hospital: doctorProfile.chambers?.[0]?.hospital || 'Dhaka Medical College Hospital',
    experience: doctorProfile.experience || '10+ Years',
    rating: 4.6,
    license_no: doctorProfile.license_no || 'BMDC-99201',
    chamber: doctorProfile.chambers?.[0]?.address || 'Building A, 4th Floor, Room 405',
    schedule: doctorProfile.chambers?.[0]?.schedule || 'Sat - Thu: 9:00 AM - 5:00 PM'
  });

  const [appointments, setAppointments] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  void hospitals;
  const [doctorsList, setDoctorsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  void isLoading;

  // Referral Modal State
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [refTargetDoctor, setRefTargetDoctor] = useState('');
  const [refDoctorSearchQuery, setRefDoctorSearchQuery] = useState('');
  const [refPatientName, setRefPatientName] = useState('');
  const [refPatientDetails, setRefPatientDetails] = useState('');
  const [refReason, setRefReason] = useState('');
  const [isSubmittingReferral, setIsSubmittingReferral] = useState(false);
  const [refMsg, setRefMsg] = useState('');

  // Doctor-to-Doctor Messaging Chat & Priority Queue State
  const [selectedRefForChat, setSelectedRefForChat] = useState<any | null>(null);
  const [refChatMessage, setRefChatMessage] = useState('');
  const [isSendingRefChat, setIsSendingRefChat] = useState(false);

  const handleSendReferralChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRefForChat || !refChatMessage.trim()) return;
    setIsSendingRefChat(true);

    try {
      const res = await fetch(getApiUrl('referrals.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_note',
          id: selectedRefForChat.id,
          note: refChatMessage,
          sender: doctorProfile.name || 'Dr. Tanhiad'
        })
      });

      const data = await res.json();
      setIsSendingRefChat(false);
      if (data.success && data.doctor_notes) {
        const updatedNotes = data.doctor_notes;
        setReferrals(prev => prev.map(r => r.id === selectedRefForChat.id ? { ...r, doctor_notes: updatedNotes } : r));
        setSelectedRefForChat((prev: any) => prev ? { ...prev, doctor_notes: updatedNotes } : null);
        setRefChatMessage('');
      }
    } catch (e) {
      setIsSendingRefChat(false);
    }
  };

  // Chamber Selection Modal State for Referrals
  const [selectedRefForChamberModal, setSelectedRefForChamberModal] = useState<any | null>(null);
  const [selectedChamberForRef, setSelectedChamberForRef] = useState<any | null>(null);

  // Doctor Referral Notification Popover State & Dismissal
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [dismissedNotifIds, setDismissedNotifIds] = useState<number[]>(() => {
    const saved = localStorage.getItem(`medinet_dismissed_notifs_${user.id}`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });

  const handleDismissNotification = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = [...dismissedNotifIds, id];
    setDismissedNotifIds(updated);
    localStorage.setItem(`medinet_dismissed_notifs_${user.id}`, JSON.stringify(updated));
  };

  const handleClearAllNotifications = () => {
    const allIds = referrals.map(r => r.id);
    setDismissedNotifIds(allIds);
    localStorage.setItem(`medinet_dismissed_notifs_${user.id}`, JSON.stringify(allIds));
  };

  const activeNotifications = referrals.filter(r => !dismissedNotifIds.includes(r.id));

  // Admin Room Shift Notification State for Doctor
  const [roomShiftNotifs, setRoomShiftNotifs] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('medinet_doctor_room_notifs') || '[]');
    } catch (e) {
      return [];
    }
  });

  const handleAcceptRoomShift = (notifId: number) => {
    const targetNotif = roomShiftNotifs.find(n => n.id === notifId);
    if (!targetNotif) return;

    const newChamberStr = targetNotif.new_chamber;
    const targetHospital = targetNotif.hospital || 'Dhaka Medical College Hospital';

    // Update Doctor Profile Chambers
    const existingChambers = doctorProfile.chambers || [];
    let updatedChambers = existingChambers.map((c: any) => {
      if (!targetHospital || c.hospital === targetHospital || c.id === 1) {
        return { ...c, address: newChamberStr };
      }
      return c;
    });

    if (!updatedChambers.some((c: any) => c.address === newChamberStr)) {
      updatedChambers = [
        ...updatedChambers,
        {
          id: Date.now(),
          hospital: targetHospital,
          address: newChamberStr,
          schedule: 'Sat - Thu: 9:00 AM - 5:00 PM'
        }
      ];
    }

    const updatedProfile = { ...doctorProfile, chambers: updatedChambers };
    setDoctorProfile(updatedProfile);
    setDoctorInfo((prev: any) => ({ ...prev, chamber: newChamberStr }));
    localStorage.setItem(`medinet_doc_profile_${user.id}`, JSON.stringify(updatedProfile));

    // Update notification status to Accepted
    const updatedNotifs = roomShiftNotifs.map(n => n.id === notifId ? { ...n, status: 'Accepted' } : n);
    setRoomShiftNotifs(updatedNotifs);
    localStorage.setItem('medinet_doctor_room_notifs', JSON.stringify(updatedNotifs));

    // Dispatch room shift notification for patient profile
    try {
      const roomNotifObj = {
        id: `room_shift_${Date.now()}`,
        doctor_name: targetNotif.doctor_name || doctorProfile.name || 'Dr. Tanhiad',
        hospital: targetHospital,
        new_chamber: newChamberStr,
        title: '📢 Doctor Chamber Room Shift Update',
        message: `📢 Doctor Chamber Update: ${targetNotif.doctor_name || doctorProfile.name}'s consultation chamber at ${targetHospital} has been updated to "${newChamberStr}".`,
        created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      const existingRoomNotifs = JSON.parse(localStorage.getItem('medinet_patient_room_notifs') || '[]');
      localStorage.setItem('medinet_patient_room_notifs', JSON.stringify([roomNotifObj, ...existingRoomNotifs]));
    } catch (e) {}

    alert(`✅ Chamber Room Shift Accepted! Your chamber location has been updated to: "${newChamberStr}".`);
  };

  const handleConfirmChamberSelection = async () => {
    if (!selectedRefForChamberModal) return;
    const refObj = selectedRefForChamberModal;
    const chosenChamber = selectedChamberForRef || doctorProfile.chambers?.[0] || { hospital: 'Dhaka Medical College Hospital', address: 'Building A, 4th Floor, Room 405' };
    const targetHospital = chosenChamber.hospital;
    const targetChamber = chosenChamber.address;

    try {
      const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const prioritySerial = `⚡ PRIORITY-${Math.floor(Math.random() * 80 + 10)}`;

      const newAppPayload = {
        action: 'create_appointment',
        doctor_name: doctorProfile.name || 'Dr. Tanhiad',
        specialty: doctorProfile.specialty || 'Neurosurgeon',
        hospital: targetHospital,
        appointment_date: todayStr,
        appointment_time: 'Priority Slot (Immediate)',
        serial_number: prioritySerial,
        patient_name: refObj.patient_name,
        doctor_chamber: targetChamber,
        status: 'Priority Queue'
      };

      await fetch(getApiUrl('patient_profile.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAppPayload)
      });

      await fetch(getApiUrl('referrals.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_status',
          id: refObj.id,
          status: 'Priority Queue',
          assigned_chamber: targetHospital,
          doctor_chamber: targetChamber
        })
      });

      // Update or insert in local appointments state
      setAppointments(prev => {
        const existingIdx = prev.findIndex(a => a.patient_name === refObj.patient_name);
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            hospital: targetHospital,
            doctor_chamber: targetChamber,
            status: 'Priority Queue'
          };
          return updated;
        } else {
          return [{ id: Date.now(), ...newAppPayload }, ...prev];
        }
      });

      // Update local referrals state
      setReferrals(prev => prev.map(r => r.id === refObj.id ? {
        ...r,
        status: 'Priority Queue',
        assigned_chamber: targetHospital,
        doctor_chamber: targetChamber
      } : r));

      setRefMsg(`⚡ ${refObj.patient_name} assigned to ${targetHospital} (${targetChamber}) & added to Priority Queue!`);
      setSelectedRefForChamberModal(null);
      setSelectedChamberForRef(null);
      setTimeout(() => setRefMsg(''), 5000);
    } catch (e) {
      console.error(e);
    }
  };

  // Chamber Filtering State
  const [selectedChamberFilter, setSelectedChamberFilter] = useState('All');

  // Patient Profile & History Modal State
  const [selectedPatientForProfile, setSelectedPatientForProfile] = useState<any | null>(null);
  const [patientPrescriptions, setPatientPrescriptions] = useState<any[]>([]);
  const [selectedPrescForDoctorView, setSelectedPrescForDoctorView] = useState<any | null>(null);
  const [isLoadingPatientProfile, setIsLoadingPatientProfile] = useState(false);

  // Write & Send Prescription Pad Modal State
  const [selectedPatientForPrescription, setSelectedPatientForPrescription] = useState<any | null>(null);
  const [prescDiagnosis, setPrescDiagnosis] = useState('');
  const [prescMedicines, setPrescMedicines] = useState<Array<{ id: number; name: string; dosage: string; duration: string }>>([
    { id: 1, name: 'Tab. Napa Extra 500mg', dosage: '1 + 0 + 1 (After Meal)', duration: '5 Days' }
  ]);
  const [prescAdvice, setPrescAdvice] = useState('Drink plenty of water, rest well, and follow up if symptoms persist.');
  const [isSubmittingPrescription, setIsSubmittingPrescription] = useState(false);
  const [prescMsg, setPrescMsg] = useState('');

  // Chamber Availability & Leave Reason State
  const [editingUnavailChamberId, setEditingUnavailChamberId] = useState<number | null>(null);
  const [tempUnavailReason, setTempUnavailReason] = useState('');

  // Add New Chamber State
  const [newHospName, setNewHospName] = useState('City Hospital, Dhaka');
  const [newRoomAddress, setNewRoomAddress] = useState('Building A, 3rd Floor, Room 302');
  const [newScheduleHours, setNewScheduleHours] = useState('Sat - Mon: 4:00 PM - 8:00 PM');

  // Helper: Toggle Chamber Availability & Save Reason
  const handleToggleChamberAvailability = (chamberId: number, targetAvailable: boolean, reasonStr: string = '') => {
    const updatedChambers = (doctorProfile.chambers || []).map((c: any) => {
      if (c.id === chamberId) {
        return {
          ...c,
          is_available: targetAvailable,
          unavailability_reason: targetAvailable ? '' : (reasonStr || 'Doctor is currently unavailable for two days.')
        };
      }
      return c;
    });

    const updatedProfile = { ...doctorProfile, chambers: updatedChambers };
    setDoctorProfile(updatedProfile);
    localStorage.setItem(`medinet_doc_profile_${user.id}`, JSON.stringify(updatedProfile));
    setEditingUnavailChamberId(null);
    setTempUnavailReason('');
  };

  // Appointment Completed Popup State
  const [completedAppPopup, setCompletedAppPopup] = useState<any | null>(null);

  const [doctorPhoto, setDoctorPhoto] = useState<string>(() => {
    return localStorage.getItem(`medinet_doc_photo_${user.id}`) || '';
  });

  const handleDoctorPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const photoUrl = reader.result as string;
        setDoctorPhoto(photoUrl);
        localStorage.setItem(`medinet_doc_photo_${user.id}`, photoUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  // Helper: Open Patient Profile & History Modal
  const handleOpenPatientProfile = async (patientApp: any) => {
    setSelectedPatientForProfile(patientApp);
    setIsLoadingPatientProfile(true);
    try {
      const pUserId = patientApp.user_id || 1;
      const res = await fetch(getApiUrl(`prescriptions.php?user_id=${pUserId}`));
      const data = await res.json();
      if (data.success && data.prescriptions) {
        setPatientPrescriptions(data.prescriptions);
      } else {
        setPatientPrescriptions([]);
      }
    } catch (e) {
      setPatientPrescriptions([]);
    } finally {
      setIsLoadingPatientProfile(false);
    }
  };

  // Helper: Open Write Prescription Modal
  const handleOpenPrescriptionModal = (patientApp: any) => {
    setSelectedPatientForPrescription(patientApp);
    setPrescDiagnosis('');
    setPrescMedicines([
      { id: 1, name: 'Tab. Napa Extra 500mg', dosage: '1 + 0 + 1 (After Meal)', duration: '5 Days' }
    ]);
    setPrescAdvice('Drink 2.5L water daily, take prescribed medicines after meals, follow up in 7 days.');
    setPrescMsg('');
  };

  const handleAddMedicineRow = () => {
    setPrescMedicines(prev => [
      ...prev,
      { id: Date.now(), name: '', dosage: '1 + 0 + 1 (After Meal)', duration: '7 Days' }
    ]);
  };

  const handleRemoveMedicineRow = (id: number) => {
    setPrescMedicines(prev => prev.filter(m => m.id !== id));
  };

  const handleUpdateMedicineRow = (id: number, field: string, value: string) => {
    setPrescMedicines(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const handleSendPrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientForPrescription) return;
    setIsSubmittingPrescription(true);
    setPrescMsg('');

    try {
      const validMedicines = prescMedicines.filter(m => m.name.trim() !== '');
      const payload = {
        user_id: selectedPatientForPrescription.user_id || 1,
        title: `Prescription from ${doctorProfile.name} (${selectedPatientForPrescription.hospital || 'Hospital'})`,
        doctor_name: doctorProfile.name || doctorInfo.name,
        hospital: selectedPatientForPrescription.hospital || doctorProfile.chambers?.[0]?.hospital || 'Hospital',
        date_str: selectedPatientForPrescription.appointment_date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        file_data: JSON.stringify({
          diagnosis: prescDiagnosis || 'General Clinical Evaluation',
          medicines: validMedicines,
          advice: prescAdvice,
          chamber: selectedPatientForPrescription.doctor_chamber,
          serial: selectedPatientForPrescription.serial_number,
          doctor_specialty: doctorProfile.specialty,
          doctor_license: doctorProfile.license_no
        })
      };

      const res = await fetch(getApiUrl('prescriptions.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setPrescMsg('✅ Prescription generated & automatically sent to patient profile!');
        setTimeout(() => {
          setSelectedPatientForPrescription(null);
          setPrescMsg('');
        }, 1400);
      } else {
        setPrescMsg(data.message || 'Failed to dispatch prescription.');
      }
    } catch (e) {
      setPrescMsg('Network error. Failed to dispatch prescription.');
    } finally {
      setIsSubmittingPrescription(false);
    }
  };

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchDoctorData();
    const interval = setInterval(() => {
      fetchDoctorData();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchDoctorData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch appointments for this doctor
      const appRes = await fetch(getApiUrl('appointments.php'));
      const appData = await appRes.json();
      if (appData.success && appData.appointments) {
        setAppointments(appData.appointments);
      }

      // 2. Fetch referrals
      const refRes = await fetch(getApiUrl('referrals.php'));
      const refData = await refRes.json();
      if (refData.success && refData.referrals) {
        setReferrals(refData.referrals);
      }

      // 3. Fetch reviews & doctors/hospitals
      const hospRes = await fetch(getApiUrl('hospitals.php'));
      const hospData = await hospRes.json();
      if (hospData.success) {
        if (hospData.doctors) setDoctorsList(hospData.doctors);
        if (hospData.hospitals) setHospitals(hospData.hospitals);
      }

      const revRes = await fetch(getApiUrl('reviews.php'));
      const revData = await revRes.json();
      if (revData.success && Array.isArray(revData.reviews)) {
        const normName = (s: string) => String(s || '').toLowerCase().replace(/^dr[\.\s]*/i, '').replace(/[^a-z0-9]/g, '').trim();
        const docNameNorm = normName(doctorProfile?.name || doctorInfo?.name || user.name || '');
        const docReviews = revData.reviews.filter((r: any) => {
          const type = String(r.target_type || '').toLowerCase();
          const isDocType = !type || type === 'doctor';
          if (!isDocType) return false;
          if (!r.target_name) return true;
          const tNameNorm = normName(r.target_name);
          if (!docNameNorm || !tNameNorm) return true;
          return tNameNorm.includes(docNameNorm) || docNameNorm.includes(tNameNorm);
        });
        setReviews(docReviews);
        if (docReviews.length > 0) {
          const sum = docReviews.reduce((acc: number, curr: any) => acc + (Number(curr.rating) || 5), 0);
          const avg = (sum / docReviews.length).toFixed(1);
          setDoctorInfo((prev: any) => ({ ...prev, rating: parseFloat(avg) }));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateAppointmentStatus = async (id: number, status: string) => {
    try {
      const res = await fetch(getApiUrl('appointments.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_status', id, status })
      });
      const data = await res.json();
      if (data.success) {
        setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
        if (status === 'Completed') {
          const targetApp = appointments.find(a => a.id === id);
          setCompletedAppPopup(targetApp || { id, patient_name: 'Patient' });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAssignChamberToAppointment = (appId: number, targetHospital: string, targetChamber: string) => {
    setAppointments(prev => prev.map(a => a.id === appId ? { ...a, hospital: targetHospital, doctor_chamber: targetChamber } : a));
  };
  void handleAssignChamberToAppointment;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem(`medinet_doc_profile_${user.id}`, JSON.stringify(doctorProfile));
    setDoctorInfo((prev: any) => ({
      ...prev,
      name: doctorProfile.name,
      specialty: doctorProfile.specialty,
      experience: doctorProfile.experience,
      license_no: doctorProfile.license_no
    }));
    alert("✅ Doctor profile updated successfully!");
  };

  const handleAddChamber = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHospName.trim() || !newRoomAddress.trim()) return;

    const newChamber = {
      id: Date.now(),
      hospital: newHospName.trim(),
      address: newRoomAddress.trim(),
      schedule: newScheduleHours.trim() || 'Sat - Thu: 9:00 AM - 5:00 PM'
    };

    const updatedChambers = [...(doctorProfile.chambers || []), newChamber];
    const updatedProfile = { ...doctorProfile, chambers: updatedChambers };
    setDoctorProfile(updatedProfile);
    localStorage.setItem(`medinet_doc_profile_${user.id}`, JSON.stringify(updatedProfile));
    setNewRoomAddress('');
  };

  const handleDeleteChamber = (chamberId: number) => {
    const updatedChambers = (doctorProfile.chambers || []).filter((c: any) => c.id !== chamberId);
    const updatedProfile = { ...doctorProfile, chambers: updatedChambers };
    setDoctorProfile(updatedProfile);
    localStorage.setItem(`medinet_doc_profile_${user.id}`, JSON.stringify(updatedProfile));
  };

  const handleCreateReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refTargetDoctor || !refPatientName || !refReason) {
      setRefMsg('Please fill in all required referral fields.');
      return;
    }
    setIsSubmittingReferral(true);
    setRefMsg('');
    try {
      const res = await fetch(getApiUrl('referrals.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_doctor: doctorProfile.name || doctorInfo.name,
          to_doctor: refTargetDoctor,
          patient_name: refPatientName,
          patient_details: refPatientDetails || 'General Patient',
          reason: refReason
        })
      });
      const data = await res.json();
      if (data.success) {
        setRefMsg('✅ Doctor referral submitted successfully!');
        if (data.referral) setReferrals(prev => [data.referral, ...prev]);
        setTimeout(() => {
          setIsReferralModalOpen(false);
          setRefPatientName('');
          setRefReason('');
          setRefMsg('');
        }, 1200);
      } else {
        setRefMsg(data.message || 'Failed to submit referral.');
      }
    } catch (e) {
      setRefMsg('Network connection error.');
    } finally {
      setIsSubmittingReferral(false);
    }
  };

  const doctorAppointments = useMemo(() => {
    if (!Array.isArray(appointments)) return [];
    const normName = (s: string) => String(s || '').toLowerCase().replace(/^dr[\.\s]*/i, '').replace(/[^a-z0-9]/g, '').trim();
    const currentDocNorm = normName(doctorProfile?.name || doctorInfo?.name || user.name || '');
    return appointments.filter((a: any) => {
      const aDocNorm = normName(a.doctor_name);
      return !currentDocNorm || !aDocNorm || aDocNorm.includes(currentDocNorm) || currentDocNorm.includes(aDocNorm);
    });
  }, [appointments, doctorProfile, doctorInfo, user]);

  const pendingAppointmentsCount = doctorAppointments.filter((a: any) => a.status !== 'Completed' && a.status !== 'Done' && a.status !== 'Cancelled').length;
  const completedAppointmentsCount = doctorAppointments.filter((a: any) => a.status === 'Completed' || a.status === 'Done').length;
  const doctorUid = `D-2026-${String(user.id || 12).padStart(5, '0')}`;

  const sidebarItems = [
    { id: 'Doctor Dashboard', label: 'Doctor Dashboard', icon: LayoutDashboard },
    { id: 'Appointment List', label: 'Appointment List', icon: Calendar, badge: pendingAppointmentsCount },
    { id: 'Doctor Referrals', label: 'Doctor Referrals', icon: Send, badge: referrals.length },
    { id: 'Chamber & Schedule', label: 'Chamber & Schedule', icon: Building2, count: doctorProfile.chambers?.length || 1 },
    { id: 'Patient Reviews', label: 'Patient Reviews', icon: Star, badge: reviews.length },
    { id: 'Doctor Profile', label: 'Doctor Profile', icon: User }
  ];

  return (
    <div className="min-h-screen bg-[url('/dashboard_bg.png')] bg-cover bg-center bg-fixed bg-no-repeat bg-[#eef5fc] font-['Plus_Jakarta_Sans',sans-serif] text-[#0A192F] flex flex-col lg:flex-row">
      {/* Semi-transparent Frosted Glass Sidebar */}
      <aside className="w-full lg:w-72 bg-white/45 backdrop-blur-md border-r border-white/50 p-6 flex flex-col justify-between shrink-0 shadow-xl shadow-blue-900/5">
        <div>
          {/* Brand Logo */}
          <div className="flex items-center gap-3 mb-8 select-none">
            <div className="w-10 h-10 rounded-2xl bg-[#0066FF] flex items-center justify-center text-white shadow-md shadow-blue-600/30">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-[#0A192F] block">MediConnect</span>
              <span className="text-[10px] font-extrabold text-[#0066FF] tracking-wider uppercase">Doctor Portal</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSidebar === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSidebar(item.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold transition-all cursor-pointer backdrop-blur-md ${
                    isActive 
                      ? 'bg-white/60 text-[#0066FF] font-extrabold shadow-md border border-white/80 scale-[1.02]' 
                      : 'text-slate-700 hover:text-[#0066FF] hover:bg-white/35 border border-transparent hover:border-white/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${isActive ? 'text-[#0066FF]' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-[#0066FF] text-white' : 'bg-blue-100 text-[#0066FF] border border-blue-200'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Sign Out Button */}
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50/70 border border-rose-200/50 transition-all cursor-pointer backdrop-blur-md mt-4 shadow-sm"
            >
              <LogOut className="w-5 h-5 text-rose-600 shrink-0" />
              <span>Sign Out</span>
            </button>
          </nav>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full space-y-6 overflow-x-hidden">
        {/* Persistent Top Header with Doctor Referral Notification Button */}
        <div className="bg-white/60 backdrop-blur-md border border-white/80 p-4 sm:px-6 rounded-2xl shadow-lg shadow-blue-900/5 flex items-center justify-between gap-4 relative z-30">
          <div>
            <h2 className="text-lg font-black text-[#0A192F] tracking-tight">{activeSidebar}</h2>
            <p className="text-xs text-slate-500 font-semibold">Welcome back, {doctorProfile?.name || 'Doctor'}</p>
          </div>

          <div className="flex items-center gap-3 relative">
            {/* Doctor Referral Notification Button */}
            <div className="relative">
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="relative px-3.5 py-2.5 bg-[#0066FF] hover:bg-[#0055E0] text-white rounded-2xl shadow-md transition-all cursor-pointer flex items-center gap-2"
                title="Doctor Referral Notifications"
              >
                <Bell className="w-4 h-4 text-white shrink-0" />
                <span className="hidden sm:inline text-xs font-extrabold">Referral Alerts</span>
                {activeNotifications.length > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full border border-white shadow-xs animate-pulse">
                    {activeNotifications.length}
                  </span>
                )}
              </button>

              {/* Referral Notification Popover */}
              {isNotifOpen && (
                <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white border border-slate-200 rounded-3xl shadow-2xl z-[100] p-4 space-y-3 animate-scale-up">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Send className="w-4 h-4 text-[#0066FF]" />
                      <h4 className="font-black text-sm text-[#0A192F]">Doctor Referral Alerts</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      {activeNotifications.length > 0 && (
                        <button
                          onClick={handleClearAllNotifications}
                          className="text-[10px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded-full transition-all cursor-pointer"
                        >
                          Clear All
                        </button>
                      )}
                      <span className="text-[10px] font-extrabold bg-blue-100 text-[#0066FF] px-2 py-0.5 rounded-full">
                        {activeNotifications.length} Unread
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {activeNotifications.length === 0 ? (
                      <div className="text-center py-6 space-y-1">
                        <Send className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="text-xs text-slate-500 font-bold">No unread referral alerts</p>
                      </div>
                    ) : (
                      activeNotifications.map((r: any) => (
                        <div
                          key={`notif-${r.id}`}
                          onClick={() => {
                            setActiveSidebar('Doctor Referrals');
                            setIsNotifOpen(false);
                          }}
                          className="p-3 bg-blue-50/70 hover:bg-blue-100 border border-blue-200/60 rounded-2xl transition-all cursor-pointer space-y-1 text-xs relative group"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-black text-[#0A192F]">{r.patient_name}</span>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                                r.status === 'Priority Queue'
                                  ? 'bg-purple-100 text-purple-800 border border-purple-300'
                                  : 'bg-amber-100 text-amber-900 border border-amber-300'
                              }`}>
                                {r.status || 'Incoming Referral'}
                              </span>
                              <button
                                onClick={(e) => handleDismissNotification(r.id, e)}
                                className="w-5 h-5 rounded-full bg-slate-200/80 hover:bg-rose-500 hover:text-white text-slate-500 flex items-center justify-center text-[11px] font-bold transition-all cursor-pointer"
                                title="Dismiss notification"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                          <p className="text-[11px] text-slate-600 font-medium pr-4">
                            Referred by <strong className="text-[#0066FF]">{r.from_doctor}</strong>: "{r.reason}"
                          </p>
                          {r.assigned_chamber && (
                            <p className="text-[10px] text-purple-700 font-extrabold flex items-center gap-1 mt-0.5">
                              <Building2 className="w-3 h-3" /> Chamber: {r.assigned_chamber}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setActiveSidebar('Doctor Referrals');
                      setIsNotifOpen(false);
                    }}
                    className="w-full py-2.5 bg-[#0066FF] hover:bg-[#0055E0] text-white font-extrabold text-xs rounded-xl transition-all text-center block shadow-md cursor-pointer"
                  >
                    View All Referrals in Panel →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Admin Chamber Shift Alert Banner for Doctor */}
        {roomShiftNotifs.filter((n: any) => n.status === 'Pending').map((n: any) => (
          <div key={`room-banner-${n.id}`} className="bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl p-4 sm:p-5 shadow-xl border border-amber-400/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-pulse">
            <div className="flex items-start gap-3">
              <Building2 className="w-6 h-6 text-yellow-200 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-black text-sm sm:text-base">🏥 Official Chamber Room Shift Notice from Hospital Admin</h4>
                <p className="text-xs text-amber-50 font-medium mt-0.5">
                  Admin requested your chamber to be shifted to: <strong className="underline text-white font-black">{n.new_chamber}</strong> at {n.hospital}.
                </p>
              </div>
            </div>
            <button
              onClick={() => handleAcceptRoomShift(n.id)}
              className="px-5 py-2.5 bg-white text-orange-700 hover:bg-amber-50 rounded-xl text-xs font-black shadow-md shrink-0 cursor-pointer transition-all active:scale-95 border border-white"
            >
              ✅ Accept & Shift My Chamber
            </button>
          </div>
        ))}

        {/* TAB 0: Doctor Dashboard Overview */}
        {activeSidebar === 'Doctor Dashboard' && (
          <div className="space-y-6 animate-fade-in">
            {/* Top Doctor Profile Header Card */}
            <header className="bg-white/45 backdrop-blur-md border border-white/60 p-6 rounded-2xl shadow-lg shadow-blue-900/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#0066FF]/10 border border-[#0066FF]/20 flex items-center justify-center text-[#0066FF] font-black text-xl shadow-sm overflow-hidden shrink-0">
                  {doctorPhoto ? (
                    <img src={doctorPhoto} alt={doctorProfile?.name} className="w-full h-full object-cover" />
                  ) : (
                    doctorProfile?.name?.charAt(0) || 'D'
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-extrabold text-[#0A192F] tracking-tight">{doctorProfile?.name}</h1>
                    <span className="bg-emerald-100 text-emerald-700 border border-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Doctor Panel
                    </span>
                    <span className="bg-blue-100 text-[#0066FF] border border-blue-200 text-xs px-2.5 py-0.5 rounded-full font-mono font-extrabold">
                      {doctorUid}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-600 mt-1 flex items-center gap-2">
                    <span>{doctorProfile?.specialty}</span> • <span>{doctorProfile?.chambers?.[0]?.hospital || 'Dhaka Medical College Hospital'}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-white/80 border border-white/90 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  <div>
                    <p className="text-[#0A192F] font-bold">Rating: {doctorInfo.rating} ⭐</p>
                    <p className="text-[10px] text-slate-500">{doctorProfile?.license_no}</p>
                  </div>
                </div>
              </div>
            </header>

            {/* Top 4 KPI Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white/45 backdrop-blur-md border border-white/60 rounded-2xl p-5 shadow-lg shadow-blue-900/5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-600 font-bold mb-1 uppercase tracking-wider">Today's Queue</p>
                  <h3 className="text-3xl font-black text-[#0A192F]">{appointments.length}</h3>
                  <p className="text-xs text-[#0066FF] font-bold mt-1">{pendingAppointmentsCount} Pending Consultations</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#0066FF]/10 border border-[#0066FF]/20 flex items-center justify-center text-[#0066FF]">
                  <Calendar className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white/45 backdrop-blur-md border border-white/60 rounded-2xl p-5 shadow-lg shadow-blue-900/5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-600 font-bold mb-1 uppercase tracking-wider">Doctor Referrals</p>
                  <h3 className="text-3xl font-black text-[#0A192F]">{referrals.length}</h3>
                  <p className="text-xs text-emerald-600 font-bold mt-1">Network Connected</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-600">
                  <Send className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white/45 backdrop-blur-md border border-white/60 rounded-2xl p-5 shadow-lg shadow-blue-900/5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-600 font-bold mb-1 uppercase tracking-wider">Completed</p>
                  <h3 className="text-3xl font-black text-[#0A192F]">{completedAppointmentsCount}</h3>
                  <p className="text-xs text-emerald-600 font-bold mt-1">Recorded</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white/45 backdrop-blur-md border border-white/60 rounded-2xl p-5 shadow-lg shadow-blue-900/5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-600 font-bold mb-1 uppercase tracking-wider">Doctor Rating</p>
                  <h3 className="text-3xl font-black text-amber-500">{doctorInfo.rating} ⭐</h3>
                  <p className="text-xs text-slate-600 font-bold mt-1">{reviews.length} Patient Reviews</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  <Star className="w-6 h-6" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: Appointment List Queue */}
        {activeSidebar === 'Appointment List' && (
          <div className="space-y-6 animate-fade-in">
            {/* Top Quick Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/45 backdrop-blur-md border border-white/60 p-6 rounded-2xl shadow-lg shadow-blue-900/5">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-[#0A192F] tracking-tight">Patient Appointment List Queue</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-[#0066FF]">
                    {pendingAppointmentsCount} Pending
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-600 mt-1">Manage consultation status, view patient serials, assign chambers, and dispatch prescriptions.</p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsReferralModalOpen(true)}
                  className="flex items-center gap-2 bg-[#0066FF] hover:bg-[#0055E0] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Doctor Referral</span>
                </button>
              </div>
            </div>

            {/* Hospital Chamber Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white/45 backdrop-blur-md border border-white/60 p-4 rounded-2xl shadow-lg shadow-blue-900/5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-extrabold text-[#0A192F] flex items-center gap-1.5 mr-1">
                  <Building2 className="w-4 h-4 text-[#0066FF]" />
                  Filter by Hospital Chamber:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedChamberFilter('All')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    selectedChamberFilter === 'All'
                      ? 'bg-[#0066FF] text-white shadow-md shadow-blue-600/20'
                      : 'bg-white/60 text-slate-700 hover:bg-white hover:text-[#0066FF] border border-white/80'
                  }`}
                >
                  All Chambers
                </button>
                {(doctorProfile.chambers || []).map((ch: any) => {
                  const isSelected = selectedChamberFilter.toLowerCase() === ch.hospital.toLowerCase();
                  return (
                    <button
                      key={`ch-filter-btn-${ch.id}`}
                      type="button"
                      onClick={() => setSelectedChamberFilter(ch.hospital)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#0066FF] text-white shadow-md shadow-blue-600/20'
                          : 'bg-white/60 text-slate-700 hover:bg-white hover:text-[#0066FF] border border-white/80'
                      }`}
                    >
                      {ch.hospital}
                    </button>
                  );
                })}
              </div>

              <span className="text-[11px] font-extrabold text-slate-500 bg-white/40 px-3 py-1 rounded-xl border border-white/50">
                Active Chamber: <strong className="text-[#0066FF]">{selectedChamberFilter}</strong>
              </span>
            </div>

            {/* Search and Queue List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#0A192F]">Live Patient Consultation Queue</h3>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search patient name or serial..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-white/45 backdrop-blur-md border border-white/60 rounded-xl text-xs text-[#0A192F] font-medium focus:outline-none focus:border-[#0066FF] shadow-sm"
                  />
                </div>
              </div>

              {doctorAppointments.filter((a: any) => a.status !== 'Completed' && a.status !== 'Done' && a.status !== 'Cancelled').length === 0 ? (
                <div className="bg-white/45 backdrop-blur-md border border-white/60 rounded-2xl p-10 text-center shadow-lg shadow-blue-900/5">
                  <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-sm font-bold text-[#0A192F]">No Active Patient Consultations Pending</p>
                  <p className="text-xs text-slate-500 mt-1">Appointments booked for {selectedChamberFilter === 'All' ? 'your chambers' : selectedChamberFilter} will appear here live.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {doctorAppointments
                    .filter((a: any) => a.status !== 'Completed' && a.status !== 'Done' && a.status !== 'Cancelled')
                    .filter((a: any) => selectedChamberFilter === 'All' || String(a.hospital || '').toLowerCase().includes(selectedChamberFilter.toLowerCase()))
                    .filter((a: any) => !searchQuery || String(a.patient_name || '').toLowerCase().includes(searchQuery.toLowerCase()) || String(a.serial_number || '').toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((app: any) => {
                      const isPriority = app.status === 'Priority Queue' || String(app.serial_number || '').includes('PRIORITY');
                      const cleanSerial = String(app.serial_number || 'SL-35')
                        .replace(/⚡\s*PRIORITY-/i, '⚡ P-')
                        .replace(/PRIORITY-/i, 'P-');
                      const patientArea = app.patient_area || app.area || 'Shantinagar';

                      return (
                        <div key={app.id} className="bg-white/45 backdrop-blur-md border border-white/60 hover:bg-white/60 rounded-2xl p-5 transition-all duration-200 shadow-md shadow-blue-900/5 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                          <div className="flex items-start gap-4 min-w-0 flex-1">
                            <div className={`h-11 min-w-[62px] px-3 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 shadow-xs ${
                              isPriority
                                ? 'bg-purple-100/90 border border-purple-300 text-purple-800'
                                : 'bg-[#0066FF]/10 border border-[#0066FF]/20 text-[#0066FF]'
                            }`}>
                              {cleanSerial}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-extrabold text-base text-[#0A192F] truncate">
                                  {app.patient_name ? app.patient_name.replace(/^Dr\.\s*/i, 'Patient ') : 'Patient User'}
                                </h4>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 ${
                                  isPriority
                                    ? 'bg-purple-100 text-purple-800 border border-purple-300'
                                    : app.status === 'Completed' 
                                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                                    : app.status === 'Cancelled'
                                    ? 'bg-rose-100 text-rose-700 border border-rose-300'
                                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                                }`}>
                                  {app.status || 'Confirmed'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 mt-1 flex items-center gap-2 font-medium">
                                <Calendar className="w-3.5 h-3.5 text-[#0066FF] shrink-0" />
                                <span>{app.appointment_date} at {app.appointment_time}</span>
                              </p>
                              
                              <div className="flex flex-wrap items-center gap-2.5 mt-2 text-[11px]">
                                <span className="font-bold text-slate-700 flex items-center gap-1 bg-white/70 px-2.5 py-0.5 rounded-md border border-slate-200/80">
                                  <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                                  Area: <strong className="text-[#0A192F] font-black">{patientArea}</strong>
                                </span>
                                
                                <span className="font-bold text-slate-700 flex items-center gap-1 bg-blue-50/80 px-2.5 py-0.5 rounded-md border border-blue-200/70">
                                  <Building2 className="w-3 h-3 text-[#0066FF] shrink-0" />
                                  Chamber: <strong className="text-[#0066FF] font-black">{app.hospital || doctorProfile.chambers?.[0]?.hospital || 'Dhaka Medical College Hospital'} {app.doctor_chamber ? `(${app.doctor_chamber})` : ''}</strong>
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 shrink-0 justify-start xl:justify-end">
                            {/* View Patient Profile & History */}
                            <button
                              onClick={() => handleOpenPatientProfile(app)}
                              className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-[#0066FF] border border-blue-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                              title="View patient profile and medical records"
                            >
                              <Eye className="w-4 h-4" />
                              <span>Patient Profile</span>
                            </button>

                            {/* Write & Send Prescription Pad */}
                            <button
                              onClick={() => handleOpenPrescriptionModal(app)}
                              className="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                              title="Write Rx Prescription"
                            >
                              <FileText className="w-4 h-4" />
                              <span>Rx Prescription</span>
                            </button>

                            {/* Mark Complete Button (Removes from Live Queue) */}
                            {app.status !== 'Completed' && (
                              <button
                                onClick={() => handleUpdateAppointmentStatus(app.id, 'Completed')}
                                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Mark Complete</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Doctor Referrals */}
        {activeSidebar === 'Doctor Referrals' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-white/45 backdrop-blur-md border border-white/60 p-5 rounded-2xl shadow-lg shadow-blue-900/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-[#0A192F] flex items-center gap-2">
                  <Send className="w-5 h-5 text-[#0066FF]" />
                  Doctor-to-Doctor Incoming Referrals
                </h3>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  Review patients referred to you by network specialists, inspect past prescriptions, communicate directly with referring doctors, and add patients to your priority appointment list.
                </p>
              </div>
            </div>

            {refMsg && (
              <div className="bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold px-4 py-3 rounded-xl flex items-center gap-2 shadow-sm animate-pulse">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{refMsg}</span>
              </div>
            )}

            {referrals.length === 0 ? (
              <div className="bg-white/45 backdrop-blur-md border border-white/60 rounded-2xl p-10 text-center shadow-lg shadow-blue-900/5">
                <Send className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-sm font-bold text-[#0A192F]">No Incoming Doctor Referrals Found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {referrals.map((ref) => {
                  const isPriority = ref.status === 'Priority Queue';
                  const normDocName = (name: string) => (name || '').toLowerCase().replace(/^dr[\.\s]*/i, '').trim();
                  const currentDocName = normDocName(doctorProfile.name || user.name || '');
                  const fromDocName = normDocName(ref.from_doctor || '');
                  const isReferringDoctor = Boolean(currentDocName && fromDocName && (fromDocName.includes(currentDocName) || currentDocName.includes(fromDocName)));

                  return (
                    <div key={ref.id} className={`bg-white/55 backdrop-blur-md border rounded-2xl p-5 shadow-lg shadow-blue-900/5 space-y-4 transition-all duration-200 ${
                      isPriority ? 'border-purple-300 ring-2 ring-purple-400/20 bg-purple-50/30' : 'border-white/70 hover:border-blue-300'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 ${
                          isPriority 
                            ? 'bg-purple-100 text-purple-800 border border-purple-300' 
                            : ref.status === 'Accepted'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : ref.status === 'Completed'
                            ? 'bg-teal-100 text-teal-800 border border-teal-300'
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}>
                          {isPriority && <Zap className="w-3 h-3 text-purple-600 shrink-0" />}
                          {ref.status || 'In Review'}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500">{ref.created_at ? new Date(ref.created_at).toLocaleDateString() : 'Recent'}</span>
                      </div>

                      <div className="space-y-2.5 text-xs">
                        <div className="bg-white/70 backdrop-blur-md p-3 rounded-xl border border-white/80">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Referred Patient:</p>
                          <h4 className="font-black text-[#0A192F] text-base mt-0.5">
                            {ref.patient_name} <span className="text-slate-500 text-xs font-semibold">({ref.patient_details || 'N/A'})</span>
                          </h4>
                        </div>

                        <div className="grid grid-cols-2 gap-2 bg-blue-50/70 border border-blue-100 p-3 rounded-xl">
                          <div>
                            <p className="text-[10px] font-bold text-slate-500">Referring Doctor:</p>
                            <p className="font-bold text-[#0A192F] truncate">{ref.from_doctor}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-500">Target Specialist:</p>
                            <p className="font-bold text-[#0066FF] truncate">{ref.to_doctor}</p>
                          </div>
                        </div>

                        <div>
                          <p className="text-[10px] font-bold text-slate-500">Reason for Referral &amp; Clinical Notes:</p>
                          <p className="text-slate-700 text-xs font-semibold bg-white/70 backdrop-blur-md p-3 rounded-xl border border-slate-200/80 mt-1 italic">
                            "{ref.reason}"
                          </p>
                        </div>

                        {/* Assigned Chamber Display on Referral Card */}
                        {(ref.assigned_chamber || ref.doctor_chamber) && (
                          <div className="bg-purple-50/80 border border-purple-200/80 p-2.5 rounded-xl flex items-center justify-between gap-2 text-xs text-purple-900 font-bold">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Building2 className="w-4 h-4 text-purple-600 shrink-0" />
                              <span className="truncate">Assigned Chamber: <strong className="text-[#0A192F]">{ref.assigned_chamber} {ref.doctor_chamber ? `(${ref.doctor_chamber})` : ''}</strong></span>
                            </div>
                          </div>
                        )}

                        {/* Doctor Notes & Communication History Thread */}
                        {ref.doctor_notes && (
                          <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl space-y-1">
                            <p className="text-[10px] font-extrabold text-slate-600 flex items-center gap-1 uppercase tracking-wider">
                              <MessageSquare className="w-3 h-3 text-[#0066FF]" />
                              Doctor Communication Thread:
                            </p>
                            <div className="text-[11px] text-slate-700 font-medium whitespace-pre-wrap max-h-24 overflow-y-auto pr-1">
                              {ref.doctor_notes}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons: 1. Patient Profile, 2. Message Doctor, 3. Priority Queue (Receiving Doctor Only) */}
                      <div className="pt-2 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <button
                          onClick={() => handleOpenPatientProfile({
                            patient_name: ref.patient_name,
                            user_id: ref.user_id || 1,
                            hospital: ref.from_doctor + ' Network Referral',
                            serial_number: 'REF-SL',
                            appointment_date: 'Referral Case',
                            patient_details: ref.patient_details
                          })}
                          className="px-2.5 py-2 bg-blue-50 hover:bg-blue-100 text-[#0066FF] border border-blue-200 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                          title="View patient profile and prescriptions history"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Profile &amp; Rx</span>
                        </button>

                        <button
                          onClick={() => setSelectedRefForChat(ref)}
                          className="px-2.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                          title="Send direct message to doctor"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Message Dr</span>
                        </button>

                        {isReferringDoctor ? (
                          <div
                            className="px-2.5 py-2 bg-slate-100/90 border border-slate-200/90 text-slate-500 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 cursor-not-allowed select-none opacity-85"
                            title="Referred Out: Only the receiving target specialist can add this patient to Priority Queue"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>Referred Out</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedRefForChamberModal(ref);
                              const matched = (doctorProfile.chambers || []).find((c: any) => c.hospital === ref.assigned_chamber);
                              setSelectedChamberForRef(matched || doctorProfile.chambers?.[0] || null);
                            }}
                            className={`px-2.5 py-2 rounded-xl text-[11px] font-extrabold transition-all flex items-center justify-center gap-1 shadow-sm cursor-pointer ${
                              isPriority
                                ? 'bg-purple-100 hover:bg-purple-200 text-purple-800 border border-purple-300'
                                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white'
                            }`}
                            title={isPriority ? "Change assigned chamber for priority queue patient" : "Select chamber & add patient to Priority Appointment Queue"}
                          >
                            <Zap className="w-3.5 h-3.5 shrink-0" />
                            <span>{isPriority ? '⚡ Change Chamber' : '+ Priority Queue'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Chamber & Schedule (Multiple Chambers Supported) */}
        {activeSidebar === 'Chamber & Schedule' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white/45 backdrop-blur-md border border-white/60 rounded-2xl p-6 shadow-lg shadow-blue-900/5">
              <div className="mb-6">
                <h3 className="text-lg font-black text-[#0A192F]">Doctor Chamber &amp; Multi-Hospital Consultation Schedules</h3>
                <p className="text-xs text-slate-600 font-medium mt-1">
                  Doctors can maintain multiple active chambers at different hospitals with separate rooms and visitation times.
                </p>
              </div>

              {/* Admin Room Shift Notices for this Doctor (Pending Only) */}
              {roomShiftNotifs.filter(n => n.status === 'Pending').length > 0 && (
                <div className="mb-6 p-4 bg-amber-50/90 border border-amber-200 rounded-2xl space-y-3">
                  <h4 className="font-extrabold text-sm text-amber-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-amber-600" />
                    Admin Chamber Shift Notices ({roomShiftNotifs.filter(n => n.status === 'Pending').length} Pending)
                  </h4>
                  <div className="space-y-2">
                    {roomShiftNotifs.filter(n => n.status === 'Pending').map(n => (
                      <div key={`tab-notif-${n.id}`} className="p-3 bg-white rounded-xl border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div>
                          <strong className="text-[#0A192F]">{n.hospital}</strong>: Shift room to <strong className="text-[#0066FF]">{n.new_chamber}</strong>
                          <p className="text-[11px] text-slate-500 mt-0.5">{n.notice}</p>
                        </div>
                        <button
                          onClick={() => handleAcceptRoomShift(n.id)}
                          className="px-4 py-2 bg-[#0066FF] hover:bg-[#0055E0] text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer shrink-0 transition-all active:scale-95"
                        >
                          Accept &amp; Change Chamber Room
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Existing Chambers Roster */}
              <div className="space-y-4 mb-8">
                <h4 className="text-sm font-extrabold text-[#0A192F] uppercase tracking-wider">Active Hospital Chambers</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(doctorProfile.chambers || []).map((ch: any) => (
                    <div key={ch.id} className="bg-white/60 backdrop-blur-md border border-white/80 p-5 rounded-2xl shadow-sm flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-[#0066FF]">
                            Hospital Chamber
                          </span>

                          <div className="flex items-center gap-2">
                            {ch.is_available === false ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700 border border-rose-300 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
                                Not Available (On Leave)
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-700 border border-emerald-300 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                Available
                              </span>
                            )}

                            {doctorProfile.chambers?.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleDeleteChamber(ch.id)}
                                className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                                title="Delete Chamber"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        <h5 className="font-extrabold text-base text-[#0A192F]">{ch.hospital}</h5>
                        <p className="text-xs font-bold text-[#0066FF] flex items-center gap-1.5 mt-1">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span>{ch.address}</span>
                        </p>
                        <p className="text-xs font-medium text-slate-600 flex items-center gap-1.5 mt-1">
                          <Clock className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span>{ch.schedule}</span>
                        </p>

                        {/* Display Patient Notice when Doctor is Not Available / On Leave */}
                        {ch.is_available === false && ch.unavailability_reason && (
                          <div className="mt-3 bg-rose-50/90 border border-rose-200 p-3 rounded-xl text-xs text-rose-900">
                            <p className="font-extrabold text-[10px] uppercase tracking-wider text-rose-700 flex items-center gap-1">
                              <span>⚠️ Patient Unavailability Notice:</span>
                            </p>
                            <p className="font-bold text-rose-950 mt-0.5 italic">"{ch.unavailability_reason}"</p>
                          </div>
                        )}
                      </div>

                      {/* Doctor Controls for Available / Not Available Toggle */}
                      <div className="pt-3 border-t border-slate-200/80">
                        {editingUnavailChamberId === ch.id ? (
                          <div className="space-y-2 bg-blue-50/80 p-3 rounded-xl border border-blue-100 text-xs">
                            <p className="font-extrabold text-[#0A192F]">Reason for Unavailability / Leave:</p>
                            <input
                              type="text"
                              placeholder="e.g. On leave for 2 days due to conference..."
                              value={tempUnavailReason}
                              onChange={(e) => setTempUnavailReason(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-xs font-semibold focus:outline-none"
                            />
                            <div className="flex justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setEditingUnavailChamberId(null)}
                                className="px-3 py-1.5 bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleChamberAvailability(ch.id, false, tempUnavailReason || 'Doctor is unavailable for two days.')}
                                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs shadow-sm"
                              >
                                Confirm Leave Status
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-extrabold text-slate-600">Manual Chamber Status:</span>
                            {ch.is_available === false ? (
                              <button
                                type="button"
                                onClick={() => handleToggleChamberAvailability(ch.id, true)}
                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
                              >
                                Set Available
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingUnavailChamberId(ch.id);
                                  setTempUnavailReason(ch.unavailability_reason || 'Not available for 2 days.');
                                }}
                                className="px-3.5 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 border border-rose-300 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
                              >
                                Mark Not Available / Leave
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add New Hospital Chamber Form */}
              <div className="bg-blue-50/70 backdrop-blur-md border border-blue-100 p-6 rounded-2xl">
                <h4 className="text-sm font-black text-[#0A192F] mb-3 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-[#0066FF]" />
                  Add New Hospital Chamber &amp; Room
                </h4>
                <form onSubmit={handleAddChamber} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Hospital Name</label>
                    <select
                      value={newHospName}
                      onChange={(e) => setNewHospName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-blue-200 rounded-xl font-semibold text-[#0A192F] outline-none"
                    >
                      <option value="City Hospital, Dhaka">City Hospital, Dhaka</option>
                      <option value="Square Hospital, Dhaka">Square Hospital, Dhaka</option>
                      <option value="Evercare Hospital, Dhaka">Evercare Hospital, Dhaka</option>
                      <option value="United Hospital, Dhaka">United Hospital, Dhaka</option>
                      <option value="Dhaka Medical College Hospital">Dhaka Medical College Hospital</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Chamber Room &amp; Building Address</label>
                    <input
                      type="text"
                      placeholder="e.g. Building B, 3rd Floor, Room 305"
                      value={newRoomAddress}
                      onChange={(e) => setNewRoomAddress(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-blue-200 rounded-xl font-semibold text-[#0A192F] outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Visiting Hours &amp; Days</label>
                    <input
                      type="text"
                      placeholder="e.g. Sat - Tue: 4:00 PM - 8:00 PM"
                      value={newScheduleHours}
                      onChange={(e) => setNewScheduleHours(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-blue-200 rounded-xl font-semibold text-[#0A192F] outline-none"
                      required
                    />
                  </div>

                  <div className="md:col-span-3 flex justify-end">
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-[#0066FF] hover:bg-[#0055E0] text-white font-bold rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" /> Save New Chamber
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Patient Reviews */}
        {activeSidebar === 'Patient Reviews' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-white/45 backdrop-blur-md border border-white/60 p-6 rounded-2xl shadow-lg shadow-blue-900/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-[#0A192F] flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
                  Patient Ratings &amp; Clinical Feedback
                </h3>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  Verified reviews and ratings submitted by patients for <strong className="text-[#0066FF]">{doctorProfile.name || doctorInfo.name}</strong>.
                </p>
              </div>

              {reviews.length > 0 && (
                <div className="bg-amber-50/90 border border-amber-200 px-4 py-2 rounded-2xl flex items-center gap-2 shrink-0 shadow-xs">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
                  <div>
                    <span className="text-sm font-black text-amber-800">
                      {(reviews.reduce((a, b) => a + (Number(b.rating) || 5), 0) / reviews.length).toFixed(1)} / 5.0
                    </span>
                    <span className="text-[10px] font-bold text-amber-700 block">({reviews.length} Patient Reviews)</span>
                  </div>
                </div>
              )}
            </div>

            {reviews.length === 0 ? (
              <div className="bg-white/45 backdrop-blur-md border border-white/60 rounded-3xl p-10 text-center shadow-lg shadow-blue-900/5 space-y-3">
                <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 text-amber-500 flex items-center justify-center mx-auto shadow-sm">
                  <Star className="w-8 h-8 fill-amber-400" />
                </div>
                <h4 className="text-base font-extrabold text-[#0A192F]">No Patient Reviews Yet</h4>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  When patients complete appointments with <strong className="text-[#0066FF]">{doctorProfile.name}</strong> and post ratings, their verified feedback will appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reviews.map((rev, idx) => (
                  <div key={rev.id || idx} className="bg-white/60 backdrop-blur-md border border-white/80 rounded-2xl p-5 shadow-md space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <h4 className="font-extrabold text-sm text-[#0A192F]">{rev.user_name || 'Patient'}</h4>
                          <span className="text-[10px] font-bold text-[#0066FF] bg-blue-50 px-2 py-0.5 rounded border border-blue-100 mt-0.5 inline-block">
                            Doctor: {rev.target_name || doctorProfile.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl shrink-0">
                          <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                          <span className="text-xs font-black text-amber-800">{rev.rating || 5} Stars</span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 font-medium italic bg-white/70 backdrop-blur-md p-3.5 rounded-xl border border-slate-200/60 mt-2">
                        "{rev.comment}"
                      </p>
                    </div>

                    <p className="text-[10px] text-slate-400 font-semibold text-right border-t border-slate-200/50 pt-2">
                      {rev.created_at ? new Date(rev.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently submitted'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: Doctor Profile */}
        {activeSidebar === 'Doctor Profile' && (
          <div className="bg-white/45 backdrop-blur-md border border-white/60 rounded-2xl p-6 sm:p-8 shadow-lg shadow-blue-900/5 space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/40 pb-5">
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 rounded-3xl bg-[#0066FF]/10 border-2 border-[#0066FF]/30 text-[#0066FF] flex items-center justify-center font-black text-3xl shadow-lg overflow-hidden shrink-0 group">
                  {doctorPhoto ? (
                    <img src={doctorPhoto} alt={doctorProfile?.name || 'Doctor'} className="w-full h-full object-cover" />
                  ) : (
                    (doctorProfile?.name || 'Doctor').charAt(0)
                  )}
                  <label className="absolute inset-0 bg-black/50 text-white flex flex-col items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-5 h-5" />
                    <span className="text-[10px] font-bold mt-1">Upload</span>
                    <input type="file" accept="image/*" onChange={handleDoctorPhotoUpload} className="hidden" />
                  </label>
                </div>

                <div>
                  <h3 className="text-2xl font-black text-[#0A192F] tracking-tight">{doctorProfile?.name || 'Dr. Tanhiad'}</h3>
                  <p className="text-xs font-bold text-[#0066FF] mt-0.5">{doctorProfile?.specialty || 'Neurosurgeon'} • {doctorProfile?.experience || '10+ Years'}</p>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{doctorProfile?.license_no || 'BMDC-99201'}</p>
                </div>
              </div>

              <label className="inline-flex items-center gap-2 bg-[#0066FF] hover:bg-[#0055E0] text-white font-bold text-xs px-5 py-3 rounded-xl transition-all shadow-md cursor-pointer shrink-0">
                <Camera className="w-4 h-4" />
                <span>{doctorPhoto ? 'Change Profile Photo' : 'Upload Profile Photo'}</span>
                <input type="file" accept="image/*" onChange={handleDoctorPhotoUpload} className="hidden" />
              </label>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Doctor Full Name</label>
                  <input
                    type="text"
                    value={doctorProfile?.name || ''}
                    onChange={(e) => setDoctorProfile({ ...doctorProfile, name: e.target.value })}
                    className="w-full h-11 px-3.5 bg-white/60 border border-white/80 rounded-xl font-semibold text-[#0A192F] outline-none focus:bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contact Phone Number</label>
                  <input
                    type="text"
                    value={doctorProfile?.phone || ''}
                    onChange={(e) => setDoctorProfile({ ...doctorProfile, phone: e.target.value })}
                    className="w-full h-11 px-3.5 bg-white/60 border border-white/80 rounded-xl font-semibold text-[#0A192F] outline-none focus:bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={doctorProfile?.email || user.email || ''}
                    onChange={(e) => setDoctorProfile({ ...doctorProfile, email: e.target.value })}
                    className="w-full h-11 px-3.5 bg-white/60 border border-white/80 rounded-xl font-semibold text-[#0A192F] outline-none focus:bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">BMDC License / Registration No.</label>
                  <input
                    type="text"
                    value={doctorProfile?.license_no || ''}
                    onChange={(e) => setDoctorProfile({ ...doctorProfile, license_no: e.target.value })}
                    className="w-full h-11 px-3.5 bg-white/60 border border-white/80 rounded-xl font-semibold text-[#0A192F] outline-none focus:bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Medical Specialist Field</label>
                  <input
                    type="text"
                    value={doctorProfile?.specialty || ''}
                    onChange={(e) => setDoctorProfile({ ...doctorProfile, specialty: e.target.value })}
                    className="w-full h-11 px-3.5 bg-white/60 border border-white/80 rounded-xl font-semibold text-[#0A192F] outline-none focus:bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Experience Years</label>
                  <input
                    type="text"
                    value={doctorProfile?.experience || ''}
                    onChange={(e) => setDoctorProfile({ ...doctorProfile, experience: e.target.value })}
                    className="w-full h-11 px-3.5 bg-white/60 border border-white/80 rounded-xl font-semibold text-[#0A192F] outline-none focus:bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Consultation Fee</label>
                  <input
                    type="text"
                    value={doctorProfile?.fee || '1000 BDT'}
                    onChange={(e) => setDoctorProfile({ ...doctorProfile, fee: e.target.value })}
                    className="w-full h-11 px-3.5 bg-white/60 border border-white/80 rounded-xl font-semibold text-[#0A192F] outline-none focus:bg-white"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Education &amp; Qualifications</label>
                  <input
                    type="text"
                    value={doctorProfile?.education || ''}
                    onChange={(e) => setDoctorProfile({ ...doctorProfile, education: e.target.value })}
                    className="w-full h-11 px-3.5 bg-white/60 border border-white/80 rounded-xl font-semibold text-[#0A192F] outline-none focus:bg-white"
                    placeholder="e.g. MBBS (DMC), FCPS (Surgery), MS (Neurosurgery)"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Clinical Biography &amp; Professional Summary</label>
                  <textarea
                    rows={3}
                    value={doctorProfile?.bio || 'Senior Specialist and Consultant Neurosurgery with over 10 years of clinical experience in advanced brain and spinal surgeries.'}
                    onChange={(e) => setDoctorProfile({ ...doctorProfile, bio: e.target.value })}
                    className="w-full p-3.5 bg-white/60 border border-white/80 rounded-xl font-semibold text-[#0A192F] outline-none focus:bg-white"
                    placeholder="Write clinical bio..."
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-white/40 flex items-center justify-between">
                <p className="text-slate-500 font-medium text-xs">All updates are saved locally and synced across MediConnect portal.</p>
                <button
                  type="submit"
                  className="px-8 py-3 bg-[#0066FF] hover:bg-[#0055E0] text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all"
                >
                  Save Doctor Profile
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* APPOINTMENT COMPLETED POPUP MODAL */}
      {completedAppPopup && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white/85 backdrop-blur-2xl border border-white/90 rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-400 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
              <Sparkles className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-black text-[#0A192F]">Appointment Completed!</h3>
              <p className="text-xs text-slate-600 font-medium mt-1">
                Consultation for <span className="font-extrabold text-[#0066FF]">{completedAppPopup.patient_name || 'Patient'}</span> has been recorded as complete.
              </p>
              <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl mt-3 text-left">
                <p className="text-[11px] font-bold text-[#0066FF] flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                  <span>Automated Rating &amp; Review Triggered</span>
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                  An automated feedback &amp; rating prompt has been sent to the patient for this visit.
                </p>
              </div>
            </div>

            <button
              onClick={() => setCompletedAppPopup(null)}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
            >
              Done / Close
            </button>
          </div>
        </div>
      )}

      {/* CREATE REFERRAL MODAL (With Doctor Search & Scroll Safety) */}
      {isReferralModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white/95 backdrop-blur-2xl border border-white/90 rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-4 shadow-2xl max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-[#0066FF]" />
                <h3 className="font-black text-lg text-[#0A192F]">Create Doctor Referral</h3>
              </div>
              <button 
                onClick={() => setIsReferralModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {refMsg && (
              <p className={`text-xs p-3 rounded-xl font-bold ${refMsg.includes('✅') ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'}`}>
                {refMsg}
              </p>
            )}

            <form onSubmit={handleCreateReferral} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#0A192F] mb-1">Target Specialist Doctor</label>
                
                {refTargetDoctor ? (
                  <div className="flex items-center justify-between bg-blue-50 border border-blue-200 p-3 rounded-xl">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Selected Specialist:</p>
                      <p className="font-extrabold text-[#0066FF] text-xs">{refTargetDoctor}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRefTargetDoctor('')}
                      className="text-slate-400 hover:text-rose-500 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search doctor by name, specialty, or hospital..."
                        value={refDoctorSearchQuery}
                        onChange={(e) => setRefDoctorSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2 bg-white border border-blue-200 rounded-xl text-xs text-[#0A192F] font-semibold outline-none focus:border-[#0066FF]"
                      />
                    </div>

                    <div className="max-h-32 overflow-y-auto space-y-1 border border-slate-200 rounded-xl p-1.5 bg-white">
                      {[
                        ...doctorsList,
                        { id: 101, name: 'Dr. Nusrat Jahan', specialty: 'Cardiologist', hospital: 'City Hospital, Dhaka' },
                        { id: 102, name: 'Dr. Ahmed Rahman', specialty: 'Neurologist', hospital: 'Square Hospital, Dhaka' },
                        { id: 103, name: 'Dr. Farhana Islam', specialty: 'Pediatrician', hospital: 'Evercare Hospital, Dhaka' },
                        { id: 104, name: 'Dr. Shakil Ahmed', specialty: 'Orthopedic Surgeon', hospital: 'United Hospital, Dhaka' },
                        { id: 105, name: 'Dr. Tawhidul Islam', specialty: 'General Physician', hospital: 'Dhaka Medical College Hospital' }
                      ]
                        .filter((d, index, self) => index === self.findIndex((t) => t.name === d.name))
                        .filter(d => d.name !== doctorProfile.name)
                        .filter(d => 
                          !refDoctorSearchQuery || 
                          d.name.toLowerCase().includes(refDoctorSearchQuery.toLowerCase()) ||
                          (d.specialty || '').toLowerCase().includes(refDoctorSearchQuery.toLowerCase()) ||
                          (d.hospital || '').toLowerCase().includes(refDoctorSearchQuery.toLowerCase())
                        )
                        .map((d) => (
                          <div
                            key={d.id || d.name}
                            onClick={() => setRefTargetDoctor(`${d.name} (${d.specialty} - ${d.hospital})`)}
                            className="p-2 hover:bg-blue-50 rounded-lg cursor-pointer transition-all flex items-center justify-between border border-transparent hover:border-blue-100"
                          >
                            <div>
                              <p className="font-extrabold text-xs text-[#0A192F]">{d.name}</p>
                              <p className="text-[10px] text-slate-500">{d.specialty} • {d.hospital}</p>
                            </div>
                            <span className="text-[10px] font-bold text-[#0066FF] bg-blue-100 px-2 py-0.5 rounded-full">
                              Select
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-[#0A192F] mb-1">Patient Name</label>
                <input
                  type="text"
                  placeholder="e.g. Rahim Hossain"
                  value={refPatientName}
                  onChange={(e) => setRefPatientName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-[#0A192F] font-semibold focus:border-[#0066FF] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-[#0A192F] mb-1">Patient Age &amp; Details</label>
                <input
                  type="text"
                  placeholder="e.g. 48 Male, Hypertension history"
                  value={refPatientDetails}
                  onChange={(e) => setRefPatientDetails(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-[#0A192F] font-semibold focus:border-[#0066FF] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[#0A192F] mb-1">Reason for Referral</label>
                <textarea
                  rows={3}
                  placeholder="Provide clinical reasons for specialized evaluation..."
                  value={refReason}
                  onChange={(e) => setRefReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-[#0A192F] font-semibold focus:border-[#0066FF] focus:outline-none resize-none"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsReferralModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReferral || !refTargetDoctor}
                  className="px-5 py-2.5 bg-[#0066FF] hover:bg-[#0055E0] text-white font-bold rounded-xl shadow-md disabled:opacity-50"
                >
                  {isSubmittingReferral ? 'Submitting...' : 'Send Referral'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW PATIENT PROFILE & MEDICAL HISTORY MODAL */}
      {selectedPatientForProfile && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-slate-200 text-[#0A192F] relative animate-fade-in">
            <button
              onClick={() => setSelectedPatientForProfile(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 text-[#0066FF] border border-blue-200 flex items-center justify-center font-black text-xl shadow-sm">
                {selectedPatientForProfile.patient_name?.charAt(0) || 'P'}
              </div>
              <div>
                <h3 className="text-lg font-black text-[#0A192F]">{selectedPatientForProfile.patient_name || 'Patient Profile'}</h3>
                <p className="text-xs text-[#0066FF] font-mono font-bold">{selectedPatientForProfile.serial_number || 'SL-35'} • {selectedPatientForProfile.hospital}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Appointment: {selectedPatientForProfile.appointment_date} at {selectedPatientForProfile.appointment_time}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
              <div className="col-span-2 bg-blue-50/80 border border-blue-100 p-3 rounded-xl flex items-center justify-between mb-1">
                <div>
                  <p className="text-[10px] font-extrabold text-[#0066FF] uppercase tracking-wider flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#0066FF]" />
                    Patient Area / Neighborhood:
                  </p>
                  <p className="font-black text-[#0A192F] text-sm mt-0.5">
                    {selectedPatientForProfile.patient_area || selectedPatientForProfile.area || 'Shantinagar, Dhaka'}
                  </p>
                </div>
                <span className="text-[10px] font-bold bg-white text-[#0066FF] px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs">
                  Area Only View
                </span>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase">Gender / Age</p>
                <p className="font-extrabold text-[#0A192F]">Female, 28 Yrs</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase">Blood Group</p>
                <p className="font-extrabold text-rose-600">O +ve</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase">Contact Phone</p>
                <p className="font-semibold text-[#0A192F]">+880 1711-445566</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase">Known Allergies</p>
                <p className="font-semibold text-slate-700">Dust, Penicillin</p>
              </div>
            </div>

            {/* Prescriptions History */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold text-[#0A192F] uppercase tracking-wider flex items-center justify-between">
                <span>Patient Prescription History</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-[#0066FF] text-[10px]">
                  {patientPrescriptions.length} Records
                </span>
              </h4>

              {isLoadingPatientProfile ? (
                <p className="text-xs text-slate-500 text-center py-4">Loading patient records...</p>
              ) : patientPrescriptions.length === 0 ? (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
                  No previous prescriptions recorded yet for this patient.
                </div>
              ) : (
                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                  {patientPrescriptions.map((pr: any) => (
                    <div key={pr.id} className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs space-y-2 hover:bg-slate-100/80 transition-all">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-[#0A192F]">{pr.title || 'Prescription'}</span>
                        <span className="text-[10px] font-medium text-slate-500">{pr.date_str}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] text-[#0066FF] font-medium truncate">{pr.doctor_name} ({pr.hospital})</p>
                        <button
                          type="button"
                          onClick={() => setSelectedPrescForDoctorView(pr)}
                          className="px-2.5 py-1 bg-[#0066FF] hover:bg-[#0055E0] text-white text-[11px] font-bold rounded-lg flex items-center gap-1 shrink-0 shadow-sm cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Brief</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-between gap-3 border-t border-slate-200">
              <button
                onClick={() => setSelectedPatientForProfile(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const targetApp = selectedPatientForProfile;
                  setSelectedPatientForProfile(null);
                  handleOpenPrescriptionModal(targetApp);
                }}
                className="px-5 py-2 bg-[#0066FF] hover:bg-[#0055E0] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>Write New Prescription</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WRITE & SEND PRESCRIPTION PAD MODAL (IMAGE 3 STYLED TEMPLATE) */}
      {selectedPatientForPrescription && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 text-[#0A192F] my-8 animate-fade-in relative">
            
            {/* Close Button */}
            <button
              onClick={() => setSelectedPatientForPrescription(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-100 transition-all"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Prescription Letterhead Header (Image 3 Style) */}
            <div className="border-b-2 border-blue-600 pb-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#0066FF] flex items-center justify-center text-white font-bold shadow-md">
                      <Stethoscope className="w-5 h-5" />
                    </div>
                    <span className="text-xl font-black text-[#0066FF] tracking-tight">MediConnect</span>
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1">Official Medical Prescription Pad</p>
                </div>

                <div className="text-right">
                  <h2 className="text-lg font-black text-[#0A192F]">{doctorProfile.name}</h2>
                  <p className="text-xs font-bold text-[#0066FF]">{doctorProfile.specialty}</p>
                  <p className="text-[11px] font-medium text-slate-600">{doctorProfile.education || 'MBBS, FCPS'}</p>
                  <p className="text-[10px] text-slate-500 font-mono">Reg: {doctorProfile.license_no}</p>
                </div>
              </div>

              {/* Hospital & Chamber Address */}
              <div className="mt-4 bg-blue-50/70 border border-blue-100 p-3 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <p className="font-extrabold text-[#0A192F]">{selectedPatientForPrescription.hospital}</p>
                  <p className="text-slate-600 text-[11px]">{selectedPatientForPrescription.doctor_chamber || 'Building A, Chamber Room'}</p>
                </div>
                <div className="text-right font-medium text-slate-600 text-[11px]">
                  <p><span className="font-bold text-[#0A192F]">Date:</span> {selectedPatientForPrescription.appointment_date || new Date().toLocaleDateString()}</p>
                  <p><span className="font-bold text-[#0A192F]">Time:</span> {selectedPatientForPrescription.appointment_time || '10:00 AM'}</p>
                </div>
              </div>
            </div>

            {/* Patient Details Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Patient Name</span>
                <span className="font-black text-[#0A192F]">{selectedPatientForPrescription.patient_name || 'Patient'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Serial No</span>
                <span className="font-mono font-extrabold text-[#0066FF]">{selectedPatientForPrescription.serial_number || 'SL-01'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Gender / Age</span>
                <span className="font-bold text-[#0A192F]">Female, 28 Yrs</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Status</span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full border border-emerald-300">Consultation</span>
              </div>
            </div>

            {prescMsg && (
              <div className={`p-3 rounded-xl text-xs font-bold ${prescMsg.includes('✅') ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'}`}>
                {prescMsg}
              </div>
            )}

            <form onSubmit={handleSendPrescription} className="space-y-5 text-xs">
              {/* Diagnosis / Clinical Findings */}
              <div>
                <label className="block font-extrabold text-[#0A192F] mb-1 uppercase tracking-wider text-[11px]">
                  Clinical Diagnosis &amp; Symptoms
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Mild Hypertension, Acute Tension Headache, Viral Fever..."
                  value={prescDiagnosis}
                  onChange={(e) => setPrescDiagnosis(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-medium text-[#0A192F] focus:border-[#0066FF] outline-none shadow-sm"
                  required
                />
              </div>

              {/* Rx Medicines List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-serif font-black text-[#0066FF] italic">Rx</span>
                    <span className="font-extrabold text-sm text-[#0A192F]">Prescribed Medications</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddMedicineRow}
                    className="flex items-center gap-1 text-xs font-bold text-[#0066FF] hover:bg-blue-50 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Medicine</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {prescMedicines.map((m) => (
                    <div key={m.id} className="grid grid-cols-12 gap-2 bg-slate-50 border border-slate-200 p-2.5 rounded-xl items-center">
                      <div className="col-span-5">
                        <input
                          type="text"
                          placeholder="Medicine Name (e.g. Tab. Napa 500mg)"
                          value={m.name}
                          onChange={(e) => handleUpdateMedicineRow(m.id, 'name', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:border-[#0066FF] outline-none"
                          required
                        />
                      </div>
                      <div className="col-span-4">
                        <input
                          type="text"
                          placeholder="Dosage (e.g. 1 + 0 + 1 After Meal)"
                          value={m.dosage}
                          onChange={(e) => handleUpdateMedicineRow(m.id, 'dosage', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:border-[#0066FF] outline-none"
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="text"
                          placeholder="Days (e.g. 7 Days)"
                          value={m.duration}
                          onChange={(e) => handleUpdateMedicineRow(m.id, 'duration', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:border-[#0066FF] outline-none"
                          required
                        />
                      </div>
                      <div className="col-span-1 text-center">
                        {prescMedicines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMedicineRow(m.id)}
                            className="text-rose-500 hover:text-rose-700 p-1"
                          >
                            <Trash2 className="w-4 h-4 mx-auto" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Special Advice / Instructions */}
              <div>
                <label className="block font-extrabold text-[#0A192F] mb-1 uppercase tracking-wider text-[11px]">
                  Special Advice &amp; Instructions
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Drink 3L water daily. Avoid cold drinks. Follow up after 7 days..."
                  value={prescAdvice}
                  onChange={(e) => setPrescAdvice(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-medium text-[#0A192F] focus:border-[#0066FF] outline-none shadow-sm"
                />
              </div>

              {/* Footer & Signature Box */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <div className="text-[11px] text-slate-500">
                  <p className="font-bold text-[#0A192F]">MediConnect Digital Rx System</p>
                  <p>Auto-dispatched to patient profile</p>
                </div>

                <div className="text-right border-t border-slate-400 pt-1 w-40">
                  <p className="font-bold text-xs text-[#0A192F]">{doctorProfile.name}</p>
                  <p className="text-[10px] text-slate-500 font-mono">Digital Signature Stamp</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedPatientForPrescription(null)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPrescription}
                  className="px-6 py-2.5 bg-[#0066FF] hover:bg-[#0055E0] text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/20 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmittingPrescription ? 'Sending...' : 'Send Prescription to Patient'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DOCTOR-TO-DOCTOR COMMUNICATION CHAT MODAL */}
      {selectedRefForChat && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white/95 backdrop-blur-2xl rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl border border-white/80 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
              <div>
                <h3 className="text-lg font-black text-[#0A192F] flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-[#0066FF]" />
                  Doctor Consultation Chat
                </h3>
                <p className="text-xs text-slate-600 font-medium">
                  Direct notes &amp; clinical communication regarding patient <span className="font-bold text-[#0A192F]">{selectedRefForChat.patient_name}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedRefForChat(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-blue-50/70 border border-blue-100 p-3 rounded-2xl space-y-1 text-xs">
              <div className="flex justify-between text-[11px] font-bold text-slate-600">
                <span>Referring Doctor: <strong className="text-[#0A192F]">{selectedRefForChat.from_doctor}</strong></span>
                <span>Receiving Doctor: <strong className="text-[#0066FF]">{selectedRefForChat.to_doctor}</strong></span>
              </div>
              <p className="text-[#0A192F] font-semibold text-xs italic border-t border-blue-200/60 pt-1 mt-1">
                "{selectedRefForChat.reason}"
              </p>
            </div>

            {/* Chat Messages Log Thread */}
            <div className="space-y-2 max-h-52 overflow-y-auto bg-slate-100/70 border border-slate-200/70 p-3.5 rounded-2xl text-xs">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">Message History Thread:</p>
              {selectedRefForChat.doctor_notes ? (
                <div className="whitespace-pre-wrap font-sans text-xs text-slate-800 space-y-1.5">
                  {selectedRefForChat.doctor_notes.split('\n').map((msgLine: string, idx: number) => (
                    <div key={`msg-line-${idx}`} className={`p-2.5 rounded-xl border ${
                      msgLine.includes(doctorProfile.name || 'Dr. Tanhiad')
                        ? 'bg-blue-100/90 border-blue-200 text-blue-950 font-medium ml-4'
                        : 'bg-white border-slate-200 text-slate-800 font-medium mr-4'
                    }`}>
                      {msgLine}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 italic text-center py-4">No previous messages in thread. Send a note to the referring doctor below.</p>
              )}
            </div>

            {/* Message Input Form */}
            <form onSubmit={handleSendReferralChat} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Type Note / Reply to Doctor</label>
                <textarea
                  rows={3}
                  value={refChatMessage}
                  onChange={(e) => setRefChatMessage(e.target.value)}
                  placeholder="e.g. Patient accepted. Added to tomorrow morning priority queue..."
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#0066FF]"
                  required
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedRefForChat(null)}
                  className="w-1/3 h-10 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isSendingRefChat || !refChatMessage.trim()}
                  className="w-2/3 h-10 bg-[#0066FF] hover:bg-[#0055E0] text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSendingRefChat ? 'Sending...' : 'Send Message to Doctor'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Select Hospital Chamber for Priority Referral */}
      {selectedRefForChamberModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-white/60 space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold shadow-xs">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-[#0A192F] text-base">Select Chamber for Referred Patient</h3>
                  <p className="text-xs text-slate-500 font-semibold">
                    Referred Patient: <strong className="text-purple-700">{selectedRefForChamberModal.patient_name}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRefForChamberModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-purple-50/70 border border-purple-100 p-3 rounded-2xl text-xs space-y-1">
              <p className="text-slate-700 font-semibold">
                Select one of your registered chambers below. This chamber will be saved for this patient's appointment list and upcoming doctor history.
              </p>
            </div>

            {/* Chamber List Options */}
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {(doctorProfile.chambers || []).map((ch: any, idx: number) => {
                const isSelected = selectedChamberForRef?.id === ch.id || (!selectedChamberForRef && idx === 0);
                return (
                  <div
                    key={`ref-ch-${ch.id || idx}`}
                    onClick={() => setSelectedChamberForRef(ch)}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? 'bg-purple-50/90 border-purple-600 shadow-md ring-2 ring-purple-400/20'
                        : 'bg-white border-slate-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="mt-0.5">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? 'border-purple-600 bg-purple-600' : 'border-slate-300'
                      }`}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </div>
                    <div className="flex-1 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-extrabold text-[#0A192F] text-sm">{ch.hospital}</h4>
                        {ch.is_available === false ? (
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-700 border border-rose-300 rounded-full text-[10px] font-bold">
                            🔴 Unavailable
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-full text-[10px] font-bold">
                            🟢 Available
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 font-medium flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>{ch.address}</span>
                      </p>
                      <p className="text-slate-500 text-[11px] font-medium flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#0066FF] shrink-0" />
                        <span>{ch.schedule || 'Sat - Thu: 9:00 AM - 5:00 PM'}</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedRefForChamberModal(null)}
                className="w-1/3 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmChamberSelection}
                className="w-2/3 h-11 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold text-xs rounded-2xl transition-all shadow-md shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm &amp; Allow Chamber</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DOCTOR PREVIEW MODAL FOR PATIENT-UPLOADED PRESCRIPTION (VIEW ONLY - MEDICAL POLICY) */}
      {selectedPrescForDoctorView && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 text-[#0A192F] animate-fade-in relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedPrescForDoctorView(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-100 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-[#0066FF] text-[10px] font-extrabold uppercase">
                  Patient Medical Record
                </span>
                <span className="text-xs font-bold text-slate-500">{selectedPrescForDoctorView.date_str}</span>
              </div>
              <h3 className="text-lg font-black text-[#0A192F] mt-1">
                {selectedPrescForDoctorView.title || 'Prescription Document'}
              </h3>
              <p className="text-xs text-[#0066FF] font-semibold">
                {selectedPrescForDoctorView.doctor_name} • {selectedPrescForDoctorView.hospital}
              </p>
            </div>

            {/* Medical Policy Disclaimer */}
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl flex items-center gap-2 text-xs text-amber-900 font-medium">
              <span className="text-amber-700 font-bold shrink-0">🔒 Medical Policy Notice:</span>
              <span>Doctors can view patient uploaded prescriptions, but <strong>downloading is restricted</strong>.</span>
            </div>

            {/* Document / Image Content Preview */}
            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 flex flex-col items-center justify-center min-h-48 max-h-[55vh] overflow-y-auto">
              {selectedPrescForDoctorView.file_data ? (
                selectedPrescForDoctorView.file_data.startsWith('data:image') || selectedPrescForDoctorView.file_data.startsWith('http') ? (
                  <img
                    src={selectedPrescForDoctorView.file_data}
                    alt={selectedPrescForDoctorView.title}
                    className="max-h-[48vh] w-auto object-contain rounded-xl shadow-md border border-slate-200"
                  />
                ) : (
                  <div className="w-full bg-white p-4 rounded-xl border border-slate-200 text-xs font-mono whitespace-pre-wrap text-slate-800">
                    {selectedPrescForDoctorView.file_data}
                  </div>
                )
              ) : (
                <div className="text-center text-xs text-slate-500 py-8">
                  <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p>No attached document image for this record.</p>
                </div>
              )}
            </div>

            {/* Footer Buttons (NO DOWNLOAD BUTTON FOR DOCTOR) */}
            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedPrescForDoctorView(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
