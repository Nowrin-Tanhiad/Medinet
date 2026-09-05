export function ServicesVideoLanding() {
  return (
    <section
      id="services-video-section"
      className="relative w-full min-h-screen bg-black flex items-center justify-center overflow-hidden"
    >
      {/* Full screen looping muted video without sound or altering overlays */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="w-full h-full min-h-screen object-cover"
      >
        <source
          src="https://res.cloudinary.com/mfkfoksw/video/upload/v1787764727/149f9ff6-8f7f-4cdb-a772-c7a96df04cc2_xychml.mp4"
          type="video/mp4"
        />
      </video>
    </section>
  );
}
