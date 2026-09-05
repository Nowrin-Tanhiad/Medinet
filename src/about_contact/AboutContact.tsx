import { useState, useRef, useEffect } from 'react';
import { 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  Copy, 
  Check, 
  ArrowUpRight,
  Send,
  CheckCircle2
} from 'lucide-react';
import { getApiUrl } from '../utils/api.ts';

interface DiagnosticItem {
  id: string;
  name: string;
  subtitle: string;
  iconType: 'blood' | 'xray' | 'mri' | 'ct';
  price?: number;
}

const diagnosticServices: DiagnosticItem[] = [
  { id: '1', name: 'Blood Test', subtitle: 'Results in 24h', iconType: 'blood', price: 650 },
  { id: '2', name: 'X-Ray', subtitle: 'Digital X-Ray', iconType: 'xray', price: 1200 },
  { id: '3', name: 'MRI Scan', subtitle: 'Advanced Imaging', iconType: 'mri', price: 7500 },
  { id: '4', name: 'CT Scan', subtitle: 'High Resolution', iconType: 'ct', price: 5500 },
];

const contactNumbers = [
  {
    title: 'Emergency 24/7 Hotline',
    number: '+880 9612-444999',
    badge: 'Toll-Free',
    type: 'emergency',
    desc: 'Instant emergency triage & patient assistance'
  },
  {
    title: 'Ambulance Dispatch',
    number: '+880 1999-911911',
    badge: 'Rapid Response',
    type: 'ambulance',
    desc: 'GPS-enabled ICU & Non-ICU ambulances'
  },
  {
    title: 'Diagnostic & Lab Helpdesk',
    number: '+880 1713-000024',
    badge: 'Sample Collection',
    type: 'diagnostic',
    desc: 'Home sample pickup & digital test reports'
  },
  {
    title: 'Blood Bank Network',
    number: '+880 1819-555120',
    badge: 'Live Donors',
    type: 'blood',
    desc: 'All blood groups with verified donor directory'
  }
];

export function DiagnosticsContact() {
  const [bookedService, setBookedService] = useState<string | null>(null);
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);
  const [allServicesOpen, setAllServicesOpen] = useState(false);
  const [contactMsg, setContactMsg] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [inquirySubmitted, setInquirySubmitted] = useState(false);
  const [isSubmittingInquiry, setIsSubmittingInquiry] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.play().catch(() => {});
    }
  }, []);

  const handleBook = async (service: DiagnosticItem) => {
    setBookedService(service.name);
    try {
      await fetch(getApiUrl('diagnostics.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_name: service.name,
          price: service.price || 0
        })
      });
    } catch (e) {}

    setTimeout(() => {
      setBookedService(null);
    }, 3500);
  };

  const handleCopy = (num: string) => {
    navigator.clipboard?.writeText(num);
    setCopiedNumber(num);
    setTimeout(() => setCopiedNumber(null), 2000);
  };

  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userPhone && !contactMsg) return;
    setIsSubmittingInquiry(true);

    try {
      await fetch(getApiUrl('contact.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: userPhone,
          message: contactMsg,
          category: 'Helpline Inquiry'
        })
      });
    } catch (e) {}


    setIsSubmittingInquiry(false);
    setInquirySubmitted(true);
    setContactMsg('');
    setUserPhone('');
    setTimeout(() => setInquirySubmitted(false), 5000);
  };

  return (
    <section
      id="about-contact-section"
      className="relative w-full min-h-screen py-20 sm:py-24 lg:py-28 px-6 sm:px-12 lg:px-16 flex flex-col justify-between overflow-hidden"
    >
      {/* Background Video (muted, loop, autoPlay, full coverage) */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover -z-20 pointer-events-none"
      >
        <source
          src="https://res.cloudinary.com/mfkfoksw/video/upload/v1787764738/720f9fe8-52f6-4c7f-bd33-12433dcb9686_nyzjo9.mp4"
          type="video/mp4"
        />
      </video>

      {/* Subtle non-blur overlay only to maintain video clarity while enhancing text contrast */}
      <div className="absolute inset-0 bg-black/25 -z-10 pointer-events-none" />

      {/* Top Section Anchor Targets */}
      <div id="about-us-section" className="absolute -top-12 left-0" />
      <div id="contact-section" className="absolute top-1/2 left-0" />

      <div className="w-full max-w-[1360px] mx-auto z-10">
        {/* Main Header Banner */}
        <div className="mb-10 sm:mb-12">
          {/* Heading */}
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-[-0.03em] leading-[1.08] mb-4 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
            Diagnose. Book.<br />Save Lives.
          </h2>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-white/90 font-medium max-w-xl leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
            Book diagnostic services easily. Ambulance, blood bank &amp; emergency helpdesk connected.
          </p>
        </div>

        {/* 2-Column Main UI Layout matching the design with TRANSPARENT containers */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start mb-16">
          {/* Left Column: Diagnostic Services Card */}
          <div className="lg:col-span-6 xl:col-span-6 bg-white/10 rounded-[28px] p-6 sm:p-8 border border-white/30 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
            <h3 className="text-xl sm:text-2xl font-black text-white mb-6 tracking-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]">
              Diagnostic Services
            </h3>

            {/* Services List */}
            <div className="space-y-4">
              {diagnosticServices.map((service) => {
                const isCurrentBooked = bookedService === service.name;

                return (
                  <div
                    key={service.id}
                    className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/25 transition-all group"
                  >
                    <div className="flex items-center gap-3.5 sm:gap-4">
                      {/* Custom Icon Representation */}
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 bg-white/20 border border-white/30 p-2 group-hover:scale-105 transition-transform">
                        {service.iconType === 'blood' && (
                          <svg viewBox="0 0 40 40" className="w-8 h-8">
                            <path
                              d="M20 6C20 6 10 18 10 25C10 30.5228 14.4772 35 20 35C25.5228 35 30 30.5228 30 25C30 18 20 6 20 6Z"
                              fill="#EF4444"
                            />
                            <ellipse cx="16" cy="22" rx="2.5" ry="4.5" fill="#FCA5A5" transform="rotate(-25 16 22)" />
                          </svg>
                        )}
                        {service.iconType === 'xray' && (
                          <div className="w-9 h-9 bg-slate-900/80 rounded-lg flex items-center justify-center border border-white/30">
                            <svg viewBox="0 0 24 24" className="w-6 h-6 stroke-cyan-400 stroke-[1.5] fill-none">
                              <path d="M12 4v16M8 8c2 2 6 2 8 0M7 12c3 2 7 2 10 0M8 16c2 1 6 1 8 0" />
                            </svg>
                          </div>
                        )}
                        {service.iconType === 'mri' && (
                          <div className="w-9 h-9 bg-emerald-950/70 rounded-lg flex items-center justify-center border border-emerald-400/40">
                            <svg viewBox="0 0 24 24" className="w-6 h-6 stroke-emerald-300 stroke-2 fill-none">
                              <rect x="3" y="6" width="18" height="12" rx="3" />
                              <circle cx="12" cy="12" r="3" />
                              <path d="M7 18v2M17 18v2" />
                            </svg>
                          </div>
                        )}
                        {service.iconType === 'ct' && (
                          <div className="w-9 h-9 bg-cyan-950/70 rounded-lg flex items-center justify-center border border-cyan-400/40">
                            <svg viewBox="0 0 24 24" className="w-6 h-6 stroke-cyan-300 stroke-2 fill-none">
                              <circle cx="12" cy="12" r="7" />
                              <circle cx="12" cy="12" r="3" fill="#38BDF8" fillOpacity="0.3" />
                              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Title & Details */}
                      <div>
                        <h4 className="text-[16px] sm:text-[17px] font-bold text-white group-hover:text-cyan-300 transition-colors drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]">
                          {service.name}
                        </h4>
                        <p className="text-xs sm:text-sm text-gray-200 font-medium drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
                          {service.subtitle}
                        </p>
                      </div>
                    </div>

                    {/* Book Button */}
                    <button
                      type="button"
                      onClick={() => handleBook(service)}
                      className={`px-5 sm:px-6 py-2 rounded-xl text-sm font-bold transition-all shadow-sm cursor-pointer ${
                        isCurrentBooked
                          ? 'bg-[#10B981] text-white shadow-emerald-500/20 animate-pulse'
                          : 'bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-95 text-white shadow-blue-500/20'
                      }`}
                    >
                      {isCurrentBooked ? 'Booked!' : 'Book'}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* View All Services Button */}
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setAllServicesOpen(!allServicesOpen)}
                className="w-full py-3.5 px-4 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-[15px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-white/30"
              >
                <span>{allServicesOpen ? 'Hide Full Catalog' : 'View All Services'}</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>

              {allServicesOpen && (
                <div className="mt-4 p-4 rounded-2xl bg-white/10 border border-white/20 text-sm text-gray-100 space-y-2">
                  <div className="flex items-center justify-between py-1 border-b border-white/15">
                    <span className="font-medium">Echocardiogram (Echo 2D/3D)</span>
                    <span className="font-bold text-cyan-300">৳ 3,500</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-white/15">
                    <span className="font-medium">Complete Blood Count (CBC)</span>
                    <span className="font-bold text-cyan-300">৳ 650</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-white/15">
                    <span className="font-medium">HbA1c Diabetes Profile</span>
                    <span className="font-bold text-cyan-300">৳ 1,100</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="font-medium">USG of Whole Abdomen</span>
                    <span className="font-bold text-cyan-300">৳ 2,200</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Ambulance & Blood Bank Cards & Direct Emergency Message */}
          <div className="lg:col-span-6 xl:col-span-6 flex flex-col gap-6">
            {/* Ambulance Card */}
            <div className="bg-white/10 rounded-[28px] p-6 sm:p-7 border border-white/30 shadow-[0_12px_40px_rgba(0,0,0,0.35)] flex items-center gap-6 group hover:bg-white/15 transition-all">
              {/* 3D Ambulance Vector */}
              <div className="w-32 sm:w-44 h-24 sm:h-28 bg-white/15 rounded-2xl flex items-center justify-center p-3 shrink-0 border border-white/30 relative overflow-hidden">
                <svg viewBox="0 0 120 70" className="w-full h-full drop-shadow-md">
                  <rect x="15" y="18" width="80" height="34" rx="4" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="2" />
                  <path d="M70 18 L90 28 L95 52 L70 52 Z" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="2" />
                  <path d="M72 23 L86 31 L86 40 L72 40 Z" fill="#93C5FD" opacity="0.8" />
                  <rect x="15" y="38" width="80" height="6" fill="#EF4444" />
                  <rect x="38" y="24" width="14" height="4" fill="#EF4444" />
                  <rect x="43" y="19" width="4" height="14" fill="#EF4444" />
                  <rect x="35" y="13" width="8" height="5" rx="2" fill="#EF4444" />
                  <rect x="47" y="13" width="8" height="5" rx="2" fill="#3B82F6" />
                  <circle cx="35" cy="52" r="8" fill="#1E293B" />
                  <circle cx="35" cy="52" r="3.5" fill="#94A3B8" />
                  <circle cx="80" cy="52" r="8" fill="#1E293B" />
                  <circle cx="80" cy="52" r="3.5" fill="#94A3B8" />
                </svg>
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-black text-white mb-1 tracking-tight drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]">
                  Ambulance
                </h3>
                <span className="inline-block text-sm sm:text-base font-bold text-cyan-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
                  Coming Soon
                </span>
                <p className="text-xs text-gray-200 mt-1.5 hidden sm:block font-medium">
                  Fastest dispatch with live GPS tracking
                </p>
              </div>
            </div>

            {/* Blood Bank Card */}
            <div className="bg-white/10 rounded-[28px] p-6 sm:p-7 border border-white/30 shadow-[0_12px_40px_rgba(0,0,0,0.35)] flex items-center gap-6 group hover:bg-white/15 transition-all">
              {/* 3D Blood Drop Vector */}
              <div className="w-32 sm:w-44 h-24 sm:h-28 bg-white/15 rounded-2xl flex items-center justify-center p-3 shrink-0 border border-white/30 relative">
                <svg viewBox="0 0 80 80" className="w-16 h-16 drop-shadow-lg group-hover:scale-105 transition-transform">
                  <path
                    d="M40 10 C40 10 16 38 16 52 C16 65.2548 26.7452 76 40 76 C53.2548 76 64 65.2548 64 52 C64 38 40 10 40 10 Z"
                    fill="url(#bloodGrad)"
                  />
                  <ellipse cx="30" cy="46" rx="4" ry="10" fill="#FFFFFF" opacity="0.4" transform="rotate(-28 30 46)" />
                  <defs>
                    <linearGradient id="bloodGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#EF4444" />
                      <stop offset="60%" stopColor="#DC2626" />
                      <stop offset="100%" stopColor="#991B1B" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-black text-white mb-1 tracking-tight drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]">
                  Blood Bank
                </h3>
                <span className="inline-block text-sm sm:text-base font-bold text-rose-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
                  Coming Soon
                </span>
                <p className="text-xs text-gray-200 mt-1.5 hidden sm:block font-medium">
                  Verified donors &amp; blood group matching
                </p>
              </div>
            </div>

            {/* Request Callback / Submit Inquiry Form */}
            <div className="bg-white/10 rounded-[28px] p-6 border border-white/30 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
              <h4 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <span>Direct Helpline Request</span>
                {inquirySubmitted && (
                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Sent!
                  </span>
                )}
              </h4>
              <form onSubmit={handleInquirySubmit} className="space-y-3">
                <input
                  type="text"
                  placeholder="Your Phone Number (e.g., 01700000000)"
                  value={userPhone}
                  onChange={(e) => setUserPhone(e.target.value)}
                  className="w-full bg-black/40 border border-white/25 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-400 outline-none focus:border-cyan-400"
                />
                <input
                  type="text"
                  placeholder="Inquiry / Special Note"
                  value={contactMsg}
                  onChange={(e) => setContactMsg(e.target.value)}
                  className="w-full bg-black/40 border border-white/25 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-400 outline-none focus:border-cyan-400"
                />
                <button
                  type="submit"
                  disabled={isSubmittingInquiry}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmittingInquiry ? 'Submitting...' : 'Request Emergency Callback'}</span>
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Contact Numbers & About Details Section */}
        <div className="bg-white/10 rounded-[32px] p-6 sm:p-10 border border-white/30 shadow-[0_15px_45px_rgba(0,0,0,0.35)]">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-8 mb-8 border-b border-white/20 gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 text-xs font-bold uppercase tracking-wider mb-2">
                <Phone className="w-3.5 h-3.5" />
                <span>24/7 Support &amp; Emergency Hub</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">
                Contact &amp; Emergency Helpline Directory
              </h3>
              <p className="text-sm sm:text-base text-gray-200 mt-1 font-medium drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]">
                Connect instantly with verified dispatchers, lab coordinators, and hospital representatives.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <a
                href="tel:+8809612444999"
                className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-md shadow-blue-500/30 transition-all cursor-pointer"
              >
                <Phone className="w-4 h-4" />
                <span>Call Emergency</span>
              </a>
            </div>
          </div>

          {/* Grid of Contact Numbers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {contactNumbers.map((c) => {
              const isCopied = copiedNumber === c.number;

              return (
                <div
                  key={c.title}
                  className="bg-white/10 rounded-2xl p-5 border border-white/25 flex flex-col justify-between hover:border-white/45 hover:bg-white/15 transition-all group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300 bg-cyan-500/20 border border-cyan-400/30 px-2.5 py-0.5 rounded-full">
                        {c.badge}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(c.number)}
                        className="text-gray-300 hover:text-white p-1 rounded transition-colors cursor-pointer"
                        title="Copy number"
                      >
                        {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>

                    <h4 className="text-sm font-bold text-white mb-1 drop-shadow">
                      {c.title}
                    </h4>
                    <a
                      href={`tel:${c.number.replace(/\s+/g, '')}`}
                      className="text-lg sm:text-xl font-black text-cyan-300 hover:text-cyan-200 hover:underline tracking-tight block my-1 font-mono drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]"
                    >
                      {c.number}
                    </a>
                    <p className="text-xs text-gray-300 mt-1">
                      {c.desc}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-xs text-cyan-300 font-bold">
                    <a href={`tel:${c.number.replace(/\s+/g, '')}`} className="flex items-center gap-1 hover:underline">
                      <span>Dial Number</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                    {isCopied && <span className="text-emerald-400 font-semibold">Copied!</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* About Us & Location Footer Strip */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-white/20 text-sm text-gray-200">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-cyan-300 shrink-0 border border-white/25">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h5 className="font-bold text-white">Central Operations</h5>
                <p className="text-xs text-gray-300 mt-0.5">Plot 42, Road 11, Block E, Banani, Dhaka 1213</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-cyan-300 shrink-0 border border-white/25">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <h5 className="font-bold text-white">Support &amp; Inquiries</h5>
                <a href="mailto:support@mediconnect.care" className="text-xs text-cyan-300 hover:underline mt-0.5 block">
                  support@mediconnect.care
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-cyan-300 shrink-0 border border-white/25">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h5 className="font-bold text-white">Hours of Operation</h5>
                <p className="text-xs text-gray-300 mt-0.5">Emergency: 24/7/365 | Diagnostics: 7 AM – 11 PM</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

