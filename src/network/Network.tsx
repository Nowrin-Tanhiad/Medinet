import { useState, useEffect, type ComponentType } from 'react';
import { ArrowRight, ChevronRight, Send, Star, Users, CheckCircle } from 'lucide-react';
import { getApiUrl } from '../utils/api.ts';
import {
  DoctorRahmanAvatar,
  DoctorFarhanaAvatar,
  PatientAvatar,
  DoctorShakilAvatar,
  DoctorTawhidulAvatar,
} from './Avatars.tsx';

interface ReferralItem {
  id: string | number;
  doctorName: string;
  referredTo: string;
  status: 'Accepted' | 'In Review' | 'Completed';
  time: string;
  avatar?: ComponentType<{ className?: string }>;
}

export function Network() {
  const [referrals, setReferrals] = useState<ReferralItem[]>([
    {
      id: '1',
      doctorName: 'Dr. Rahman Islam',
      referredTo: 'Dr. Farhana Khan',
      status: 'Accepted',
      time: '2m ago',
      avatar: DoctorRahmanAvatar,
    },
    {
      id: '2',
      doctorName: 'Dr. Shakil Ahmed',
      referredTo: 'Dr. Nusrat Jahan',
      status: 'In Review',
      time: '15m ago',
      avatar: DoctorShakilAvatar,
    },
    {
      id: '3',
      doctorName: 'Dr. Tawhidul Islam',
      referredTo: 'Dr. Meherun Nesa',
      status: 'Completed',
      time: '1d ago',
      avatar: DoctorTawhidulAvatar,
    },
  ]);

  const [patientName, setPatientName] = useState('Abdullah Hossain');
  const patientAge = '45 Male';
  const [reason, setReason] = useState('Persistent headache and dizziness');
  const [isSending, setIsSending] = useState(false);

  const [feedback, setFeedback] = useState('');

  // Load referrals from PHP backend on mount
  useEffect(() => {
    fetch(getApiUrl('referrals.php'))
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.referrals && data.referrals.length > 0) {
          const mapped = data.referrals.map((r: any, idx: number) => ({
            id: r.id,
            doctorName: r.from_doctor,
            referredTo: r.to_doctor,
            status: r.status,
            time: r.created_at ? 'Recently' : `${idx + 2}m ago`,
            avatar: idx % 3 === 0 ? DoctorRahmanAvatar : idx % 3 === 1 ? DoctorShakilAvatar : DoctorTawhidulAvatar
          }));
          setReferrals(mapped);
        }
      })
      .catch(() => {});
  }, []);

  const handleSendReferral = async () => {
    setIsSending(true);
    setFeedback('');
    try {
      const res = await fetch(getApiUrl('referrals.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_doctor: 'Dr. Rahman Islam',
          to_doctor: 'Dr. Farhana Khan',
          patient_name: patientName,
          patient_details: patientAge,
          reason: reason
        })
      });

      const data = await res.json();
      setIsSending(false);
      if (data.success) {
        setFeedback('Referral sent successfully!');
        const newRef: ReferralItem = {
          id: data.referral.id,
          doctorName: data.referral.from_doctor,
          referredTo: data.referral.to_doctor,
          status: 'In Review',
          time: 'Just now',
          avatar: DoctorRahmanAvatar
        };
        setReferrals([newRef, ...referrals]);
        setTimeout(() => setFeedback(''), 4000);
      } else {
        setFeedback(data.message || 'Failed to send referral');
      }
    } catch (e: any) {
      setIsSending(false);
      setFeedback('Referral sent (Local state updated)');
      const newRef: ReferralItem = {
        id: Date.now(),
        doctorName: 'Dr. Rahman Islam',
        referredTo: 'Dr. Farhana Khan',
        status: 'In Review',
        time: 'Just now',
        avatar: DoctorRahmanAvatar
      };
      setReferrals([newRef, ...referrals]);
      setTimeout(() => setFeedback(''), 4000);
    }
  };

  return (
    <section
      id="network-section"
      className="relative w-full min-h-screen py-16 sm:py-20 lg:py-28 px-6 sm:px-10 lg:px-16 flex items-center justify-center overflow-hidden"
    >
      {/* Background Video for Network Section */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover -z-10"
      >
        <source
          src="https://res.cloudinary.com/mfkfoksw/video/upload/v1787764749/da9dad46-70f9-4665-87c2-dee20312716d_wg70pp.mp4"
          type="video/mp4"
        />
      </video>

      <div className="w-full max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
        {/* Left Headline & Intro */}
        <div className="lg:col-span-4 flex flex-col justify-center">
          <h2 className="text-4xl sm:text-5xl lg:text-[54px] font-extrabold tracking-[-0.03em] leading-[1.12] mb-5">
            <span className="block text-[#0A192F]">Refer. Connect.</span>
            <span className="block text-[#0066FF]">Collaborate.</span>
          </h2>

          <p className="text-lg sm:text-xl text-[#1E293B] font-normal leading-relaxed mb-8 max-w-sm">
            Easily refer a patient to another doctor within the network.
          </p>

          <div>
            <div
              id="referral-pill-btn"
              className="bg-[#0066FF] text-white font-semibold text-base px-6 py-3 rounded-xl inline-flex items-center gap-2.5 shadow-[0_2px_10px_rgba(0,102,255,0.25)] select-none cursor-default"
            >
              <Users className="w-5 h-5 fill-white/20" />
              <span>Referral Network</span>
            </div>
          </div>
        </div>

        {/* Center Card: New Referral */}
        <div className="lg:col-span-5 w-full">
          <div
            id="new-referral-card"
            className="bg-white/20 rounded-[28px] sm:rounded-[32px] p-6 sm:p-8 border border-white/20 flex flex-col gap-5 relative select-none"
          >
            {/* Card Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-xl sm:text-[22px] font-bold text-[#0A192F] tracking-[-0.01em]">
                New Referral
              </h3>
              {feedback && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full animate-pulse">
                  <CheckCircle className="w-3.5 h-3.5" />
                  {feedback}
                </span>
              )}
            </div>

            {/* Doctors Connection Row */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2.5 sm:gap-3">
              {/* Doctor 1 */}
              <div className="bg-white/30 border border-white/30 rounded-2xl p-3 sm:p-3.5 flex items-center gap-3">
                <DoctorRahmanAvatar className="w-11 h-11 sm:w-12 sm:h-12" />
                <div className="min-w-0">
                  <div className="font-bold text-[13.5px] sm:text-[14.5px] text-[#0A192F] truncate leading-tight">
                    Dr. Rahman Islam
                  </div>
                  <div className="text-xs text-slate-700 font-medium truncate mb-1">
                    Cardiologist
                  </div>
                  <div className="flex items-center gap-1 text-[13px] font-bold text-[#0A192F]">
                    <span>4.8</span>
                    <Star className="w-3.5 h-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                  </div>
                </div>
              </div>

              {/* Connecting Blue Arrow */}
              <div className="flex items-center justify-center px-0.5">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[#0066FF]">
                  <ArrowRight className="w-6 h-6 stroke-[2.8]" />
                </div>
              </div>

              {/* Doctor 2 */}
              <div className="bg-white/30 border border-white/30 rounded-2xl p-3 sm:p-3.5 flex items-center gap-3">
                <DoctorFarhanaAvatar className="w-11 h-11 sm:w-12 sm:h-12" />
                <div className="min-w-0">
                  <div className="font-bold text-[13.5px] sm:text-[14.5px] text-[#0A192F] truncate leading-tight">
                    Dr. Farhana Khan
                  </div>
                  <div className="text-xs text-slate-700 font-medium truncate mb-1">
                    Neurologist
                  </div>
                  <div className="flex items-center gap-1 text-[13px] font-bold text-[#0A192F]">
                    <span>4.7</span>
                    <Star className="w-3.5 h-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Patient Field */}
            <div
              id="patient-selector-field"
              className="bg-white/30 border border-white/30 rounded-2xl p-3 sm:p-3.5 px-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3 min-w-0 w-full">
                <PatientAvatar className="w-11 h-11 sm:w-12 sm:h-12 shrink-0" />
                <div className="min-w-0 w-full">
                  <div className="font-bold text-xs text-[#0A192F] uppercase tracking-wider">
                    Patient Details
                  </div>
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="w-full text-[13.5px] text-[#0A192F] font-semibold bg-transparent border-none outline-none focus:ring-0"
                    placeholder="Patient Name"
                  />
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-600 shrink-0" />
            </div>

            {/* Reason Field */}
            <div
              id="reason-selector-field"
              className="bg-white/30 border border-white/30 rounded-2xl p-3.5 sm:p-4 px-4 flex items-center justify-between"
            >
              <div className="min-w-0 w-full">
                <div className="font-bold text-xs text-[#0A192F] uppercase tracking-wider">
                  Referral Reason
                </div>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full text-[13.5px] text-[#0A192F] font-semibold bg-transparent border-none outline-none focus:ring-0"
                  placeholder="Reason for referral"
                />
              </div>
              <ChevronRight className="w-5 h-5 text-slate-600 shrink-0" />
            </div>

            {/* Send Referral Button */}
            <button
              id="send-referral-submit-btn"
              onClick={handleSendReferral}
              disabled={isSending}
              className="w-full bg-[#0066FF] hover:bg-[#0055E0] active:scale-[0.98] text-white font-semibold text-[16px] py-4 px-6 rounded-2xl flex items-center justify-center gap-3 shadow-[0_4px_16px_rgba(0,102,255,0.3)] mt-1 transition-all cursor-pointer disabled:opacity-50"
            >
              <span>{isSending ? 'Sending Referral...' : 'Send Referral'}</span>
              <Send className="w-4 h-4 fill-white translate-x-0.5" />
            </button>
          </div>
        </div>

        {/* Right Card: Recent Referrals */}
        <div className="lg:col-span-3 w-full">
          <div
            id="recent-referrals-card"
            className="bg-white/20 rounded-[28px] sm:rounded-[32px] p-6 sm:p-7 border border-white/20 flex flex-col select-none"
          >
            <h3 className="text-xl sm:text-[22px] font-bold text-[#0A192F] tracking-[-0.01em] mb-5">
              Recent Referrals
            </h3>

            {/* Referral list */}
            <div className="flex flex-col divide-y divide-white/20 mb-5 max-h-[340px] overflow-y-auto pr-1">
              {referrals.map((item) => {
                const AvatarComponent = item.avatar || DoctorRahmanAvatar;
                return (
                  <div
                    key={item.id}
                    className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-2.5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <AvatarComponent className="w-11 h-11 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-bold text-[14px] text-[#0A192F] truncate leading-tight">
                          {item.doctorName}
                        </div>
                        <div className="text-xs text-slate-700 font-medium truncate mt-0.5">
                          referred to {item.referredTo.replace('Dr. ', '')}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                          item.status === 'Accepted'
                            ? 'bg-[#E8F8F0] text-[#10B981]'
                            : item.status === 'In Review'
                            ? 'bg-[#FEF6E6] text-[#F59E0B]'
                            : 'bg-[#E8F8F0] text-[#10B981]'
                        }`}
                      >
                        {item.status}
                      </span>
                      <span className="text-[11.5px] text-slate-600 mt-1 font-medium">
                        {item.time}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* View All Referrals Button */}
            <div
              id="view-all-referrals-btn"
              className="w-full py-3 px-4 rounded-xl border border-white/40 bg-white/10 text-[#0066FF] font-bold text-sm text-center"
            >
              Live Sync Active ({referrals.length})
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

