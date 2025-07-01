import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Network, Server, Shield, AlertTriangle, Zap } from 'lucide-react';
import MermaidDiagram from './MermaidDiagram';

interface NetworkNode {
  id: string;
  label: string;
  type: 'router' | 'switch' | 'server' | 'workstation' | 'firewall' | 'dmz' | 'internet';
  ip?: string;
  os?: string;
  services?: string[];
  vulnerabilities?: string[];
  compromised?: boolean;
  criticality: 'low' | 'medium' | 'high' | 'critical';
}

interface NetworkConnection {
  from: string;
  to: string;
  type: 'ethernet' | 'wifi' | 'vpn' | 'internet';
  port?: string;
  protocol?: string;
}

interface NetworkTopologyProps {
  findingId?: number;
  initialNodes?: NetworkNode[];
  initialConnections?: NetworkConnection[];
  editable?: boolean;
}

export default function NetworkTopologyDiagram({ 
  findingId, 
  initialNodes = [], 
  initialConnections = [],
  editable = false 
}: NetworkTopologyProps) {
  const [nodes, setNodes] = useState<NetworkNode[]>(initialNodes);
  const [connections, setConnections] = useState<NetworkConnection[]>(initialConnections);
  const [viewMode, setViewMode] = useState<'topology' | 'attack-path' | 'risk-assessment'>('topology');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Load network topology from finding data
  useEffect(() => {
    if (findingId && nodes.length === 0) {
      // Fetch finding data and extract network topology
      fetch(`/api/findings/${findingId}`)
        .then(res => res.json())
        .then(finding => {
          if (finding.networkTopology) {
            const topology = finding.networkTopology;
            if (topology.nodes && topology.nodes.length > 0) {
              setNodes(topology.nodes);
            }
            if (topology.connections && topology.connections.length > 0) {
              setConnections(topology.connections);
            }
          }
        })
        .catch(err => console.error('Failed to load finding topology:', err));
    } else if (initialNodes.length > 0 && nodes.length === 0) {
      // Use provided initial nodes/connections
      setNodes(initialNodes);
      setConnections(initialConnections);
    }
  }, [findingId, initialNodes, initialConnections, nodes.length]);

  const generateMermaidChart = () => {
    let chart = '';
    
    switch (viewMode) {
      case 'topology':
        chart = generateTopologyChart();
        break;
      case 'attack-path':
        chart = generateAttackPathChart();
        break;
      case 'risk-assessment':
        chart = generateRiskAssessmentChart();
        break;
    }
    
    return chart;
  };

  const generateTopologyChart = () => {
    let chart = 'graph TD\n';
    
    // If no nodes, show a simple placeholder
    if (nodes.length === 0) {
      chart += '    A["Internet"] --> B["Firewall"]\n';
      chart += '    B --> C["DMZ Server"]\n';
      chart += '    B --> D["Internal Network"]\n';
      chart += '    D --> E["Domain Controller"]\n';
      chart += '    D --> F["File Server"]\n';
      chart += '    classDef default fill:#4f46e5,stroke:#3730a3,stroke-width:2px,color:#fff\n';
      return chart;
    }
    
    // Add nodes with styling based on type and status
    nodes.forEach(node => {
      const style = getNodeStyle(node);
      const label = `${node.label}${node.ip ? '<br/>' + node.ip : ''}`;
      chart += `    ${node.id}["${label}"]:::${style}\n`;
    });

    // Add connections
    connections.forEach(conn => {
      const connectionLabel = conn.port ? `|${conn.port}|` : '';
      chart += `    ${conn.from} ${getConnectionArrow(conn.type)}${connectionLabel} ${conn.to}\n`;
    });

    // Add styling classes
    chart += `
    classDef server fill:#4f46e5,stroke:#3730a3,stroke-width:2px,color:#fff
    classDef firewall fill:#dc2626,stroke:#b91c1c,stroke-width:3px,color:#fff
    classDef router fill:#059669,stroke:#047857,stroke-width:2px,color:#fff
    classDef switch fill:#0891b2,stroke:#0e7490,stroke-width:2px,color:#fff
    classDef workstation fill:#7c3aed,stroke:#6d28d9,stroke-width:2px,color:#fff
    classDef compromised fill:#dc2626,stroke:#b91c1c,stroke-width:4px,color:#fff,stroke-dasharray: 5 5
    classDef vulnerable fill:#ea580c,stroke:#c2410c,stroke-width:3px,color:#fff
    classDef internet fill:#374151,stroke:#1f2937,stroke-width:2px,color:#fff
    classDef dmz fill:#0d9488,stroke:#0f766e,stroke-width:2px,color:#fff
    `;

    return chart;
  };

  const generateAttackPathChart = () => {
    let chart = 'graph TD\n';
    
    // Show attack progression
    const attackPath = [
      'internet',
      'firewall',
      'dmz-web',
      'core-router',
      'core-switch',
      'file-server',
      'dc-server1'
    ];

    attackPath.forEach((nodeId, index) => {
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        const step = index + 1;
        chart += `    ${nodeId}["Step ${step}: ${node.label}<br/>${node.ip || ''}"]:::${getAttackStepStyle(index, node)}\n`;
        
        if (index < attackPath.length - 1) {
          chart += `    ${nodeId} -->|Attack Vector| ${attackPath[index + 1]}\n`;
        }
      }
    });

    chart += `
    classDef initial fill:#374151,stroke:#1f2937,stroke-width:2px,color:#fff
    classDef exploited fill:#dc2626,stroke:#b91c1c,stroke-width:3px,color:#fff
    classDef compromised fill:#7f1d1d,stroke:#991b1b,stroke-width:4px,color:#fff
    classDef target fill:#fbbf24,stroke:#f59e0b,stroke-width:3px,color:#000
    `;

    return chart;
  };

  const generateRiskAssessmentChart = () => {
    let chart = 'graph TD\n';
    
    // Group nodes by criticality and show risk levels
    const criticalNodes = nodes.filter(n => n.criticality === 'critical');
    const highNodes = nodes.filter(n => n.criticality === 'high');
    const mediumNodes = nodes.filter(n => n.criticality === 'medium');
    const lowNodes = nodes.filter(n => n.criticality === 'low');

    chart += '    subgraph Critical["🔴 Critical Risk"]\n';
    criticalNodes.forEach(node => {
      chart += `        ${node.id}["${node.label}<br/>${node.ip || ''}"]\n`;
    });
    chart += '    end\n';

    chart += '    subgraph High["🟠 High Risk"]\n';
    highNodes.forEach(node => {
      chart += `        ${node.id}["${node.label}<br/>${node.ip || ''}"]\n`;
    });
    chart += '    end\n';

    chart += '    subgraph Medium["🟡 Medium Risk"]\n';
    mediumNodes.forEach(node => {
      chart += `        ${node.id}["${node.label}<br/>${node.ip || ''}"]\n`;
    });
    chart += '    end\n';

    chart += '    subgraph Low["🟢 Low Risk"]\n';
    lowNodes.forEach(node => {
      chart += `        ${node.id}["${node.label}<br/>${node.ip || ''}"]\n`;
    });
    chart += '    end\n';

    // Add risk flow connections
    connections.forEach(conn => {
      const fromNode = nodes.find(n => n.id === conn.from);
      const toNode = nodes.find(n => n.id === conn.to);
      if (fromNode && toNode) {
        chart += `    ${conn.from} --> ${conn.to}\n`;
      }
    });

    return chart;
  };

  const getNodeStyle = (node: NetworkNode) => {
    if (node.compromised) return 'compromised';
    if (node.vulnerabilities && node.vulnerabilities.length > 0) return 'vulnerable';
    if (node.type === 'dmz') return 'dmz';
    return node.type;
  };

  const getAttackStepStyle = (step: number, node: NetworkNode) => {
    if (step === 0) return 'initial';
    if (node.compromised) return 'compromised';
    if (step < 4) return 'exploited';
    return 'target';
  };

  const getConnectionArrow = (type: string) => {
    switch (type) {
      case 'wifi': return '-..->';
      case 'vpn': return '==>';
      case 'internet': return '==>';
      default: return '-->';
    }
  };

  const getCriticalityColor = (criticality: string) => {
    switch (criticality) {
      case 'critical': return 'bg-red-600';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const selectedNodeData = selectedNode ? nodes.find(n => n.id === selectedNode) : null;

  return (
    <div className="space-y-6">
      <Card className="bg-[hsl(var(--primary-bg))] border-[hsl(var(--secondary-bg))]">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Network className="w-5 h-5 text-[hsl(var(--accent-green))]" />
              <span>Network Topology Diagram</span>
            </div>
            <div className="flex items-center space-x-3">
              <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
                <SelectTrigger className="w-48 bg-[hsl(var(--secondary-bg))] border-[hsl(var(--border))]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="topology">Network Topology</SelectItem>
                  <SelectItem value="attack-path">Attack Path</SelectItem>
                  <SelectItem value="risk-assessment">Risk Assessment</SelectItem>
                </SelectContent>
              </Select>
              {editable && (
                <Button size="sm" className="bg-[hsl(var(--accent-green))] hover:bg-[hsl(var(--accent-green))]/90">
                  Edit Diagram
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <div className="bg-[hsl(var(--secondary-bg))] rounded-lg p-4">
                <MermaidDiagram 
                  chart={generateMermaidChart()}
                  id={`network-${viewMode}-${findingId || 'default'}`}
                  className="w-full"
                  theme="dark"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-white font-medium mb-3">Network Legend</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-600 rounded"></div>
                    <span className="text-gray-300">Compromised</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-orange-500 rounded"></div>
                    <span className="text-gray-300">Vulnerable</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-600 rounded"></div>
                    <span className="text-gray-300">Secure</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-600 rounded"></div>
                    <span className="text-gray-300">Network Device</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-white font-medium mb-3">Network Statistics</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Assets:</span>
                    <span className="text-white">{nodes.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Compromised:</span>
                    <span className="text-red-400">{nodes.filter(n => n.compromised).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Vulnerable:</span>
                    <span className="text-orange-400">{nodes.filter(n => n.vulnerabilities && n.vulnerabilities.length > 0).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Critical Assets:</span>
                    <span className="text-yellow-400">{nodes.filter(n => n.criticality === 'critical').length}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-white font-medium mb-3">Risk Summary</h4>
                <div className="space-y-2">
                  {['critical', 'high', 'medium', 'low'].map(level => {
                    const count = nodes.filter(n => n.criticality === level).length;
                    return (
                      <div key={level} className="flex items-center space-x-2">
                        <Badge className={`${getCriticalityColor(level)} text-white text-xs`}>
                          {level.toUpperCase()}
                        </Badge>
                        <span className="text-gray-300 text-sm">{count} assets</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {selectedNodeData && (
                <div>
                  <h4 className="text-white font-medium mb-3">Asset Details</h4>
                  <div className="bg-[hsl(var(--secondary-bg))] p-3 rounded space-y-2">
                    <div>
                      <span className="text-gray-400 text-xs">Name:</span>
                      <p className="text-white text-sm">{selectedNodeData.label}</p>
                    </div>
                    {selectedNodeData.ip && (
                      <div>
                        <span className="text-gray-400 text-xs">IP Address:</span>
                        <p className="text-white text-sm font-mono">{selectedNodeData.ip}</p>
                      </div>
                    )}
                    {selectedNodeData.os && (
                      <div>
                        <span className="text-gray-400 text-xs">Operating System:</span>
                        <p className="text-white text-sm">{selectedNodeData.os}</p>
                      </div>
                    )}
                    {selectedNodeData.services && selectedNodeData.services.length > 0 && (
                      <div>
                        <span className="text-gray-400 text-xs">Services:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedNodeData.services.map(service => (
                            <Badge key={service} variant="outline" className="text-xs">
                              {service}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedNodeData.vulnerabilities && selectedNodeData.vulnerabilities.length > 0 && (
                      <div>
                        <span className="text-gray-400 text-xs">Vulnerabilities:</span>
                        <div className="space-y-1 mt-1">
                          {selectedNodeData.vulnerabilities.map(vuln => (
                            <div key={vuln} className="flex items-center space-x-1">
                              <AlertTriangle className="w-3 h-3 text-orange-500" />
                              <span className="text-orange-300 text-xs">{vuln}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}