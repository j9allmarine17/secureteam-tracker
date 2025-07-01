import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Clock, MessageCircle, MoreVertical, Edit, Trash2, FileImage, Code, Shield } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/use-auth";

interface FindingCardProps {
  finding: any;
  onClick?: () => void;
  onEdit?: (finding: any) => void;
  onDelete?: (findingId: number) => void;
}

export default function FindingCard({ finding, onClick, onEdit, onDelete }: FindingCardProps) {
  const { user } = useAuth();
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'severity-critical';
      case 'high': return 'severity-high';
      case 'medium': return 'severity-medium';
      case 'low': return 'severity-low';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-yellow-500/20 text-yellow-400';
      case 'in_progress': return 'bg-blue-500/20 text-blue-400';
      case 'resolved': return 'bg-green-500/20 text-green-400';
      case 'verified': return 'bg-purple-500/20 text-purple-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatCategory = (category: string) => {
    return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const assignedUsers = Array.isArray(finding.assignedUsers) ? finding.assignedUsers : [];

  return (
    <div 
      className={`finding-card ${finding.severity} rounded-xl border p-6 cursor-pointer`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <Badge className={getSeverityColor(finding.severity)}>
              {finding.severity.toUpperCase()}
            </Badge>
            <Badge variant="secondary" className="bg-[hsl(var(--secondary-bg))] text-gray-300">
              {formatCategory(finding.category)}
            </Badge>
            <Badge className={getStatusColor(finding.status)}>
              {formatStatus(finding.status)}
            </Badge>
          </div>
          
          <h3 className="text-xl font-semibold mb-2 text-white">
            {finding.title}
          </h3>
          
          <p className="text-gray-400 mb-3 line-clamp-2">
            {finding.description}
          </p>
          
          <div className="flex items-center space-x-6 text-sm text-gray-400">
            <span className="flex items-center space-x-1">
              <span>Reported by {finding.reportedBy?.firstName} {finding.reportedBy?.lastName}</span>
            </span>
            <span className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>{formatDistanceToNow(new Date(finding.createdAt), { addSuffix: true })}</span>
            </span>
            <span className="flex items-center space-x-1">
              <MessageCircle className="w-4 h-4" />
              <span>{finding.commentsCount || 0} comments</span>
            </span>
          </div>
        </div>
        
        <div className="flex items-center justify-between space-x-3 ml-6">
          {/* Assignment Display */}
          <div className="flex items-center space-x-2">
            {assignedUsers.length > 0 ? (
              <>
                <span className="text-xs text-gray-400">Assigned to:</span>
                <div className="flex -space-x-2">
                  {assignedUsers.slice(0, 3).map((user: any) => (
                    <Avatar key={user.id} className="w-6 h-6 border border-[hsl(var(--primary-bg))]" title={`${user.firstName} ${user.lastName}`}>
                      <AvatarImage src={user.profileImageUrl} alt={`${user.firstName} ${user.lastName}`} />
                      <AvatarFallback className="bg-[hsl(var(--accent-green))] text-[hsl(var(--dark))] text-xs">
                        {user.firstName?.[0]}{user.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {assignedUsers.length > 3 && (
                    <div className="w-6 h-6 bg-[hsl(var(--secondary-bg))] rounded-full border border-[hsl(var(--primary-bg))] flex items-center justify-center text-xs text-white" title={`+${assignedUsers.length - 3} more`}>
                      +{assignedUsers.length - 3}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <span className="text-xs text-gray-500">Unassigned</span>
            )}</div>
          {/* Action Menu */}
          {(user?.role === 'admin' || user?.role === 'team_lead' || finding.reportedById === user?.id || 
            (finding.assignedTo && Array.isArray(finding.assignedTo) && finding.assignedTo.includes(user?.id))) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-gray-400 hover:text-white h-8 w-8 p-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[hsl(var(--primary-bg))] border-[hsl(var(--secondary-bg))]">
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit?.(finding);
                  }}
                  className="text-white hover:bg-[hsl(var(--secondary-bg))] cursor-pointer"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Finding
                </DropdownMenuItem>
                {(user?.role === 'admin' || user?.role === 'team_lead') && (
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete?.(finding.id);
                    }}
                    className="text-red-400 hover:bg-red-500/10 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Finding
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      
      {/* Evidence Preview */}
      <div className="flex items-center space-x-4 text-sm text-gray-400">
        <div className="flex items-center space-x-2">
          <FileImage className="w-4 h-4" />
          <span>Evidence files</span>
        </div>
        {finding.payload && (
          <div className="flex items-center space-x-2">
            <Code className="w-4 h-4" />
            <span>Payload examples</span>
          </div>
        )}
        {finding.cvssScore && (
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4" />
            <span>CVSS: {finding.cvssScore}</span>
          </div>
        )}
      </div>
    </div>
  );
}
