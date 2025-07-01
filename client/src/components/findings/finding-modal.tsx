import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Network, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import CommentSection from "@/components/comments/comment-section";
import { FileUpload } from "@/components/file-upload";
import NetworkTopologyDiagram from "@/components/diagrams/NetworkTopologyDiagram";
import ExploitationFlowDiagram from "@/components/diagrams/ExploitationFlowDiagram";

interface FindingModalProps {
  finding: any;
  onClose: () => void;
}

export default function FindingModal({ finding, onClose }: FindingModalProps) {
  const { data: detailedFinding } = useQuery({
    queryKey: ["/api/findings", finding.id],
    queryFn: async () => {
      const response = await fetch(`/api/findings/${finding.id}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
  });

  const currentFinding = detailedFinding || finding;

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

  const assignedUsers = Array.isArray(currentFinding.assignedUsers) ? currentFinding.assignedUsers : [];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-[hsl(var(--primary-bg))] border-[hsl(var(--secondary-bg))] max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader className="border-b border-[hsl(var(--secondary-bg))] pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Badge className={getSeverityColor(currentFinding.severity)}>
                {currentFinding.severity.toUpperCase()}
              </Badge>
              <DialogTitle className="text-2xl font-bold">
                {currentFinding.title}
              </DialogTitle>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </DialogHeader>
        
        <div className="space-y-6 pt-4">
          {/* Finding Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-[hsl(var(--secondary-bg))] border-[hsl(var(--border))]">
              <CardContent className="p-4">
                <h3 className="text-lg font-semibold mb-3 text-white">Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Severity:</span>
                    <Badge className={getSeverityColor(currentFinding.severity)}>
                      {currentFinding.severity.toUpperCase()}
                    </Badge>
                  </div>
                  {currentFinding.cvssScore && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">CVSS Score:</span>
                      <span className="font-medium text-white">{currentFinding.cvssScore}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-400">Category:</span>
                    <span className="font-medium text-white">{formatCategory(currentFinding.category)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status:</span>
                    <Badge className={getStatusColor(currentFinding.status)}>
                      {formatStatus(currentFinding.status)}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-[hsl(var(--secondary-bg))] border-[hsl(var(--border))]">
              <CardContent className="p-4">
                <h3 className="text-lg font-semibold mb-3 text-white">Assignment</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Reported by:</span>
                    <span className="font-medium text-white">
                      {currentFinding.reportedBy?.firstName} {currentFinding.reportedBy?.lastName}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Assigned to:</span>
                    {assignedUsers.length > 0 ? (
                      <div className="flex -space-x-1">
                        {assignedUsers.map((user: any) => (
                          <Avatar key={user.id} className="w-6 h-6 border border-[hsl(var(--primary-bg))]">
                            <AvatarImage src={user.profileImageUrl} alt={`${user.firstName} ${user.lastName}`} />
                            <AvatarFallback className="bg-[hsl(var(--accent-green))] text-[hsl(var(--dark))] text-xs">
                              {user.firstName?.[0]}{user.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400">Unassigned</span>
                    )}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Created:</span>
                    <span className="font-medium text-white">
                      {formatDistanceToNow(new Date(currentFinding.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Updated:</span>
                    <span className="font-medium text-white">
                      {formatDistanceToNow(new Date(currentFinding.updatedAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Description */}
          <Card className="bg-[hsl(var(--secondary-bg))] border-[hsl(var(--border))]">
            <CardContent className="p-4">
              <h3 className="text-lg font-semibold mb-3 text-white">Description</h3>
              <div className="bg-[hsl(var(--dark))] rounded-lg p-4 font-mono text-sm">
                <div className="text-gray-300 whitespace-pre-wrap">
                  {currentFinding.description}
                </div>
                {currentFinding.affectedUrl && (
                  <div className="mt-4 space-y-1">
                    <div className="text-gray-300">
                      <strong>Affected URL:</strong> {currentFinding.affectedUrl}
                    </div>
                  </div>
                )}
                {currentFinding.payload && (
                  <div className="mt-2">
                    <div className="text-gray-300">
                      <strong>Payload:</strong> {currentFinding.payload}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Interactive Visualizations */}
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-5 bg-[hsl(var(--secondary-bg))]">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="mitre">MITRE ATT&CK</TabsTrigger>
              <TabsTrigger value="network">
                <Network className="w-4 h-4 mr-2" />
                Network
              </TabsTrigger>
              <TabsTrigger value="exploitation">
                <Zap className="w-4 h-4 mr-2" />
                Exploitation
              </TabsTrigger>
              <TabsTrigger value="attachments">Files</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="space-y-4">
              <CommentSection findingId={currentFinding.id} />
            </TabsContent>
            
            <TabsContent value="mitre" className="space-y-4">
              {currentFinding.mitreAttack ? (
                <div className="space-y-6">
                  {/* MITRE ATT&CK Techniques */}
                  {currentFinding.mitreAttack.techniques && currentFinding.mitreAttack.techniques.length > 0 && (
                    <Card className="bg-[hsl(var(--secondary-bg))] border-[hsl(var(--border))]">
                      <CardContent className="p-4">
                        <h3 className="text-lg font-semibold mb-3 text-white flex items-center">
                          <span className="text-red-400 mr-2">⚡</span>
                          Attack Techniques
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {currentFinding.mitreAttack.techniques.map((technique: any, index: number) => (
                            <div key={index} className="bg-[hsl(var(--primary-bg))] p-3 rounded-lg border border-[hsl(var(--border))]">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-mono text-sm text-blue-400">{technique.id}</span>
                                <Badge className={`text-xs ${
                                  technique.confidence === 'high' ? 'bg-green-500/20 text-green-400' :
                                  technique.confidence === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                  'bg-red-500/20 text-red-400'
                                }`}>
                                  {technique.confidence} confidence
                                </Badge>
                              </div>
                              <h4 className="font-semibold text-white mb-1">{technique.name}</h4>
                              <p className="text-sm text-gray-400 mb-2">{technique.description}</p>
                              <div className="text-xs text-gray-500">
                                <strong>Tactic:</strong> {technique.tactic}
                                {technique.subTechnique && (
                                  <span className="ml-2"><strong>Sub-technique:</strong> {technique.subTechnique}</span>
                                )}
                              </div>
                              {technique.evidence && technique.evidence.length > 0 && (
                                <div className="mt-2">
                                  <span className="text-xs font-semibold text-gray-400">Evidence:</span>
                                  <ul className="text-xs text-gray-500 mt-1 space-y-1">
                                    {technique.evidence.map((evidence: string, evidenceIndex: number) => (
                                      <li key={evidenceIndex} className="flex items-start">
                                        <span className="text-blue-400 mr-1">•</span>
                                        <span>{evidence}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Kill Chain Phases */}
                  {currentFinding.mitreAttack.killChain && currentFinding.mitreAttack.killChain.length > 0 && (
                    <Card className="bg-[hsl(var(--secondary-bg))] border-[hsl(var(--border))]">
                      <CardContent className="p-4">
                        <h3 className="text-lg font-semibold mb-3 text-white flex items-center">
                          <span className="text-orange-400 mr-2">🎯</span>
                          Kill Chain Phases
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {currentFinding.mitreAttack.killChain.map((phase: string, index: number) => (
                            <Badge key={index} className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                              {phase}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Indicators of Compromise */}
                  {currentFinding.mitreAttack.iocs && currentFinding.mitreAttack.iocs.length > 0 && (
                    <Card className="bg-[hsl(var(--secondary-bg))] border-[hsl(var(--border))]">
                      <CardContent className="p-4">
                        <h3 className="text-lg font-semibold mb-3 text-white flex items-center">
                          <span className="text-purple-400 mr-2">🔍</span>
                          Indicators of Compromise
                        </h3>
                        <div className="space-y-2">
                          {currentFinding.mitreAttack.iocs.map((ioc: string, index: number) => (
                            <div key={index} className="bg-[hsl(var(--primary-bg))] p-2 rounded border border-[hsl(var(--border))]">
                              <code className="text-sm text-purple-400 break-all">{ioc}</code>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <Card className="bg-[hsl(var(--secondary-bg))] border-[hsl(var(--border))]">
                  <CardContent className="p-8 text-center">
                    <div className="text-gray-400 mb-4">
                      <span className="text-4xl">🎯</span>
                    </div>
                    <h3 className="text-lg font-semibold mb-2 text-white">No MITRE ATT&CK Mapping</h3>
                    <p className="text-gray-400">This finding has not been mapped to MITRE ATT&CK techniques yet.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="network" className="space-y-4">
              <NetworkTopologyDiagram 
                findingId={currentFinding.id}
                editable={false}
              />
            </TabsContent>
            
            <TabsContent value="exploitation" className="space-y-4">
              <ExploitationFlowDiagram 
                findingId={currentFinding.id}
                editable={false}
                mode="flowchart"
              />
            </TabsContent>
            
            <TabsContent value="attachments" className="space-y-4">
              <FileUpload findingId={currentFinding.id} />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
