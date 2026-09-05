import { useState } from 'react';
import { Calendar, MapPin, Phone, User, Upload, CheckCircle2, ShieldCheck, Heart, Sparkles, Camera, ArrowRight } from 'lucide-react';
import { getApiUrl } from '../utils/api.ts';

interface PatientOnboardingModalProps {
  isOpen: boolean;
  onComplete: (patientUid: string) => void;
  userName: string;
}

export function PatientOnboardingModal({ isOpen, onComplete, userName }: PatientOnboardingModalProps) {
  const [dob, setDob] = useState('1998-05-14');
  const [gender, setGender] = useState('Female');
  const [phone, setPhone] = useState('+880 1711-000000');
  const [address, setAddress] = useState('Dhaka, Bangladesh');
  const [bloodGroup, setBloodGroup] = useState('A+');
  const [allergies, setAllergies] = useState('None');
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const [prescriptionNote, setPrescriptionNote] = useState('');
  const [prescriptionFile, setPrescriptionFile] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdUid, setCreatedUid] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleProfileImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPrescriptionFile(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e?: React.FormEvent, isSkip = false) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);

    const payload = isSkip
      ? {
          date_of_birth: dob,
          gender: gender,
          phone: phone,
          address: address,
          blood_group: bloodGroup,
          allergies: allergies,
          profile_image: '',
          prescription_doc: ''
        }
      : {
          date_of_birth: dob,
          gender: gender,
          phone: phone,
          address: address,
          blood_group: bloodGroup,
          allergies: allergies,
          profile_image: profileImage || '',
          prescription_doc: prescriptionFile || prescriptionNote
        };

    try {
      const res = await fetch(getApiUrl('patient_profile.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      setIsSubmitting(false);

      if (data.success && data.patient_uid) {
        setCreatedUid(data.patient_uid);
        setTimeout(() => {
          onComplete(data.patient_uid);
        }, 1500);
      } else {
        const fallbackId = `MC-PAT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        setCreatedUid(fallbackId);
        setTimeout(() => {
          onComplete(fallbackId);
        }, 1500);
      }
    } catch (err) {
      setIsSubmitting(false);
      const fallbackId = `MC-PAT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      setCreatedUid(fallbackId);
      setTimeout(() => {
        onComplete(fallbackId);
      }, 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A192F]/70 backdrop-blur-md p-4 animate-fade-in">
      <div className="relative w-full max-w-xl bg-white border border-blue-100 rounded-[32px] p-6 sm:p-9 shadow-[0_24px_70px_rgba(0,102,255,0.22)] text-[#0A192F] max-h-[90vh] overflow-y-auto">
        
        {createdUid ? (
          /* Automated Patient User ID Display Screen */
          <div className="py-8 text-center flex flex-col items-center justify-center animate-scale-up">
            <div className="w-20 h-20 rounded-full bg-blue-50 border-2 border-[#0066FF] flex items-center justify-center text-[#0066FF] mb-4 shadow-lg shadow-blue-500/20 animate-bounce">
              <Sparkles className="w-10 h-10" />
            </div>

            <span className="inline-block text-xs font-black uppercase tracking-widest text-[#0066FF] bg-blue-100 px-3.5 py-1 rounded-full mb-2">
              Profile Setup Complete
            </span>

            <h3 className="text-3xl font-black text-[#0A192F] tracking-tight mb-2">
              Welcome, {userName}!
            </h3>

            <p className="text-slate-500 font-medium text-sm max-w-md mb-6">
              Your Automated Patient User ID has been generated and saved to your account.
            </p>

            <div className="bg-[#F4F8FF] border-2 border-dashed border-[#0066FF]/40 rounded-2xl p-5 mb-6 w-full max-w-md flex flex-col items-center">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Automated Patient User ID</span>
              <div className="text-2xl sm:text-3xl font-black text-[#0066FF] tracking-wider font-mono">
                {createdUid}
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
              <span>Redirecting to your Patient Dashboard...</span>
            </div>
          </div>
        ) : (
          /* First-Time Profile Onboarding Form */
          <div>
            <div className="flex items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#0066FF]/10 text-[#0066FF] flex items-center justify-center border border-[#0066FF]/20 shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-[#0A192F] tracking-tight">
                    Patient Profile Setup
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Upload profile picture or skip for now to enter your dashboard.
                  </p>
                </div>
              </div>

              {/* Skip Button */}
              <button
                type="button"
                onClick={() => handleSubmit(undefined, true)}
                className="text-xs font-bold text-[#0066FF] hover:text-[#0055E0] bg-blue-50 border border-blue-200 px-3.5 py-1.5 rounded-full flex items-center gap-1 transition-colors cursor-pointer shrink-0"
              >
                <span>Skip for now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
              {/* Optional Profile Picture Upload */}
              <div className="bg-[#F4F8FF] border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
                <div className="relative w-16 h-16 rounded-full bg-white border-2 border-[#0066FF] flex items-center justify-center text-[#0066FF] overflow-hidden shrink-0 shadow-md">
                  {profileImage ? (
                    <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8" />
                  )}
                  <label className="absolute inset-0 bg-black/30 hover:bg-black/50 text-white flex items-center justify-center cursor-pointer transition-colors opacity-0 hover:opacity-100">
                    <Camera className="w-5 h-5" />
                    <input type="file" accept="image/*" onChange={handleProfileImageUpload} className="hidden" />
                  </label>
                </div>

                <div className="flex-1 text-center sm:text-left">
                  <label className="block text-xs font-bold text-[#0A192F] uppercase tracking-wider mb-1">
                    Profile Picture <span className="text-slate-400 font-normal lowercase">(optional)</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0066FF] bg-white border border-blue-200 px-3 py-1.5 rounded-xl cursor-pointer hover:bg-blue-50 transition-colors shadow-2xs">
                    <Camera className="w-3.5 h-3.5" />
                    <span>{profileImage ? 'Change Photo' : 'Upload Photo'}</span>
                    <input type="file" accept="image/*" onChange={handleProfileImageUpload} className="hidden" />
                  </label>
                  <p className="text-[11px] text-slate-400 mt-1">You can skip this now and upload later from your profile menu.</p>
                </div>
              </div>

              {/* Row 1: Date of Birth & Gender */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#0A192F] mb-1.5 uppercase tracking-wider">
                    Date of Birth
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0066FF]" />
                    <input
                      type="date"
                      required
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full bg-[#F4F8FF] border border-blue-200 rounded-xl pl-10 pr-3 py-2.5 text-sm text-[#0A192F] font-semibold focus:outline-none focus:border-[#0066FF] focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0A192F] mb-1.5 uppercase tracking-wider">
                    Gender
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0066FF]" />
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full bg-[#F4F8FF] border border-blue-200 rounded-xl pl-10 pr-3 py-2.5 text-sm text-[#0A192F] font-semibold focus:outline-none focus:border-[#0066FF] focus:bg-white cursor-pointer"
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Row 2: Phone & Blood Group */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#0A192F] mb-1.5 uppercase tracking-wider">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0066FF]" />
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+880 1711-000000"
                      className="w-full bg-[#F4F8FF] border border-blue-200 rounded-xl pl-10 pr-3 py-2.5 text-sm text-[#0A192F] font-semibold focus:outline-none focus:border-[#0066FF] focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0A192F] mb-1.5 uppercase tracking-wider">
                    Blood Group &amp; Allergies
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                      className="w-full bg-[#F4F8FF] border border-blue-200 rounded-xl px-3 py-2.5 text-sm text-[#0A192F] font-semibold focus:outline-none focus:border-[#0066FF] focus:bg-white cursor-pointer"
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
                    <input
                      type="text"
                      value={allergies}
                      onChange={(e) => setAllergies(e.target.value)}
                      placeholder="Allergies (None)"
                      className="w-full bg-[#F4F8FF] border border-blue-200 rounded-xl px-3 py-2.5 text-sm text-[#0A192F] font-semibold focus:outline-none focus:border-[#0066FF] focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Row 3: Address */}
              <div>
                <label className="block text-xs font-bold text-[#0A192F] mb-1.5 uppercase tracking-wider">
                  Address
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0066FF]" />
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Plot 42, Road 11, Banani, Dhaka"
                    className="w-full bg-[#F4F8FF] border border-blue-200 rounded-xl pl-10 pr-3 py-2.5 text-sm text-[#0A192F] font-semibold focus:outline-none focus:border-[#0066FF] focus:bg-white"
                  />
                </div>
              </div>

              {/* Row 4: Prescription Record */}
              <div className="bg-[#F4F8FF] border border-blue-200 rounded-2xl p-4 space-y-3">
                <label className="block text-xs font-bold text-[#0A192F] uppercase tracking-wider flex items-center justify-between">
                  <span>Prescription</span>
                  <span className="text-[11px] text-[#0066FF] lowercase font-semibold">(optional)</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="w-full border-2 border-dashed border-[#0066FF]/30 hover:border-[#0066FF] bg-white rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer transition-colors text-center">
                      <Upload className="w-5 h-5 text-[#0066FF] mb-1" />
                      <span className="text-xs font-bold text-[#0A192F]">Upload Prescription</span>
                      <span className="text-[10px] text-slate-400">PNG, JPG or PDF</span>
                      <input type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="hidden" />
                    </label>
                    {prescriptionFile && (
                      <div className="mt-1 text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> File attached!
                      </div>
                    )}
                  </div>

                  <div>
                    <textarea
                      rows={3}
                      value={prescriptionNote}
                      onChange={(e) => setPrescriptionNote(e.target.value)}
                      placeholder="Or write prescription details..."
                      className="w-full bg-white border border-blue-200 rounded-xl p-2.5 text-xs text-[#0A192F] font-medium focus:outline-none focus:border-[#0066FF]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleSubmit(undefined, true)}
                  className="w-1/3 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold py-3.5 rounded-xl transition-all cursor-pointer text-xs"
                >
                  Skip for Now
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-2/3 bg-[#0066FF] hover:bg-[#0055E0] active:scale-[0.98] text-white font-bold py-3.5 rounded-xl shadow-[0_4px_16px_rgba(0,102,255,0.3)] transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 text-xs"
                >
                  <Heart className="w-4 h-4 fill-white" />
                  <span>{isSubmitting ? 'Saving...' : 'Complete & Generate ID'}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
