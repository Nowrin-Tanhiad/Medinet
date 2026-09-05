import { ArrowRight } from 'lucide-react';

interface HomeProps {
  onExploreNetwork: () => void;
}

export function Home({ onExploreNetwork }: HomeProps) {
  return (
    <section
      id="home-hero-section"
      className="relative min-h-screen w-full flex flex-col justify-center overflow-hidden"
    >
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover -z-10"
      >
        <source
          src="https://res.cloudinary.com/mfkfoksw/video/upload/v1787940926/b2039a5d-2c81-438a-a53d-72c572860ed6_jmieq5.mp4"
          type="video/mp4"
        />
      </video>

      <main className="flex-1 flex flex-col justify-center w-full max-w-[1440px] mx-auto px-6 sm:px-12 lg:px-16 pt-28 sm:pt-32 lg:pt-36 pb-16">
        <div className="max-w-3xl">
          {/* Main Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-[76px] font-extrabold tracking-[-0.03em] leading-[1.08] mb-6">
            <span className="block text-[#0A192F]">All Hospitals.</span>
            <span className="block text-[#0066FF]">One Network.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl sm:text-2xl md:text-[26px] font-medium text-[#0A192F] leading-[1.4] tracking-[-0.01em] mb-10 sm:mb-12 max-w-xl">
            Public and private hospitals,<br />
            connected for better care.
          </p>

          {/* Stats Card Container - Transparent, No Blur Filter */}
          <div
            id="stats-card"
            className="bg-white/20 rounded-[26px] sm:rounded-[30px] p-6 sm:p-8 lg:p-9 inline-block w-full max-w-[580px] border border-white/20"
          >
            {/* Stats Row */}
            <div className="flex items-center justify-between gap-4 sm:gap-6 mb-7 pb-1">
              {/* Stat 1 */}
              <div className="flex-1 min-w-0">
                <div className="text-2xl sm:text-[32px] md:text-[34px] font-extrabold text-[#0A192F] tracking-[-0.02em] leading-tight mb-1">
                  39,000+
                </div>
                <div className="text-sm sm:text-[15px] font-medium text-[#0A192F] whitespace-nowrap">
                  Registered Hospitals
                </div>
              </div>

              {/* Vertical Divider */}
              <div className="h-11 w-[1.5px] bg-[#0A192F]/20 flex-shrink-0" />

              {/* Stat 2 */}
              <div className="flex-1 min-w-0 pl-1 sm:pl-2">
                <div className="text-2xl sm:text-[32px] md:text-[34px] font-extrabold text-[#0A192F] tracking-[-0.02em] leading-tight mb-1">
                  134,568+
                </div>
                <div className="text-sm sm:text-[15px] font-medium text-[#0A192F] whitespace-nowrap">
                  Registered Doctors
                </div>
              </div>

              {/* Vertical Divider */}
              <div className="h-11 w-[1.5px] bg-[#0A192F]/20 flex-shrink-0" />

              {/* Stat 3 */}
              <div className="flex-1 min-w-0 pl-1 sm:pl-2">
                <div className="text-2xl sm:text-[32px] md:text-[34px] font-extrabold text-[#0A192F] tracking-[-0.02em] leading-tight mb-1">
                  64
                </div>
                <div className="text-sm sm:text-[15px] font-medium text-[#0A192F] whitespace-nowrap">
                  Districts (U.N.)
                </div>
              </div>
            </div>

            {/* Explore Button */}
            <div>
              <button
                id="explore-network-btn"
                onClick={onExploreNetwork}
                className="bg-[#0066FF] hover:bg-[#0055E0] active:scale-[0.98] text-white text-[15px] sm:text-[16px] font-semibold px-6 sm:px-7 py-3 sm:py-3.5 rounded-xl flex items-center gap-3 transition-all duration-150 shadow-[0_2px_8px_rgba(0,102,255,0.25)] cursor-pointer"
              >
                <span>Explore Network</span>
                <ArrowRight className="w-5 h-5 stroke-[2.2]" />
              </button>
            </div>
          </div>
        </div>
      </main>
    </section>
  );
}
