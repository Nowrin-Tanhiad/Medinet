import { useState, useEffect } from 'react';
import { Navbar, NavTab } from './navigation/Navbar.tsx';
import { AuthModal, UserProfile } from './navigation/AuthModal.tsx';
import { Home } from './home/Home.tsx';
import { Network } from './network/Network.tsx';
import { Services } from './services/Services.tsx';
import { ServicesVideoLanding } from './services/ServicesVideoLanding.tsx';
import { DiagnosticsContact } from './about_contact/AboutContact.tsx';
import { PatientDashboard } from './patient/PatientDashboard.tsx';
import { DoctorDashboard } from './doctor/DoctorDashboard.tsx';
import { AdminDashboard } from './admin/AdminDashboard.tsx';
import { PatientOnboardingModal } from './patient/PatientOnboardingModal.tsx';
import { getApiUrl } from './utils/api.ts';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('Home');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'website' | 'dashboard'>(() => {
    const isTabSessionActive = sessionStorage.getItem('medinet_tab_active');
    if (!isTabSessionActive) return 'website';
    const saved = sessionStorage.getItem('medinet_viewMode');
    return saved === 'dashboard' ? 'dashboard' : 'website';
  });

  // Synchronize viewMode with sessionStorage for tab session
  useEffect(() => {
    if (currentUser) {
      sessionStorage.setItem('medinet_tab_active', 'true');
      sessionStorage.setItem('medinet_viewMode', viewMode);
    }
  }, [viewMode, currentUser]);

  // Check current user session on mount
  useEffect(() => {
    fetch(getApiUrl('me.php'))
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.user) {
          setCurrentUser(data.user);
          sessionStorage.setItem('medinet_tab_active', 'true');
          const hashLower = window.location.hash.toLowerCase();
          const savedMode = sessionStorage.getItem('medinet_viewMode');
          if (savedMode === 'dashboard' || hashLower.includes('doctor') || hashLower.includes('admin') || hashLower.includes('dashboard') || hashLower.includes('queue') || hashLower.includes('reviews')) {
            setViewMode('dashboard');
          }
          if (data.user.role === 'patient') {
            checkPatientProfileStatus();
          }
        } else {
          setCurrentUser(null);
          setViewMode('website');
          sessionStorage.clear();
        }
      })
      .catch(() => {
        setCurrentUser(null);
        setViewMode('website');
        sessionStorage.clear();
      });
  }, []);

  const checkPatientProfileStatus = async () => {
    try {
      const res = await fetch(getApiUrl('patient_profile.php'));
      const data = await res.json();
      if (data.success) {
        if (data.profile && data.profile.is_completed === 0) {
          setIsOnboardingModalOpen(true);
        }
        if (data.profile && data.profile.patient_uid) {
          setCurrentUser(prev => prev ? { ...prev, patient_uid: data.profile.patient_uid } : prev);
        }
      }
    } catch (e) {}
  };

  const handleAuthSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    sessionStorage.setItem('medinet_tab_active', 'true');
    sessionStorage.setItem('medinet_viewMode', 'dashboard');
    setViewMode('dashboard');
    if (user.role === 'patient' && (user.is_profile_completed === false || !user.patient_uid)) {
      setIsOnboardingModalOpen(true);
    }
  };

  const handleOnboardingComplete = (patientUid: string) => {
    setIsOnboardingModalOpen(false);
    sessionStorage.setItem('medinet_tab_active', 'true');
    sessionStorage.setItem('medinet_viewMode', 'dashboard');
    if (currentUser) {
      setCurrentUser({ ...currentUser, patient_uid: patientUid, is_profile_completed: true });
    }
    setViewMode('dashboard');
  };

  const handleLogout = async () => {
    try {
      await fetch(getApiUrl('logout.php'));
    } catch (e) {}
    setCurrentUser(null);
    sessionStorage.clear();
    localStorage.removeItem('medinet_viewMode');
    setViewMode('website');
  };

  // Scroll handler for landing sections
  useEffect(() => {
    if (viewMode !== 'website') return;

    const handleScroll = () => {
      const contactElem = document.getElementById('contact-section');
      const aboutElem = document.getElementById('about-contact-section');
      const servicesVideoElem = document.getElementById('services-video-section');
      const servicesElem = document.getElementById('services-section');
      const networkElem = document.getElementById('network-section');

      if (contactElem && contactElem.getBoundingClientRect().top <= window.innerHeight * 0.45) {
        setActiveTab('Contact');
      } else if (aboutElem && aboutElem.getBoundingClientRect().top <= window.innerHeight * 0.45) {
        setActiveTab('About Us');
      } else if (servicesVideoElem && servicesVideoElem.getBoundingClientRect().top <= window.innerHeight * 0.45) {
        setActiveTab('Services');
      } else if (servicesElem && servicesElem.getBoundingClientRect().top <= window.innerHeight * 0.45) {
        setActiveTab('Services');
      } else if (networkElem && networkElem.getBoundingClientRect().top <= window.innerHeight * 0.45) {
        setActiveTab('Network');
      } else {
        setActiveTab('Home');
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [viewMode]);

  useEffect(() => {
    if (viewMode === 'website') {
      const slugMap: Record<string, string> = {
        'Home': 'Home',
        'Network': 'Network',
        'Services': 'Services',
        'About Us': 'About-Us',
        'Contact': 'Contact'
      };
      const slug = slugMap[activeTab] || 'Home';
      const newHash = `#/${slug}`;
      if (window.location.hash !== newHash) {
        window.history.pushState(null, '', `/Medinet/${newHash}`);
      }
    }
  }, [activeTab, viewMode]);

  const scrollToSection = (tab: NavTab) => {
    setViewMode('website');
    setActiveTab(tab);
    setTimeout(() => {
      if (tab === 'Home') {
        const hero = document.getElementById('home-hero-section');
        if (hero) hero.scrollIntoView({ behavior: 'smooth' });
        else window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (tab === 'Network') {
        const networkElem = document.getElementById('network-section');
        if (networkElem) networkElem.scrollIntoView({ behavior: 'smooth' });
      } else if (tab === 'Services') {
        const servicesElem = document.getElementById('services-section');
        if (servicesElem) servicesElem.scrollIntoView({ behavior: 'smooth' });
      } else if (tab === 'About Us') {
        const aboutElem = document.getElementById('about-contact-section');
        if (aboutElem) aboutElem.scrollIntoView({ behavior: 'smooth' });
      } else if (tab === 'Contact') {
        const contactElem = document.getElementById('contact-section');
        if (contactElem) contactElem.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  if (viewMode === 'dashboard' && currentUser) {
    if (currentUser.role.toLowerCase() === 'doctor') {
      return (
        <div className="relative w-full min-h-screen">
          <DoctorDashboard 
            user={currentUser} 
            onLogout={handleLogout} 
          />
        </div>
      );
    }

    if (currentUser.role.toLowerCase() === 'admin') {
      return (
        <div className="relative w-full min-h-screen">
          <AdminDashboard 
            user={currentUser} 
            onLogout={handleLogout} 
          />
        </div>
      );
    }

    return (
      <div className="relative w-full min-h-screen">
        <PatientDashboard 
          user={currentUser} 
          onLogout={handleLogout}
          onNavigateTab={(tab) => {
            if (tab === 'Services' || tab === 'Network') {
              scrollToSection(tab as any);
            }
          }}
        />

        {/* Onboarding Modal if needed */}
        <PatientOnboardingModal
          isOpen={isOnboardingModalOpen}
          userName={currentUser.name}
          onComplete={handleOnboardingComplete}
        />
      </div>
    );
  }

  return (
    <div className="relative w-full flex flex-col font-['Plus_Jakarta_Sans',sans-serif] selection:bg-blue-200 overflow-x-hidden scroll-smooth">
      {/* Top Navbar */}
      <Navbar 
        activeTab={activeTab} 
        onSelectTab={scrollToSection}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        onOpenDashboard={() => setViewMode('dashboard')}
      />

      {/* 1st Section: Home Hero Section */}
      <Home onExploreNetwork={() => scrollToSection('Network')} />

      {/* 2nd Section: Network Referral Section */}
      <Network />

      {/* 3rd Section: Services Room Booking Section */}
      <Services />

      {/* 4th Section: Services Video Showcase */}
      <ServicesVideoLanding />

      {/* 5th Section: Diagnose, Book, Save Lives (About & Contact) */}
      <DiagnosticsContact />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* First-Time Patient Onboarding Modal */}
      {currentUser && (
        <PatientOnboardingModal
          isOpen={isOnboardingModalOpen}
          userName={currentUser.name}
          onComplete={handleOnboardingComplete}
        />
      )}
    </div>
  );
}
