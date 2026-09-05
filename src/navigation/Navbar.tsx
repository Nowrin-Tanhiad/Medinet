import { UserProfile } from './AuthModal.tsx';
import { LayoutDashboard } from 'lucide-react';


export type NavTab = 'Home' | 'Network' | 'Services' | 'About Us' | 'Contact' | 'Dashboard';

interface NavbarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
  onLogout?: () => void;
  onOpenDashboard: () => void;
}

export function Navbar({ activeTab, onSelectTab, currentUser, onOpenAuth, onOpenDashboard }: NavbarProps) {
  const navItems: ('Home' | 'Network' | 'Services' | 'About Us' | 'Contact')[] = ['Home', 'Network', 'Services', 'About Us', 'Contact'];

  return (
    <header className="absolute top-0 left-0 right-0 z-50 w-full bg-transparent">
      <div className="max-w-[1440px] mx-auto px-6 sm:px-12 lg:px-16 pt-8 pb-4 flex items-center justify-between">
        {/* Brand Logo */}
        <div
          id="brand-logo"
          onClick={() => onSelectTab('Home')}
          className="flex items-center gap-3 cursor-pointer select-none"
        >
          <div className="relative w-10 h-10 flex items-center justify-center">
            {/* Custom Medical Cross with teal-to-blue gradient */}
            <svg
              viewBox="0 0 44 44"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-10 h-10 drop-shadow-[0_1px_2px_rgba(0,102,255,0.15)]"
            >
              <defs>
                <linearGradient id="horizontalGrad" x1="0%" y1="50%" x2="100%" y2="50%">
                  <stop offset="0%" stopColor="#00C5E5" />
                  <stop offset="50%" stopColor="#008BE5" />
                  <stop offset="100%" stopColor="#005BFF" />
                </linearGradient>
                <linearGradient id="verticalGrad" x1="50%" y1="0%" x2="50%" y2="100%">
                  <stop offset="0%" stopColor="#009BE5" />
                  <stop offset="50%" stopColor="#0072FF" />
                  <stop offset="100%" stopColor="#004AD6" />
                </linearGradient>
              </defs>
              {/* Horizontal Pill */}
              <rect
                x="2"
                y="14"
                width="40"
                height="16"
                rx="8"
                fill="url(#horizontalGrad)"
              />
              {/* Vertical Pill */}
              <rect
                x="14"
                y="2"
                width="16"
                height="40"
                rx="8"
                fill="url(#verticalGrad)"
                fillOpacity="0.9"
              />
            </svg>
          </div>
          <span className="text-[26px] font-bold tracking-[-0.02em] text-[#0A192F]">
            MediConnect
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-10">
          {navItems.map((item) => {
            const isActive = activeTab === item;
            return (
              <button
                key={item}
                id={`nav-${item.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => onSelectTab(item)}
                className={`relative text-[17px] font-medium transition-colors py-1 cursor-pointer ${
                  isActive
                    ? 'text-[#0066FF] font-semibold'
                    : 'text-[#0A192F] hover:text-[#0066FF]'
                }`}
              >
                {item}
                {isActive && (
                  <span className="absolute -bottom-1 left-0 right-0 h-[3px] bg-[#0066FF] rounded-full transition-all" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Action Button */}
        <div>
          {currentUser ? (
            <button
              onClick={onOpenDashboard}
              className="bg-[#0066FF] hover:bg-[#0055E0] active:scale-[0.98] text-white text-[16px] font-semibold px-6 py-2.5 rounded-xl transition-all duration-150 shadow-[0_2px_8px_rgba(0,102,255,0.25)] flex items-center gap-2 cursor-pointer"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>
          ) : (
            <button
              id="header-get-started-btn"
              onClick={onOpenAuth}
              className="bg-[#0066FF] hover:bg-[#0055E0] active:scale-[0.98] text-white text-[16px] font-semibold px-6 py-2.5 rounded-xl transition-all duration-150 shadow-[0_2px_8px_rgba(0,102,255,0.25)] cursor-pointer"
            >
              login/signup
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
