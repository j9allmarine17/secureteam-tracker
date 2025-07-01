import { Link, useLocation } from "wouter";
import { Shield, Home, Search, Users, FileText, Settings, LogOut, MessageSquare, Network, Server } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Sidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  const canManageUsers = user?.role === 'admin' || user?.role === 'team_lead';

  const navigation = [
    { name: "Dashboard", href: "/", icon: Home },
    { name: "Findings", href: "/findings", icon: Search },
    { name: "Visualizations", href: "/visualizations", icon: Network },
    { name: "Chat", href: "/chat", icon: MessageSquare },
    ...(canManageUsers ? [{ name: "Team", href: "/team", icon: Users }] : []),
    { name: "Reports", href: "/reports", icon: FileText },
    { name: "Settings", href: "/settings", icon: Settings },
    ...(user?.role === 'admin' ? [{ name: "AD Test", href: "/ad-test", icon: Server }] : []),
  ];

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="w-64 bg-[hsl(var(--primary-bg))] border-r border-[hsl(var(--secondary-bg))] flex flex-col">
      {/* Logo and Brand */}
      <div className="p-6 border-b border-[hsl(var(--secondary-bg))]">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-[hsl(var(--accent-green))] rounded-lg flex items-center justify-center">
            <Shield className="text-[hsl(var(--dark))] text-sm" />
          </div>
          <h1 className="text-xl font-bold text-white">RedTeam Collab</h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;
          
          return (
            <Link key={item.name} href={item.href} className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
              isActive 
                ? "sidebar-active" 
                : "sidebar-inactive"
            }`}>
              <Icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-[hsl(var(--secondary-bg))]">
        <div className="flex items-center space-x-3 mb-3">
          <Avatar className="w-10 h-10">
            <AvatarFallback className="bg-[hsl(var(--secondary-bg))] text-white">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="text-sm font-medium text-white">
              {user?.firstName} {user?.lastName}
            </div>
            <div className="text-xs text-gray-400 capitalize">
              {user?.role?.replace('_', ' ')}
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors text-sm w-full"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
