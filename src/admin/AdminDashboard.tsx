import { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, 
  Building2, 
  Stethoscope, 
  Calendar, 
  LogOut, 
  Activity,
  Camera,
  BedDouble,
  TestTube,
  Star,
  Volume2,
  CheckCircle2,
  User,
  MapPin,
  Send
} from 'lucide-react';
import { getApiUrl } from '../utils/api.ts';

interface AdminDashboardProps {
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  onLogout: () => void;
}

export function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const getInitialAdminTabFromUrl = (): string => {
    const hash = window.location.hash.toLowerCase();
    const path = window.location.pathname.toLowerCase();
    if (hash.includes('queue') || path.includes('queue')) return 'Patient Serial Queue';
    if (hash.includes('shift') || hash.includes('management') || path.includes('shift')) return 'Chamber & Diagnostic Rooms';
    if (hash.includes('room') || path.includes('room')) return 'Room Bookings';
    if (hash.includes('diagnostic') || path.includes('diagnostic')) return 'Diagnostic Services';
    if (hash.includes('review') || path.includes('review')) return 'Reviews & Ratings';
    if (hash.includes('profile') || path.includes('profile')) return 'Admin Profile';
    return 'Overview';
  };

  const [activeTab, setActiveTab] = useState<string>(getInitialAdminTabFromUrl);

  useEffect(() => {
    const slugMap: Record<string, string> = {
      'Overview': 'Admin-Dashboard',
      'Patient Serial Queue': 'Admin-Queue',
      'Room Bookings': 'Admin-Rooms',
      'Chamber & Diagnostic Rooms': 'Admin-Room-Management',
      'Diagnostic Services': 'Admin-Diagnostics',
      'Reviews & Ratings': 'Admin-Reviews',
      'Admin Profile': 'Admin-Profile'
    };
    const slug = slugMap[activeTab] || 'Admin-Dashboard';
    const newHash = `#/${slug}`;
    if (window.location.hash !== newHash) {
      window.history.pushState(null, '', `/Medinet/${newHash}`);
    }
  }, [activeTab]);

  useEffect(() => {
    const handleHashChange = () => {
      const tab = getInitialAdminTabFromUrl();
      setActiveTab(tab);
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, []);

  // Hospital Selection State
  // Master Data State
  const [hospitals, setHospitals] = useState<any[]>([]);
  void hospitals;
  const [doctors, setDoctors] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [diagnostics, setDiagnostics] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [dbRoomBookings, setDbRoomBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  void isLoading;

  // Active Selected Doctor for Serial Queue View
  const [selectedDoctorForQueue, setSelectedDoctorForQueue] = useState<string>('');

  // Call Out Toast State
  const [callOutMessage, setCallOutMessage] = useState<string>('');

  // Admin Profile State
  const [adminProfile, setAdminProfile] = useState<any>(() => {
    const saved = localStorage.getItem(`medinet_admin_profile_${user.id}`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      name: user.name || 'Admin Officer',
      email: user.email || 'admin@medinet.com',
      phone: '+880 1700-112233',
      hospital: 'Dhaka Medical College Hospital',
      role: 'Head Hospital Administrator',
      designation: 'Senior Medical Operations Officer'
    };
  });

  const selectedHospital = adminProfile.hospital || 'Dhaka Medical College Hospital';

  const [adminPhoto, setAdminPhoto] = useState<string>(() => {
    return localStorage.getItem(`medinet_admin_photo_${user.id}`) || '';
  });

  const handleAdminPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const photoUrl = reader.result as string;
        setAdminPhoto(photoUrl);
        localStorage.setItem(`medinet_admin_photo_${user.id}`, photoUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      const hospRes = await fetch(getApiUrl('hospitals.php'));
      const hospData = await hospRes.json();
      if (hospData.success) {
        if (hospData.hospitals) setHospitals(hospData.hospitals);
        if (hospData.doctors) setDoctors(hospData.doctors);
      }

      const appRes = await fetch(getApiUrl('appointments.php'));
      const appData = await appRes.json();
      if (appData.success && appData.appointments) {
        setAppointments(appData.appointments);
      }

      const diagRes = await fetch(getApiUrl('diagnostics.php'));
      const diagData = await diagRes.json();
      if (diagData.success && diagData.recentBookings) {
        setDiagnostics(diagData.recentBookings);
      }

      const revRes = await fetch(getApiUrl('reviews.php'));
      const revData = await revRes.json();
      if (revData.success && revData.reviews) {
        setReviews(revData.reviews);
      }

      const adminRes = await fetch(getApiUrl('admin.php'));
      const adminData = await adminRes.json();
      if (adminData.success && adminData.roomBookings) {
        setDbRoomBookings(adminData.roomBookings);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
    const interval = setInterval(() => {
      fetchAdminData();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const adminUid = `A-2026-${String(user.id || 1).padStart(5, '0')}`;

  const filteredDoctors = doctors.filter((d: any) => 
    !selectedHospital || selectedHospital === 'All' || d.hospital === selectedHospital
  );

  useEffect(() => {
    if (filteredDoctors.length > 0 && !filteredDoctors.some((d: any) => d.name === selectedDoctorForQueue)) {
      setSelectedDoctorForQueue(filteredDoctors[0].name);
    }
  }, [selectedHospital, filteredDoctors]);

  const normStr = (s: string) => String(s || '').toLowerCase().replace(/^dr[\.\s]*/i, '').replace(/[^a-z0-9]/g, '').trim();

  const hospitalAppointments = appointments.filter((a: any) => {
    const appHospNorm = normStr(a.hospital);
    const selectedHospNorm = normStr(selectedHospital);
    const docNameNorm = normStr(a.doctor_name);
    const isDocInSelectedHosp = doctors.some((d: any) => {
      const dNameNorm = normStr(d.name || d.doctor_name);
      const dHospNorm = normStr(d.hospital);
      return (dNameNorm.includes(docNameNorm) || docNameNorm.includes(dNameNorm)) &&
             (!selectedHospital || selectedHospital === 'All' || dHospNorm.includes(selectedHospNorm) || selectedHospNorm.includes(dHospNorm));
    });
    const isHospMatch = !selectedHospital || selectedHospital === 'All' || appHospNorm === selectedHospNorm || appHospNorm.includes(selectedHospNorm) || selectedHospNorm.includes(appHospNorm) || isDocInSelectedHosp;
    const st = String(a.status || '').toLowerCase().trim();
    return isHospMatch && st !== 'completed' && st !== 'done' && st !== 'cancelled';
  });

  // Deduplicate strictly by unique appointment ID
  const uniqueHospitalAppointments = hospitalAppointments.reduce((acc: any[], current: any) => {
    const isDup = acc.some(item => String(item.id) === String(current.id));
    if (!isDup) acc.push(current);
    return acc;
  }, []);

  const activeDoctorQueue = uniqueHospitalAppointments.filter((a: any) => {
    if (!selectedDoctorForQueue) return true;
    const appDocNorm = normStr(a.doctor_name);
    const selectedDocNorm = normStr(selectedDoctorForQueue);
    return appDocNorm === selectedDocNorm || (appDocNorm && selectedDocNorm && (appDocNorm.includes(selectedDocNorm) || selectedDocNorm.includes(appDocNorm)));
  });

  const activeDiagnostics = useMemo(() => {
    if (!Array.isArray(diagnostics)) return [];
    return diagnostics.filter(d => {
      const st = String(d.status || '').toLowerCase().trim();
      return st !== 'completed' && st !== 'done' && st !== 'cancelled';
    });
  }, [diagnostics]);

  const allQueueDoctors = useMemo(() => {
    const list: any[] = [...filteredDoctors];
    const seenNames = new Set(filteredDoctors.map(d => normStr(d.name || d.doctor_name)));

    if (Array.isArray(appointments)) {
      appointments.forEach((ap: any) => {
        const dName = ap.doctor_name;
        const normD = normStr(dName);
        const st = String(ap.status || '').toLowerCase().trim();
        if (dName && normD && !seenNames.has(normD) && st !== 'completed' && st !== 'done' && st !== 'cancelled') {
          const apHospNorm = normStr(ap.hospital);
          const selectedHospNorm = normStr(selectedHospital);
          if (!selectedHospital || selectedHospital === 'All' || apHospNorm === selectedHospNorm || apHospNorm.includes(selectedHospNorm) || selectedHospNorm.includes(apHospNorm)) {
            seenNames.add(normD);
            list.push({
              id: 'app_doc_' + normD,
              name: dName,
              doctor_name: dName,
              specialty: ap.specialty || 'Specialist',
              hospital: ap.hospital || selectedHospital
            });
          }
        }
      });
    }
    return list;
  }, [filteredDoctors, appointments, selectedHospital]);

  // Doctor Room Shift Notice State
  const [selectedDocForShift, setSelectedDocForShift] = useState<string>('');
  const [shiftBuilding, setShiftBuilding] = useState<string>('Building B');
  const [shiftFloor, setShiftFloor] = useState<string>('3rd Floor');
  const [shiftRoom, setShiftRoom] = useState<string>('Room 308');
  const [shiftMsgStatus, setShiftMsgStatus] = useState<string>('');
  const [roomNotifsList, setRoomNotifsList] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('medinet_doctor_room_notifs') || '[]');
    } catch (e) {
      return [];
    }
  });

  // Diagnostic Test Locations Master State
  const [diagMasterServices, setDiagMasterServices] = useState<any[]>(() => {
    const saved = localStorage.getItem(`medinet_admin_diag_master_${user.id}`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      { id: 1, name: 'Complete Blood Count (CBC)', category: 'Blood Test', hospital: 'Dhaka Medical College Hospital', location: 'Diagnostic Wing, 2nd Floor, Room 204' },
      { id: 2, name: 'Blood Sugar (HbA1c & Fasting)', category: 'Blood Test', hospital: 'Dhaka Medical College Hospital', location: 'Diagnostic Wing, 2nd Floor, Room 205' },
      { id: 3, name: 'Brain & Head MRI Scan (1.5T)', category: 'MRI Scan', hospital: 'Dhaka Medical College Hospital', location: 'Radiology Wing, Ground Floor, Room 102' },
      { id: 4, name: 'CT Scan of Brain & Head', category: 'CT Scan', hospital: 'Dhaka Medical College Hospital', location: 'Radiology Wing, Ground Floor, Room 104' },
      { id: 5, name: 'Chest Digital X-Ray (PA View)', category: 'X-Ray', hospital: 'Dhaka Medical College Hospital', location: 'Diagnostic Wing, 1st Floor, Room 112' },
      { id: 6, name: '2D Echo Cardiac Sonogram', category: 'Cardiology', hospital: 'Dhaka Medical College Hospital', location: 'Cardiology Wing, 3rd Floor, Room 301' }
    ];
  });

  // Handler to Send Room Shift Notice to Doctor
  const handleSendRoomShiftNotice = (e: React.FormEvent) => {
    e.preventDefault();
    const docNameTarget = selectedDocForShift || (filteredDoctors[0]?.name || 'Dr. Tanhiad');
    const newChamberStr = `${shiftBuilding}, ${shiftFloor}, ${shiftRoom}`;
    
    const noticeObj = {
      id: Date.now(),
      doctor_name: docNameTarget,
      hospital: selectedHospital,
      new_chamber: newChamberStr,
      building: shiftBuilding,
      floor: shiftFloor,
      room: shiftRoom,
      notice: `Official Chamber Reallocation Notice: Your consultation chamber at ${selectedHospital} has been updated to ${newChamberStr}. Please accept and confirm room shift in your profile.`,
      sent_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'Pending'
    };

    try {
      const existing = JSON.parse(localStorage.getItem('medinet_doctor_room_notifs') || '[]');
      const updated = [noticeObj, ...existing];
      localStorage.setItem('medinet_doctor_room_notifs', JSON.stringify(updated));
      setRoomNotifsList(updated);
      setShiftBuilding('');
      setShiftFloor('');
      setShiftRoom('');
      setShiftMsgStatus(`✅ Room shift notice successfully sent to ${docNameTarget}! Notification sent to Doctor.`);
      setTimeout(() => setShiftMsgStatus(''), 5000);
    } catch (err) {
      setShiftMsgStatus("❌ Failed to send notice.");
    }
  };

  // Handler for Admin to Directly Change Diagnostic Room / Location
  const handleUpdateDiagServiceLocation = (diagId: number) => {
    const targetService = diagMasterServices.find(s => s.id === diagId);
    if (!targetService) return;
    const currentLoc = targetService.location;
    const inputLoc = window.prompt(`Update Diagnostic Room / Location for "${targetService.name}":`, currentLoc);
    if (inputLoc !== null && inputLoc.trim()) {
      const updatedLoc = inputLoc.trim();
      setDiagMasterServices(prev => {
        const updated = prev.map(s => s.id === diagId ? { ...s, location: updatedLoc } : s);
        localStorage.setItem(`medinet_admin_diag_master_${user.id}`, JSON.stringify(updated));
        localStorage.setItem('medinet_global_diag_locations', JSON.stringify(updated));
        return updated;
      });
      alert(`✅ Diagnostic Room updated for ${targetService.name} to: "${updatedLoc}". Patients can now view this updated room location!`);
    }
  };

  const handleCallOutPatient = (patient: any) => {
    const msg = `📢 Call Out: ${patient.patient_name || 'Patient'} (Serial ${patient.serial_number || 'SL-01'}) - Please proceed to ${patient.doctor_chamber || 'Consultation Room'} with ${patient.doctor_name}!`;
    setCallOutMessage(msg);

    // Save callout alert into localStorage for patient notification panel
    try {
      const calloutNotif = {
        id: Date.now(),
        patient_name: patient.patient_name || '',
        doctor_name: patient.doctor_name || '',
        doctor_chamber: patient.doctor_chamber || 'Consultation Room',
        serial_number: patient.serial_number || 'SL-01',
        message: `📢 Call Out Alert: You are being called by ${patient.doctor_name}! Please proceed to ${patient.doctor_chamber || 'Consultation Room'} immediately.`,
        created_at: new Date().toLocaleTimeString()
      };
      const existing = JSON.parse(localStorage.getItem('medinet_patient_callouts') || '[]');
      localStorage.setItem('medinet_patient_callouts', JSON.stringify([calloutNotif, ...existing]));
    } catch (e) {}

    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);
    } catch (e) {}

    setTimeout(() => setCallOutMessage(''), 6000);
  };

  const handleMarkDiagnosticCompleted = async (diagId: number, targetStatus: string = 'Completed') => {
    try {
      const res = await fetch(getApiUrl('diagnostics.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_status', id: diagId, status: targetStatus })
      });
      const data = await res.json();
      if (data.success) {
        setDiagnostics(prev => prev.filter(d => d.id !== diagId));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Room Roster State (Persisted in localStorage per Admin)
  const [roomsList, setRoomsList] = useState<any[]>(() => {
    const saved = localStorage.getItem(`medinet_admin_rooms_${user.id}`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      { id: 101, room_no: 'ICU-Bed 04', type: 'ICU Unit', hospital: 'Dhaka Medical College Hospital', status: 'Occupied', patient: 'Anwar Hossain' },
      { id: 102, room_no: 'Cabin 302', type: 'Single Deluxe Cabin', hospital: 'Dhaka Medical College Hospital', status: 'Available', patient: 'Vacant' },
      { id: 103, room_no: 'Cabin 305', type: 'VIP Suite Cabin', hospital: 'Dhaka Medical College Hospital', status: 'Reserved', patient: 'Shamima Nasrin' },
      { id: 104, room_no: 'Ward-B Bed 12', type: 'General Male Ward', hospital: 'Dhaka Medical College Hospital', status: 'Available', patient: 'Vacant' },
      { id: 105, room_no: 'Cabin 408', type: 'Executive Suite', hospital: 'Dhaka Medical College Hospital', status: 'Occupied', patient: 'Kamrul Hasan' },
      { id: 106, room_no: 'ICU-Bed 02', type: 'Cardiac ICU Unit', hospital: 'Dhaka Medical College Hospital', status: 'Available', patient: 'Vacant' }
    ];
  });

  // Merge static/local rooms with live patient database room_bookings
  const allRoomsCombined = useMemo(() => {
    const dbRooms = (dbRoomBookings || []).map((b: any) => {
      const rawNo = String(b.room_number || '101');
      const roomNo = rawNo.startsWith('Room') || rawNo.startsWith('Cabin') || rawNo.startsWith('ICU') || rawNo.startsWith('Ward') ? rawNo : `Room ${rawNo}`;
      const isAvailable = b.status === 'Available' || b.user_name === 'Vacant';
      return {
        id: b.id + 10000,
        db_id: b.id,
        raw_room_number: b.room_number,
        room_no: roomNo,
        type: b.ward || 'General Ward',
        hospital: b.hospital || 'Dhaka Medical College Hospital',
        status: isAvailable ? 'Available' : (b.status === 'Booked' ? 'Occupied' : (b.status || 'Occupied')),
        patient: isAvailable ? 'Vacant' : (b.user_name || 'Booked Patient'),
        date_range: b.date_range || ''
      };
    });

    const map = new Map();
    const getKey = (hosp: string, rNo: string) => {
      const cleanNo = String(rNo || '').toLowerCase().replace(/^(room|cabin|icu|ward)[-\s]*/i, '').trim();
      return `${hosp.toLowerCase().trim()}_${cleanNo}`;
    };

    // Live database bookings take priority
    dbRooms.forEach(r => map.set(getKey(r.hospital, r.room_no), r));
    // Fill remaining default rooms
    roomsList.forEach((r: any) => {
      const key = getKey(r.hospital, r.room_no);
      if (!map.has(key)) {
        const isAvail = r.status === 'Available' || r.patient === 'Vacant';
        map.set(key, {
          ...r,
          status: isAvail ? 'Available' : r.status,
          patient: isAvail ? 'Vacant' : r.patient,
          date_range: r.date_range || ''
        });
      }
    });

    return Array.from(map.values());
  }, [dbRoomBookings, roomsList]);

  // Change room availability (Saves to database room_bookings & localStorage)
  const handleUpdateRoomStatus = async (roomId: number, newStatus: string) => {
    const targetRoom = allRoomsCombined.find((r: any) => r.id === roomId);
    if (targetRoom) {
      try {
        await fetch(getApiUrl('rooms.php'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_room_status',
            room_id: targetRoom.db_id || 0,
            room_number: targetRoom.raw_room_number || targetRoom.room_no.replace(/^Room\s+/i, ''),
            hospital: targetRoom.hospital,
            status: newStatus
          })
        });
      } catch (e) {}
    }

    setRoomsList((prev: any[]) => {
      const updated = prev.map((r: any) => {
        if (r.id === roomId || (targetRoom && r.room_no === targetRoom.room_no && r.hospital === targetRoom.hospital)) {
          return {
            ...r,
            status: newStatus,
            patient: newStatus === 'Available' ? 'Vacant' : (r.patient === 'Vacant' ? (newStatus === 'Occupied' ? 'Occupied Patient' : 'Reserved Patient') : r.patient)
          };
        }
        return r;
      });
      localStorage.setItem(`medinet_admin_rooms_${user.id}`, JSON.stringify(updated));
      return updated;
    });

    setDbRoomBookings((prev: any[]) => prev.map((b: any) => {
      if (targetRoom && (b.id === targetRoom.db_id || (b.room_number === (targetRoom.raw_room_number || targetRoom.room_no.replace(/^Room\s+/i, '')) && b.hospital === targetRoom.hospital))) {
        return {
          ...b,
          status: newStatus,
          user_name: newStatus === 'Available' ? 'Vacant' : b.user_name
        };
      }
      return b;
    }));
  };

  const handleAddNewRoom = () => {
    const roomNo = window.prompt("Enter Room / Cabin Number (e.g. Cabin 412 or ICU-Bed 06):");
    if (!roomNo || !roomNo.trim()) return;
    const roomType = window.prompt("Enter Room Type (e.g. Single Deluxe Cabin, ICU Unit, Ward):", "Single Deluxe Cabin") || "Single Deluxe Cabin";
    const newRoom = {
      id: Date.now(),
      room_no: roomNo.trim(),
      type: roomType.trim(),
      hospital: selectedHospital,
      status: 'Available',
      patient: 'Vacant'
    };
    setRoomsList(prev => {
      const updated = [...prev, newRoom];
      localStorage.setItem(`medinet_admin_rooms_${user.id}`, JSON.stringify(updated));
      return updated;
    });
  };

  const roomRoster = allRoomsCombined.filter((r: any) => !selectedHospital || r.hospital === selectedHospital || selectedHospital === 'All');

  // Save Admin Profile Handler
  const handleSaveAdminProfile = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem(`medinet_admin_profile_${user.id}`, JSON.stringify(adminProfile));
    alert("✅ Admin Profile updated successfully!");
  };

  return (
    <div className="min-h-screen bg-[url('/dashboard_bg.png')] bg-cover bg-center bg-fixed bg-no-repeat bg-[#eef5fc] font-['Plus_Jakarta_Sans',sans-serif] text-[#0A192F] flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="w-full lg:w-72 bg-white/45 backdrop-blur-md border-r border-white/50 p-6 flex flex-col justify-between shrink-0 shadow-xl shadow-blue-900/5">
        <div>
          <div className="flex items-center gap-3 mb-8 select-none">
            <div className="w-10 h-10 rounded-2xl bg-[#0066FF] flex items-center justify-center text-white shadow-md shadow-blue-600/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-[#0A192F] block">MediConnect</span>
              <span className="text-[10px] font-extrabold text-[#0066FF] tracking-wider uppercase">Admin Portal</span>
            </div>
          </div>

          <nav className="space-y-1.5">
            {[
              { id: 'Overview', label: 'System Overview', icon: Activity },
              { id: 'Patient Serial Queue', label: 'Patient Serial Queue', icon: Volume2, count: activeDoctorQueue.length },
              { id: 'Room Bookings', label: 'Room Availability', icon: BedDouble, count: roomRoster.length },
              { id: 'Chamber & Diagnostic Rooms', label: 'Doctor & Diag Rooms', icon: Building2 },
              { id: 'Diagnostic Services', label: 'Diagnostic Services', icon: TestTube, count: activeDiagnostics.length },
              { id: 'Reviews & Ratings', label: 'Reviews & Ratings', icon: Star, count: reviews.length },
              { id: 'Admin Profile', label: 'Admin Profile', icon: User }
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
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
                  {item.count !== undefined && item.count > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-[#0066FF] text-white' : 'bg-blue-100 text-[#0066FF]'
                    }`}>
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}

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
        {/* Announcement Call Out Toast Alert */}
        {callOutMessage && (
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs sm:text-sm font-extrabold px-5 py-3.5 rounded-2xl shadow-xl flex items-center justify-between gap-3 animate-bounce">
            <div className="flex items-center gap-3">
              <Volume2 className="w-5 h-5 text-yellow-300 animate-pulse shrink-0" />
              <span>{callOutMessage}</span>
            </div>
            <button
              onClick={() => setCallOutMessage('')}
              className="px-2 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* TAB 0: Overview */}
        {activeTab === 'Overview' && (
          <div className="space-y-6 animate-fade-in">
            {/* Top Header Card (Exclusively rendered on System Overview tab) */}
            <header className="bg-white/45 backdrop-blur-md border border-white/60 p-6 rounded-2xl shadow-lg shadow-blue-900/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative w-14 h-14 rounded-2xl bg-[#0066FF]/10 border border-[#0066FF]/20 flex items-center justify-center text-[#0066FF] font-black text-xl shadow-sm overflow-hidden group shrink-0">
                  {adminPhoto ? (
                    <img src={adminPhoto} alt={adminProfile.name} className="w-full h-full object-cover" />
                  ) : (
                    adminProfile.name?.charAt(0) || 'A'
                  )}
                  <label className="absolute inset-0 bg-black/40 text-white flex flex-col items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-4 h-4" />
                    <span className="text-[9px] font-bold mt-0.5">Upload</span>
                    <input type="file" accept="image/*" onChange={handleAdminPhotoUpload} className="hidden" />
                  </label>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-extrabold text-[#0A192F] tracking-tight">{adminProfile.name}</h1>
                    <span className="bg-purple-100 text-purple-700 border border-purple-300 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Admin Control
                    </span>
                    <span className="bg-blue-100 text-[#0066FF] border border-blue-200 text-xs px-2.5 py-0.5 rounded-full font-mono font-extrabold">
                      {adminUid}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-600 mt-1 flex items-center gap-2">
                    <span>{adminProfile.designation}</span> • <span className="font-extrabold text-[#0066FF]">{selectedHospital}</span>
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Fixed Assigned Hospital Badge (No dropdown; strictly 1 assigned hospital per admin) */}
                <div className="flex items-center gap-2 bg-blue-50/90 border border-blue-200/90 px-3.5 py-2 rounded-xl shadow-xs">
                  <Building2 className="w-4 h-4 text-[#0066FF]" />
                  <span className="text-xs font-bold text-slate-600">Assigned Hospital:</span>
                  <span className="text-xs font-black text-[#0A192F]">{selectedHospital}</span>
                </div>
              </div>
            </header>

            {/* System KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white/45 backdrop-blur-md border border-white/60 rounded-2xl p-5 shadow-lg shadow-blue-900/5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-600 font-bold mb-1 uppercase tracking-wider">Hospital Doctors</p>
                  <h3 className="text-3xl font-black text-[#0A192F]">{filteredDoctors.length}</h3>
                  <p className="text-xs text-[#0066FF] font-bold mt-1">Working at {selectedHospital.split(' ')[0]}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#0066FF]/10 border border-[#0066FF]/20 flex items-center justify-center text-[#0066FF]">
                  <Stethoscope className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white/45 backdrop-blur-md border border-white/60 rounded-2xl p-5 shadow-lg shadow-blue-900/5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-600 font-bold mb-1 uppercase tracking-wider">Live Serial Queue</p>
                  <h3 className="text-3xl font-black text-[#0A192F]">{hospitalAppointments.length}</h3>
                  <p className="text-xs text-amber-600 font-bold mt-1">Patients Waiting</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
                  <Volume2 className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white/45 backdrop-blur-md border border-white/60 rounded-2xl p-5 shadow-lg shadow-blue-900/5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-600 font-bold mb-1 uppercase tracking-wider">Rooms &amp; Cabins</p>
                  <h3 className="text-3xl font-black text-[#0A192F]">{roomRoster.length}</h3>
                  <p className="text-xs text-emerald-600 font-bold mt-1">Live Availability</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
                  <BedDouble className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white/45 backdrop-blur-md border border-white/60 rounded-2xl p-5 shadow-lg shadow-blue-900/5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-600 font-bold mb-1 uppercase tracking-wider">Diagnostics Booked</p>
                  <h3 className="text-3xl font-black text-[#0A192F]">{activeDiagnostics.length}</h3>
                  <p className="text-xs text-purple-600 font-bold mt-1">Diagnostic Wing</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600">
                  <TestTube className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Quick Actions Overview Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Doctor Queue Preview */}
              <div className="bg-white/45 backdrop-blur-md border border-white/60 rounded-2xl p-6 shadow-lg shadow-blue-900/5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                  <h3 className="font-extrabold text-[#0A192F] text-base flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 text-[#0066FF]" /> Doctors &amp; Patient Serial Queues
                  </h3>
                  <button
                    onClick={() => setActiveTab('Patient Serial Queue')}
                    className="text-xs font-extrabold text-[#0066FF] hover:underline cursor-pointer"
                  >
                    View Queue Panel →
                  </button>
                </div>

                <div className="space-y-2">
                  {filteredDoctors.map(doc => {
                    const docQueueCount = hospitalAppointments.filter(a => a.doctor_name === doc.name).length;
                    return (
                      <div key={doc.id} className="p-3 bg-white/70 rounded-xl border border-white/80 flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-sm text-[#0A192F]">{doc.name}</h4>
                          <p className="text-xs text-[#0066FF] font-semibold">{doc.specialty}</p>
                        </div>
                        <span className="px-3 py-1 bg-blue-100 text-[#0066FF] rounded-full text-xs font-black">
                          {docQueueCount} Patients Waiting
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Diagnostic Wing Status Preview */}
              <div className="bg-white/45 backdrop-blur-md border border-white/60 rounded-2xl p-6 shadow-lg shadow-blue-900/5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                  <h3 className="font-extrabold text-[#0A192F] text-base flex items-center gap-2">
                    <TestTube className="w-5 h-5 text-purple-600" /> Diagnostic Test Bookings
                  </h3>
                  <button
                    onClick={() => setActiveTab('Diagnostic Services')}
                    className="text-xs font-extrabold text-purple-600 hover:underline cursor-pointer"
                  >
                    View Diagnostics →
                  </button>
                </div>

                <div className="space-y-2">
                  {diagnostics.slice(0, 4).map(d => (
                    <div key={d.id} className="p-3 bg-white/70 rounded-xl border border-white/80 flex items-center justify-between text-xs">
                      <div>
                        <h4 className="font-bold text-[#0A192F]">{d.service_name}</h4>
                        <p className="text-slate-500">Patient: <strong>{d.user_name || 'Patient'}</strong> • {d.serial_number}</p>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        d.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {d.status || 'Confirmed'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: Patient Serial Queue & Call Out */}
        {activeTab === 'Patient Serial Queue' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white/45 backdrop-blur-md border border-white/60 p-6 rounded-2xl shadow-lg shadow-blue-900/5">
              <h3 className="text-lg font-black text-[#0A192F] flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-[#0066FF]" /> Live Patient Serial Queue &amp; Call Out System
              </h3>
              <p className="text-xs text-slate-600 font-medium mt-1">
                Select a doctor at <strong className="text-[#0066FF]">{selectedHospital}</strong> to view their patient serial queue. When the doctor marks consultation completed, the patient automatically disappears from this list.
              </p>
            </div>

            {/* Doctor Selection Tabs for this Hospital */}
            <div className="bg-white/45 backdrop-blur-md border border-white/60 p-4 rounded-2xl shadow-lg space-y-3">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Select Doctor to View Waiting Serial Queue:</label>
              <div className="flex flex-wrap items-center gap-2">
                {allQueueDoctors.map(doc => {
                  const isSelected = normStr(selectedDoctorForQueue) === normStr(doc.name);
                  const docQueueCount = hospitalAppointments.filter(a => normStr(a.doctor_name) === normStr(doc.name) || (normStr(a.doctor_name) && normStr(doc.name) && normStr(a.doctor_name).includes(normStr(doc.name)))).length;
                  return (
                    <button
                      key={`doc-tab-${doc.id}`}
                      onClick={() => setSelectedDoctorForQueue(doc.name)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                        isSelected
                          ? 'bg-[#0066FF] text-white shadow-md scale-[1.02]'
                          : 'bg-white/70 hover:bg-white text-slate-700 border border-white/80'
                      }`}
                    >
                      <Stethoscope className="w-4 h-4 shrink-0" />
                      <span>{doc.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                        isSelected ? 'bg-white/25 text-white' : 'bg-blue-100 text-[#0066FF]'
                      }`}>
                        {docQueueCount}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Patient Queue Cards for Selected Doctor */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-[#0A192F] text-base">
                  Waiting Patients for <span className="text-[#0066FF]">{selectedDoctorForQueue || 'All Doctors'}</span> ({activeDoctorQueue.length})
                </h4>
              </div>

              {activeDoctorQueue.length === 0 ? (
                <div className="bg-white/45 backdrop-blur-md border border-white/60 rounded-2xl p-10 text-center shadow-lg">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                  <p className="text-base font-black text-[#0A192F]">No Waiting Patients in Queue</p>
                  <p className="text-xs text-slate-500 mt-1">All appointments for this doctor have been completed or cleared.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {activeDoctorQueue.map((app, index) => {
                    const isPriority = app.status === 'Priority Queue' || String(app.serial_number || '').includes('PRIORITY');
                    const serialDisplay = (app.serial_number && app.serial_number !== 'SL-35')
                      ? app.serial_number
                      : `SL-${String(index + 1).padStart(2, '0')}`;
                    return (
                      <div key={app.id} className="bg-white/60 backdrop-blur-md border border-white/80 rounded-2xl p-5 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className={`h-12 min-w-[70px] px-3 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 shadow-xs ${
                            isPriority ? 'bg-purple-100 text-purple-800 border border-purple-300' : 'bg-[#0066FF]/10 text-[#0066FF] border border-[#0066FF]/20'
                          }`}>
                            {serialDisplay}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="font-black text-base text-[#0A192F]">{app.patient_name || 'Patient User'}</h5>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                isPriority ? 'bg-purple-100 text-purple-800 border border-purple-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
                              }`}>
                                {app.status || 'Waiting'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 mt-1 flex items-center gap-2 font-medium">
                              <Calendar className="w-3.5 h-3.5 text-[#0066FF]" />
                              <span>{app.appointment_date} at {app.appointment_time}</span>
                            </p>
                            <p className="text-xs font-bold text-slate-700 mt-1 flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 text-purple-600" />
                              <span>Chamber Room: {app.doctor_chamber || 'Building A, Room 405'}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* Announcement Button */}
                          <button
                            onClick={() => handleCallOutPatient(app)}
                            className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-extrabold shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
                          >
                            <Volume2 className="w-4 h-4" />
                            <span>📢 Call Out Patient</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Room Bookings Availability */}
        {activeTab === 'Room Bookings' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white/45 backdrop-blur-md border border-white/60 p-6 rounded-2xl shadow-lg shadow-blue-900/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-[#0A192F] flex items-center gap-2">
                  <BedDouble className="w-5 h-5 text-[#0066FF]" /> Hospital Room &amp; Cabin Availability Control
                </h3>
                <p className="text-xs text-slate-600 font-medium mt-1">
                  Monitor and manage hospital cabins, ICU units, and ward room status for <strong className="text-[#0066FF]">{selectedHospital}</strong>. Click any status button to change room status instantly.
                </p>
              </div>

              <button
                onClick={handleAddNewRoom}
                className="px-4 py-2.5 bg-[#0066FF] hover:bg-[#0055E0] text-white rounded-xl text-xs font-extrabold shadow-md flex items-center gap-1.5 cursor-pointer shrink-0 transition-all"
              >
                <BedDouble className="w-4 h-4" />
                <span>+ Add Room / Cabin</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {roomRoster.map((room: any) => (
                <div key={room.id} className="bg-white/60 backdrop-blur-md border border-white/80 p-5 rounded-2xl shadow-md space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2.5 py-0.5 bg-blue-100 text-[#0066FF] rounded-full text-[10px] font-extrabold">
                        {room.type}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                        room.status === 'Available' 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                          : room.status === 'Occupied'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        {room.status === 'Available' ? '🟢 Available' : room.status === 'Occupied' ? '🔴 Occupied' : '🟡 Reserved'}
                      </span>
                    </div>

                    <h4 className="font-black text-[#0A192F] text-base">{room.room_no}</h4>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">{room.hospital}</p>

                    <div className="mt-3 p-2.5 rounded-xl bg-blue-50/60 border border-blue-100 flex flex-col gap-1">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Patient In-House</span>
                          <strong className="text-xs font-black text-[#0066FF]">
                            {room.status === 'Available' ? 'Vacant' : (room.patient || 'Vacant')}
                          </strong>
                        </div>
                      </div>
                      {room.status !== 'Available' && room.date_range && (
                        <div className="mt-1 pt-1 border-t border-blue-200/50 text-[10px] text-slate-600 font-semibold flex items-center gap-1">
                          <span className="font-bold text-slate-500">Booked Dates:</span>
                          <span className="text-blue-700 font-extrabold">{room.date_range}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Admin Interactive Change Status Controls */}
                  <div className="pt-2 border-t border-slate-200/60">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                      Set Room Status:
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      <button
                        onClick={() => handleUpdateRoomStatus(room.id, 'Available')}
                        className={`py-1.5 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer border ${
                          room.status === 'Available'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        Available
                      </button>
                      <button
                        onClick={() => handleUpdateRoomStatus(room.id, 'Occupied')}
                        className={`py-1.5 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer border ${
                          room.status === 'Occupied'
                            ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                            : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                        }`}
                      >
                        Occupied
                      </button>
                      <button
                        onClick={() => handleUpdateRoomStatus(room.id, 'Reserved')}
                        className={`py-1.5 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer border ${
                          room.status === 'Reserved'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        Reserved
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: Doctor Chamber & Diagnostic Room Management */}
        {activeTab === 'Chamber & Diagnostic Rooms' && (
          <div className="space-y-6 animate-fade-in">
            {/* Doctor Room Shift Notice Card */}
            <div className="bg-white/45 backdrop-blur-md border border-white/60 p-6 sm:p-8 rounded-2xl shadow-lg space-y-6">
              <div className="border-b border-white/60 pb-4">
                <h3 className="text-xl font-black text-[#0A192F] flex items-center gap-2 tracking-tight">
                  <Stethoscope className="w-6 h-6 text-[#0066FF]" />
                  Doctor Chamber Room Shift Notice Management
                </h3>
                <p className="text-xs text-slate-600 font-medium mt-1">
                  When a doctor's consultation chamber changes, send an official Room Shift Notice with building, floor, and room details. The doctor receives an in-app notification and manually accepts the shift to update their schedule.
                </p>
              </div>

              {shiftMsgStatus && (
                <div className={`p-3.5 rounded-xl text-xs font-extrabold border ${
                  shiftMsgStatus.includes('✅') 
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                    : 'bg-rose-100 text-rose-800 border-rose-300'
                }`}>
                  {shiftMsgStatus}
                </div>
              )}

              <form onSubmit={handleSendRoomShiftNotice} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-semibold">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Select Doctor</label>
                    <select
                      value={selectedDocForShift}
                      onChange={(e) => setSelectedDocForShift(e.target.value)}
                      className="w-full h-11 px-3 bg-white/70 border border-white/90 rounded-xl font-bold text-[#0A192F] outline-none"
                    >
                      {filteredDoctors.map(doc => (
                        <option key={doc.id} value={doc.name}>{doc.name} ({doc.specialty})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Building / Block</label>
                    <input
                      type="text"
                      value={shiftBuilding}
                      onChange={(e) => setShiftBuilding(e.target.value)}
                      placeholder="e.g. Building B, OPD Block"
                      className="w-full h-11 px-3 bg-white/70 border border-white/90 rounded-xl font-bold text-[#0A192F] outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Floor Level</label>
                    <input
                      type="text"
                      value={shiftFloor}
                      onChange={(e) => setShiftFloor(e.target.value)}
                      placeholder="e.g. 3rd Floor"
                      className="w-full h-11 px-3 bg-white/70 border border-white/90 rounded-xl font-bold text-[#0A192F] outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">New Room Number</label>
                    <input
                      type="text"
                      value={shiftRoom}
                      onChange={(e) => setShiftRoom(e.target.value)}
                      placeholder="e.g. Room 308"
                      className="w-full h-11 px-3 bg-white/70 border border-white/90 rounded-xl font-bold text-[#0A192F] outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-6 py-3 bg-[#0066FF] hover:bg-[#0055E0] text-white text-xs font-black rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send Room Shift Notice to Doctor</span>
                  </button>
                </div>
              </form>

              {/* Notice Log Table */}
              <div className="pt-4 border-t border-slate-200/60 space-y-3">
                <h4 className="font-extrabold text-[#0A192F] text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-600" /> Recent Chamber Shift Notices Sent
                </h4>
                {roomNotifsList.filter((n: any) => n.status !== 'Accepted').length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No pending room shift notices.</p>
                ) : (
                  <div className="space-y-2">
                    {roomNotifsList.filter((n: any) => n.status !== 'Accepted').slice(0, 5).map((n: any) => (
                      <div key={n.id} className="p-3 bg-white/60 rounded-xl border border-white/80 flex items-center justify-between text-xs">
                        <div>
                          <strong className="text-[#0A192F] font-black">{n.doctor_name}</strong>
                          <span className="text-slate-500 ml-2">→ Shifted to: <strong className="text-[#0066FF]">{n.new_chamber}</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-mono">{n.sent_at}</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                            n.status === 'Accepted' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {n.status || 'Pending'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Diagnostic Test Room Direct Management Card */}
            <div className="bg-white/45 backdrop-blur-md border border-white/60 p-6 sm:p-8 rounded-2xl shadow-lg space-y-6">
              <div className="border-b border-white/60 pb-4">
                <h3 className="text-xl font-black text-[#0A192F] flex items-center gap-2 tracking-tight">
                  <TestTube className="w-6 h-6 text-purple-600" />
                  Diagnostic Room Direct Management
                </h3>
                <p className="text-xs text-slate-600 font-medium mt-1">
                  Directly update diagnostic test rooms and lab locations. Patients will see updated room locations on their interface automatically without receiving notification popups.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {diagMasterServices.map((service: any) => (
                  <div key={service.id} className="bg-white/70 backdrop-blur-md border border-white/90 p-5 rounded-2xl shadow-sm space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 rounded-full text-[10px] font-extrabold">
                          {service.category}
                        </span>
                        <span className="text-xs font-bold text-slate-500">{service.hospital}</span>
                      </div>
                      <h4 className="font-black text-[#0A192F] text-base mt-2">{service.name}</h4>
                      <p className="text-xs font-bold text-purple-700 bg-purple-50/80 p-2.5 rounded-xl border border-purple-100 mt-2 flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-purple-600 shrink-0" />
                        <span>Room Location: {service.location}</span>
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 flex justify-end">
                      <button
                        onClick={() => handleUpdateDiagServiceLocation(service.id)}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-extrabold shadow-md cursor-pointer transition-all flex items-center gap-1.5"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Update Diagnostic Room</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Diagnostic Services */}
        {activeTab === 'Diagnostic Services' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white/45 backdrop-blur-md border border-white/60 p-6 rounded-2xl shadow-lg shadow-blue-900/5">
              <h3 className="text-lg font-black text-[#0A192F] flex items-center gap-2">
                <TestTube className="w-5 h-5 text-purple-600" /> Hospital Diagnostic Services &amp; Lab Requests
              </h3>
              <p className="text-xs text-slate-600 font-medium mt-1">
                Inspect diagnostic test bookings and mark lab reports as completed / ready for patients.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {activeDiagnostics.length === 0 ? (
                <div className="bg-white/45 backdrop-blur-md border border-white/60 rounded-2xl p-10 text-center shadow-lg">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                  <p className="text-base font-black text-[#0A192F]">No Pending Diagnostic Requests</p>
                  <p className="text-xs text-slate-500 mt-1">All diagnostic bookings have been completed and delivered.</p>
                </div>
              ) : (
                activeDiagnostics.map(d => (
                  <div key={d.id} className="bg-white/60 backdrop-blur-md border border-white/80 rounded-2xl p-5 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-base text-[#0A192F]">{d.service_name}</h4>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                          d.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {d.status || 'Confirmed'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        Patient: <strong className="text-[#0A192F]">{d.user_name || 'Patient'}</strong> • Serial: <strong className="text-purple-700">{d.serial_number}</strong>
                      </p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">{d.test_location} • Price: {d.price} BDT</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {d.status !== 'Completed' && (
                        <button
                          onClick={() => handleMarkDiagnosticCompleted(d.id, 'Completed')}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Mark Diagnostic Ready</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 4: Reviews & Ratings */}
        {activeTab === 'Reviews & Ratings' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white/45 backdrop-blur-md border border-white/60 p-6 rounded-2xl shadow-lg shadow-blue-900/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-[#0A192F] flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-400" /> Doctor &amp; Hospital Patient Reviews
                </h3>
                <p className="text-xs text-slate-600 font-medium mt-1">
                  Inspect verified patient ratings, doctor feedback, and diagnostic reviews for <strong className="text-[#0066FF]">{selectedHospital}</strong>.
                </p>
              </div>

              {reviews.length > 0 && (
                <div className="bg-amber-50/90 border border-amber-200 px-4 py-2 rounded-2xl flex items-center gap-2 shrink-0 shadow-xs">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
                  <div>
                    <span className="text-sm font-black text-amber-800">
                      {(reviews.reduce((a, b) => a + (Number(b.rating) || 5), 0) / reviews.length).toFixed(1)} / 5.0
                    </span>
                    <span className="text-[10px] font-bold text-amber-700 block">({reviews.length} Verified Reviews)</span>
                  </div>
                </div>
              )}
            </div>

            {reviews.length === 0 ? (
              <div className="bg-white/45 backdrop-blur-md border border-white/60 rounded-3xl p-10 text-center shadow-lg shadow-blue-900/5 space-y-3">
                <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 text-amber-500 flex items-center justify-center mx-auto shadow-sm">
                  <Star className="w-7 h-7 fill-amber-400" />
                </div>
                <h4 className="text-base font-extrabold text-[#0A192F]">No Patient Reviews Available Yet</h4>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  Verified patient feedback for doctors, hospital facilities, and diagnostic services will appear here as patients rate their completed visits.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reviews.map((rev, idx) => {
                  const targetTypeStr = String(rev.target_type || 'doctor').toLowerCase();
                  const badgeBg = targetTypeStr === 'doctor' 
                    ? 'bg-blue-100 text-[#0066FF] border-blue-200' 
                    : targetTypeStr === 'hospital' 
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
                    : 'bg-purple-100 text-purple-800 border-purple-200';
                  
                  const typeLabel = targetTypeStr === 'doctor' ? '🩺 Doctor Review' : targetTypeStr === 'hospital' ? '🏥 Hospital Review' : '🧪 Diagnostic Review';

                  return (
                    <div key={rev.id || idx} className="bg-white/60 backdrop-blur-md border border-white/80 p-5 rounded-2xl shadow-md space-y-3 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${badgeBg}`}>
                              {typeLabel}
                            </span>
                            <h4 className="font-extrabold text-sm text-[#0A192F] mt-1">{rev.user_name || 'Patient'}</h4>
                            <p className="text-xs font-bold text-slate-700 mt-0.5">Target: <strong className="text-[#0066FF]">{rev.target_name}</strong></p>
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
                        {rev.created_at ? new Date(rev.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently posted'}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: Admin Profile */}
        {activeTab === 'Admin Profile' && (
          <div className="bg-white/45 backdrop-blur-md border border-white/60 rounded-2xl p-6 sm:p-8 shadow-lg shadow-blue-900/5 space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/40 pb-5">
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 rounded-3xl bg-[#0066FF]/10 border-2 border-[#0066FF]/30 text-[#0066FF] flex items-center justify-center font-black text-3xl shadow-lg overflow-hidden shrink-0 group">
                  {adminPhoto ? (
                    <img src={adminPhoto} alt={adminProfile.name} className="w-full h-full object-cover" />
                  ) : (
                    adminProfile.name.charAt(0)
                  )}
                  <label className="absolute inset-0 bg-black/50 text-white flex flex-col items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-5 h-5" />
                    <span className="text-[10px] font-bold mt-1">Upload</span>
                    <input type="file" accept="image/*" onChange={handleAdminPhotoUpload} className="hidden" />
                  </label>
                </div>

                <div>
                  <h3 className="text-2xl font-black text-[#0A192F] tracking-tight">{adminProfile.name}</h3>
                  <p className="text-xs font-bold text-[#0066FF] mt-0.5">{adminProfile.designation}</p>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{adminUid}</p>
                </div>
              </div>

              <label className="inline-flex items-center gap-2 bg-[#0066FF] hover:bg-[#0055E0] text-white font-bold text-xs px-5 py-3 rounded-xl transition-all shadow-md cursor-pointer shrink-0">
                <Camera className="w-4 h-4" />
                <span>{adminPhoto ? 'Change Photo' : 'Upload Profile Photo'}</span>
                <input type="file" accept="image/*" onChange={handleAdminPhotoUpload} className="hidden" />
              </label>
            </div>

            <form onSubmit={handleSaveAdminProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Administrator Full Name</label>
                  <input
                    type="text"
                    value={adminProfile.name}
                    onChange={(e) => setAdminProfile({ ...adminProfile, name: e.target.value })}
                    className="w-full h-11 px-3.5 bg-white/60 border border-white/80 rounded-xl font-semibold text-[#0A192F] outline-none focus:bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Official Email Address</label>
                  <input
                    type="email"
                    value={adminProfile.email}
                    onChange={(e) => setAdminProfile({ ...adminProfile, email: e.target.value })}
                    className="w-full h-11 px-3.5 bg-white/60 border border-white/80 rounded-xl font-semibold text-[#0A192F] outline-none focus:bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={adminProfile.phone}
                    onChange={(e) => setAdminProfile({ ...adminProfile, phone: e.target.value })}
                    className="w-full h-11 px-3.5 bg-white/60 border border-white/80 rounded-xl font-semibold text-[#0A192F] outline-none focus:bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Assigned Hospital</label>
                  <input
                    type="text"
                    value={adminProfile.hospital}
                    onChange={(e) => setAdminProfile({ ...adminProfile, hospital: e.target.value })}
                    className="w-full h-11 px-3.5 bg-white/60 border border-white/80 rounded-xl font-semibold text-[#0A192F] outline-none focus:bg-white"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Designation &amp; Role</label>
                  <input
                    type="text"
                    value={adminProfile.designation}
                    onChange={(e) => setAdminProfile({ ...adminProfile, designation: e.target.value })}
                    className="w-full h-11 px-3.5 bg-white/60 border border-white/80 rounded-xl font-semibold text-[#0A192F] outline-none focus:bg-white"
                    required
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-white/40 flex justify-end">
                <button
                  type="submit"
                  className="px-8 py-3 bg-[#0066FF] hover:bg-[#0055E0] text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all"
                >
                  Save Admin Profile
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
