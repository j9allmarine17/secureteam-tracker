import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";

interface HeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export default function Header({ title, subtitle, action }: HeaderProps) {
  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });

  // Get active users (simulated for demo - in real app this would be websocket data)
  const activeUsers = users?.slice(0, 5) || [];

  return (
    <header className="bg-[hsl(var(--primary-bg))] border-b border-[hsl(var(--secondary-bg))] p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          {subtitle && <p className="text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className="flex items-center space-x-4">
          {/* Real-time collaboration indicators */}
          <div className="flex items-center space-x-2">
            <div className="flex -space-x-2">
              {activeUsers.map((user: any, index: number) => (
                <Avatar key={user.id} className="w-8 h-8 border-2 border-[hsl(var(--primary-bg))]">
                  <AvatarImage src={user.profileImageUrl} alt={`${user.firstName} ${user.lastName}`} />
                  <AvatarFallback className="bg-[hsl(var(--secondary-bg))] text-white text-xs">
                    {user.firstName?.[0]}{user.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
              ))}
              {activeUsers.length > 4 && (
                <div className="w-8 h-8 bg-[hsl(var(--secondary-bg))] rounded-full border-2 border-[hsl(var(--primary-bg))] flex items-center justify-center text-xs text-white">
                  +{activeUsers.length - 4}
                </div>
              )}
            </div>
            <span className="text-sm text-gray-400">
              {activeUsers.length} active
            </span>
          </div>
          {action}
        </div>
      </div>
    </header>
  );
}
