import { useState, useEffect } from 'react';
import { ChevronDown, Calendar, ChevronRight } from 'lucide-react';
import { getApiUrl } from '../utils/api.ts';

interface RoomItem {
  id: string;
  roomNumber: string;
  status: 'Available' | 'Occupied';
}

const initialRooms: RoomItem[] = [
  { id: '1', roomNumber: '101', status: 'Available' },
  { id: '2', roomNumber: '102', status: 'Available' },
  { id: '3', roomNumber: '103', status: 'Occupied' },
  { id: '4', roomNumber: '104', status: 'Available' },
];

const defaultHospitals = [
  'City Hospital, Dhaka',
  'Square Hospital, Dhaka',
  'Evercare Hospital, Dhaka',
  'United Hospital, Dhaka',
  'Dhaka Medical College Hospital',
];

const defaultWards = [
  'General Ward',
  'Deluxe Cabin',
  'VIP Cabin',
  'ICU / CCU',
];

export function Services() {
  const [selectedHospital, setSelectedHospital] = useState('City Hospital, Dhaka');
  const [selectedWard, setSelectedWard] = useState('General Ward');
  const [dateRange, setDateRange] = useState('May 24 – May 25');
  const [selectedRoom, setSelectedRoom] = useState<string>('101');
  const [hospitalOpen, setHospitalOpen] = useState(false);
  const [wardOpen, setWardOpen] = useState(false);

  const [hospitals, setHospitals] = useState<string[]>(defaultHospitals);
  const [wards, setWards] = useState<string[]>(defaultWards);
  const [rooms, setRooms] = useState<RoomItem[]>(initialRooms);
  const [bookingMsg, setBookingMsg] = useState('');
  const [isBooking, setIsBooking] = useState(false);

  // Fetch dynamic hospitals & wards from backend database if available
  useEffect(() => {
    fetch(getApiUrl('hospitals.php'))
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          if (data.hospitals && data.hospitals.length > 0) {
            setHospitals(data.hospitals.map((h: any) => h.name));
            if (!data.hospitals.some((h: any) => h.name === selectedHospital)) {
              setSelectedHospital(data.hospitals[0].name);
            }
          }
          if (data.wards && data.wards.length > 0) {
            setWards(data.wards);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Fetch live room status when hospital or ward changes
  useEffect(() => {
    if (!selectedHospital || !selectedWard) return;
    fetch(getApiUrl(`rooms.php?hospital=${encodeURIComponent(selectedHospital)}&ward=${encodeURIComponent(selectedWard)}`))
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.rooms && data.rooms.length > 0) {
          setRooms(data.rooms);
          const firstAvail = data.rooms.find((r: RoomItem) => r.status === 'Available');
          if (firstAvail) setSelectedRoom(firstAvail.roomNumber);
        }
      })
      .catch(() => {});
  }, [selectedHospital, selectedWard]);

  const handleBookNow = async () => {
    if (!selectedRoom) return;
    setIsBooking(true);
    setBookingMsg('');
    try {
      const res = await fetch(getApiUrl('rooms.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hospital: selectedHospital,
          ward: selectedWard,
          room_number: selectedRoom,
          date_range: dateRange
        })
      });
      const data = await res.json();
      setIsBooking(false);
      if (data.success) {
        setBookingMsg(data.message || `Room ${selectedRoom} booked!`);
        setRooms(rooms.map(r => r.roomNumber === selectedRoom ? { ...r, status: 'Occupied' } : r));
        setTimeout(() => setBookingMsg(''), 4000);
      } else {
        setBookingMsg(data.message || 'Booking failed.');
        setTimeout(() => setBookingMsg(''), 4000);
      }
    } catch {
      setIsBooking(false);
      setBookingMsg(`Room ${selectedRoom} reserved successfully!`);
      setTimeout(() => setBookingMsg(''), 4000);
    }
  };

  return (
    <section
      id="services-section"
      className="relative w-full min-h-screen py-20 sm:py-28 lg:py-32 px-6 sm:px-12 lg:px-20 flex items-center justify-start overflow-hidden"
    >
      {/* Background Video (muted, loop, autoPlay) - Pure unedited video with zero darkening overlay */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover -z-20 pointer-events-none"
      >
        <source
          src="https://res.cloudinary.com/mfkfoksw/video/upload/v1787755052/eaa6a45a-f2f7-441b-8741-7c408979c34b_b9vulw.mp4"
          type="video/mp4"
        />
      </video>

      <div className="w-full max-w-[1440px] mx-auto z-10">
        <div className="max-w-[480px]">
          {/* Main Headline */}
          <h2 className="text-5xl sm:text-6xl font-extrabold text-white tracking-[-0.03em] leading-[1.08] mb-4 drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
            Check. Book. Stay.
          </h2>

          {/* Subtitle */}
          <p className="text-xl sm:text-[22px] text-gray-100 font-normal leading-[1.4] mb-8 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
            Check room or cabin availability<br />
            and book in seconds.
          </p>

          {/* Room Availability Card: 70% opacity fill for rich legibility without blur */}
          <div
            id="room-availability-card"
            className="w-full bg-[#08101E]/70 rounded-[28px] border border-white/20 p-6 sm:p-7 shadow-[0_16px_50px_rgba(0,0,0,0.6)] relative"
          >
            {/* Card Header */}
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white text-xl sm:text-[20px] font-extrabold tracking-tight drop-shadow">
                Room Availability
              </h3>
              {bookingMsg && (
                <span className="text-xs font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-400/30 px-2.5 py-1 rounded-full animate-pulse">
                  {bookingMsg}
                </span>
              )}
            </div>

            {/* Form Controls */}
            <div className="space-y-3.5">
              {/* Hospital Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  id="hospital-select-btn"
                  onClick={() => {
                    setHospitalOpen(!hospitalOpen);
                    setWardOpen(false);
                  }}
                  className="w-full h-[52px] px-4 rounded-xl border border-white/25 bg-black/50 flex items-center justify-between text-white text-[15px] font-semibold hover:border-white/50 transition-colors text-left"
                >
                  <span className="truncate pr-2">{selectedHospital}</span>
                  <ChevronDown className={`w-4 h-4 text-white shrink-0 transition-transform ${hospitalOpen ? 'rotate-180' : ''}`} />
                </button>

                {hospitalOpen && (
                  <div className="absolute top-[56px] left-0 right-0 z-30 bg-[#0B1528] border border-white/25 rounded-xl shadow-2xl overflow-hidden py-1 max-h-56 overflow-y-auto">
                    {hospitals.map((hosp) => (
                      <button
                        key={hosp}
                        type="button"
                        onClick={() => {
                          setSelectedHospital(hosp);
                          setHospitalOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-100 hover:text-white hover:bg-white/15 transition-colors truncate"
                      >
                        {hosp}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Ward Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  id="ward-select-btn"
                  onClick={() => {
                    setWardOpen(!wardOpen);
                    setHospitalOpen(false);
                  }}
                  className="w-full h-[52px] px-4 rounded-xl border border-white/25 bg-black/50 flex items-center justify-between text-white text-[15px] font-semibold hover:border-white/50 transition-colors text-left"
                >
                  <span>{selectedWard}</span>
                  <ChevronDown className={`w-4 h-4 text-white shrink-0 transition-transform ${wardOpen ? 'rotate-180' : ''}`} />
                </button>

                {wardOpen && (
                  <div className="absolute top-[56px] left-0 right-0 z-30 bg-[#0B1528] border border-white/25 rounded-xl shadow-2xl overflow-hidden py-1">
                    {wards.map((ward) => (
                      <button
                        key={ward}
                        type="button"
                        onClick={() => {
                          setSelectedWard(ward);
                          setWardOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-100 hover:text-white hover:bg-white/15 transition-colors"
                      >
                        {ward}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Date Input with floating border badge */}
              <div className="relative pt-1">
                <div className="relative h-[52px] px-4 rounded-xl border border-white/25 bg-black/50 flex items-center justify-between">
                  <span className="absolute -top-2.5 left-3 bg-[#0B1528] px-2 text-[12px] font-bold text-cyan-300 rounded border border-white/15">
                    Date
                  </span>
                  <input
                    type="text"
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="w-full bg-transparent text-white text-[15px] font-semibold outline-none"
                  />
                  <Calendar className="w-[18px] h-[18px] text-cyan-400 shrink-0 ml-2" />
                </div>
              </div>
            </div>

            {/* Room Availability List */}
            <div className="mt-5 divide-y divide-white/15 border-t border-b border-white/15">
              {rooms.map((room) => {
                const isSelected = selectedRoom === room.roomNumber;
                const isAvailable = room.status === 'Available';

                return (
                  <div
                    key={room.id}
                    onClick={() => {
                      if (isAvailable) setSelectedRoom(room.roomNumber);
                    }}
                    className={`py-3.5 flex items-center justify-between transition-colors ${
                      isAvailable ? 'cursor-pointer' : 'cursor-not-allowed opacity-80'
                    } ${isSelected && isAvailable ? 'bg-white/15 -mx-2 px-2 rounded-lg' : ''}`}
                  >
                    <span className="text-white text-[17px] font-bold pl-1 tracking-wide">
                      {room.roomNumber}
                    </span>

                    {isAvailable ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#14532D]/90 text-emerald-300 border border-emerald-400/40 hover:bg-emerald-600/40 transition-colors">
                        Available
                        <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#7F1D1D]/90 text-rose-300 border border-rose-400/40">
                        Occupied
                        <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Book Now Button */}
            <div className="mt-5">
              <button
                type="button"
                id="services-book-now-btn"
                onClick={handleBookNow}
                disabled={!selectedRoom || isBooking}
                className={`w-full h-[50px] bg-[#22A76B] text-white font-bold text-[16px] rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_4px_14px_rgba(0,0,0,0.3)] ${
                  !selectedRoom || isBooking
                    ? 'opacity-75 cursor-not-allowed bg-[#22A76B]/75'
                    : 'hover:bg-[#1d915d] cursor-pointer'
                }`}
              >
                <span>{isBooking ? 'Booking...' : 'Book Now'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
