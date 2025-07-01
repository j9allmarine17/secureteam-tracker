import backgroundImage from '@/assets/redteam-background.png';

export function BackgroundWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-fixed bg-no-repeat"
      style={{
        backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.85), rgba(15, 23, 42, 0.85)), url(${backgroundImage})`,
      }}
    >
      {children}
    </div>
  );
}