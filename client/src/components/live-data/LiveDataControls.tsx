import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Activity, 
  Wifi, 
  Shield, 
  Search, 
  RefreshCw, 
  AlertTriangle, 
  Server,
  Target,
  Clock,
  CheckCircle
} from 'lucide-react';
import { useLiveData } from '@/hooks/use-live-data';
import { formatDistanceToNow } from 'date-fns';

export default function LiveDataControls() {
  const {
    nodes,
    connections,
    events,
    isConnected,
    lastUpdate,
    scanNetwork,
    scanVulnerabilities,
    fetchSecurityEvents,
    requestUpdate,
    isScanning,
    isScanningVulnerabilities,
    isFetchingEvents,
    getNodesByStatus,
    getRecentEvents,
    getHighSeverityEvents,
    getCompromisedNodes,
    getVulnerableNodes
  } = useLiveData();

  const [networkSubnet, setNetworkSubnet] = useState('192.168.1.0/24');
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [eventTimeRange, setEventTimeRange] = useState('24h');
  const [openvasStatus, setOpenvasStatus] = useState<{ connected: boolean; message: string } | null>(null);

  const handleNetworkScan = () => {
    if (networkSubnet) {
      scanNetwork(networkSubnet);
    }
  };

  const checkOpenVASStatus = async () => {
    try {
      const response = await fetch('/api/live/openvas-status', {
        credentials: 'include'
      });
      const status = await response.json();
      setOpenvasStatus(status);
    } catch (error) {
      setOpenvasStatus({ connected: false, message: 'Failed to check OpenVAS status' });
    }
  };

  const handleVulnerabilityScan = () => {
    if (selectedTargets.length > 0) {
      scanVulnerabilities(selectedTargets);
    }
  };

  const handleSecurityEventsFetch = () => {
    const now = new Date();
    const hours = eventTimeRange === '24h' ? 24 : eventTimeRange === '7d' ? 168 : 1;
    const startTime = new Date(now.getTime() - (hours * 60 * 60 * 1000));
    
    fetchSecurityEvents({
      startTime: startTime.toISOString(),
      endTime: now.toISOString()
    });
  };

  const connectionStatus = isConnected ? 'connected' : 'disconnected';
  const compromisedNodes = getCompromisedNodes();
  const vulnerableNodes = getVulnerableNodes();
  const recentEvents = getRecentEvents(24);
  const highSeverityEvents = getHighSeverityEvents();

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card className="bg-[hsl(var(--primary-bg))] border-[hsl(var(--secondary-bg))]">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-[hsl(var(--accent-green))]" />
              <span>Live Data Status</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <Badge variant={isConnected ? 'default' : 'destructive'}>
                {connectionStatus}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-400">Network Nodes</div>
              <div className="text-2xl font-bold text-white">{nodes.length}</div>
            </div>
            <div>
              <div className="text-gray-400">Active Connections</div>
              <div className="text-2xl font-bold text-white">{connections.length}</div>
            </div>
            <div>
              <div className="text-gray-400">Security Events</div>
              <div className="text-2xl font-bold text-white">{recentEvents.length}</div>
            </div>
            <div>
              <div className="text-gray-400">Last Update</div>
              <div className="text-sm text-white">
                {lastUpdate ? formatDistanceToNow(lastUpdate, { addSuffix: true }) : 'Never'}
              </div>
            </div>
          </div>
          
          <Separator className="my-4 bg-[hsl(var(--border))]" />
          
          <Button 
            onClick={requestUpdate}
            disabled={!isConnected}
            className="w-full bg-[hsl(var(--accent-green))] hover:bg-[hsl(var(--accent-green))]/90"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh All Data
          </Button>
        </CardContent>
      </Card>

      {/* Network Scanning */}
      <Card className="bg-[hsl(var(--primary-bg))] border-[hsl(var(--secondary-bg))]">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Wifi className="w-5 h-5 text-blue-400" />
            <span>Network Discovery</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-gray-300">Network Subnet</Label>
            <div className="flex space-x-2 mt-1">
              <Input
                value={networkSubnet}
                onChange={(e) => setNetworkSubnet(e.target.value)}
                placeholder="192.168.1.0/24"
                className="flex-1 bg-[hsl(var(--secondary-bg))] border-[hsl(var(--border))]"
              />
              <Button 
                onClick={handleNetworkScan}
                disabled={isScanning || !networkSubnet}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isScanning ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
          
          <div className="text-sm text-gray-400">
            Scans the specified subnet for active network devices using Nmap or similar tools.
          </div>
        </CardContent>
      </Card>

      {/* Vulnerability Scanning */}
      <Card className="bg-[hsl(var(--primary-bg))] border-[hsl(var(--secondary-bg))]">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-orange-400" />
            <span>Vulnerability Assessment</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* OpenVAS Status */}
          <div className="flex items-center justify-between p-3 bg-[hsl(var(--secondary-bg))] rounded-lg">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4" />
              <span className="text-sm font-medium">OpenVAS Status</span>
            </div>
            <div className="flex items-center space-x-2">
              {openvasStatus ? (
                <Badge className={openvasStatus.connected ? "bg-green-600" : "bg-red-600"}>
                  {openvasStatus.connected ? "Connected" : "Disconnected"}
                </Badge>
              ) : (
                <Badge className="bg-gray-600">Unknown</Badge>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={checkOpenVASStatus}
                className="text-xs"
              >
                Test
              </Button>
            </div>
          </div>
          
          <div>
            <Label className="text-gray-300">Target Selection</Label>
            <div className="grid grid-cols-2 gap-2 mt-2 max-h-32 overflow-y-auto">
              {nodes.map(node => (
                <label key={node.id} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedTargets.includes(node.ip)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTargets([...selectedTargets, node.ip]);
                      } else {
                        setSelectedTargets(selectedTargets.filter(ip => ip !== node.ip));
                      }
                    }}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-300">{node.ip}</span>
                  <Badge variant="outline" className="text-xs">
                    {node.type}
                  </Badge>
                </label>
              ))}
            </div>
          </div>
          
          <Button 
            onClick={handleVulnerabilityScan}
            disabled={isScanningVulnerabilities || selectedTargets.length === 0}
            className="w-full bg-orange-600 hover:bg-orange-700"
          >
            {isScanningVulnerabilities ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Scanning Vulnerabilities...
              </>
            ) : (
              <>
                <Target className="w-4 h-4 mr-2" />
                Scan Selected Targets ({selectedTargets.length})
              </>
            )}
          </Button>
          
          <div className="text-sm text-gray-400">
            Performs vulnerability assessment using Nessus, OpenVAS, or similar scanners.
          </div>
        </CardContent>
      </Card>

      {/* Security Events */}
      <Card className="bg-[hsl(var(--primary-bg))] border-[hsl(var(--secondary-bg))]">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span>Security Events</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-gray-300">Time Range</Label>
            <Select value={eventTimeRange} onValueChange={setEventTimeRange}>
              <SelectTrigger className="mt-1 bg-[hsl(var(--secondary-bg))] border-[hsl(var(--border))]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">Last Hour</SelectItem>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button 
            onClick={handleSecurityEventsFetch}
            disabled={isFetchingEvents}
            className="w-full bg-red-600 hover:bg-red-700"
          >
            {isFetchingEvents ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Fetching Events...
              </>
            ) : (
              <>
                <Clock className="w-4 h-4 mr-2" />
                Fetch Security Events
              </>
            )}
          </Button>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">High Severity Events:</span>
              <span className="text-red-400 font-medium">{highSeverityEvents.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Compromised Nodes:</span>
              <span className="text-red-400 font-medium">{compromisedNodes.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Vulnerable Nodes:</span>
              <span className="text-orange-400 font-medium">{vulnerableNodes.length}</span>
            </div>
          </div>
          
          <div className="text-sm text-gray-400">
            Retrieves security events from SIEM platforms like Splunk, ELK Stack, or similar.
          </div>
        </CardContent>
      </Card>

      {/* Data Source Integration */}
      <Card className="bg-[hsl(var(--primary-bg))] border-[hsl(var(--secondary-bg))]">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Server className="w-5 h-5 text-purple-400" />
            <span>Data Source Integration</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Network Scanning (Nmap)</span>
              <Badge variant="outline" className="text-green-400 border-green-400">
                <CheckCircle className="w-3 h-3 mr-1" />
                Ready
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Vulnerability Assessment (Nessus/OpenVAS)</span>
              <Badge variant="outline" className="text-yellow-400 border-yellow-400">
                <Clock className="w-3 h-3 mr-1" />
                Configure
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">SIEM Integration (Splunk/ELK)</span>
              <Badge variant="outline" className="text-yellow-400 border-yellow-400">
                <Clock className="w-3 h-3 mr-1" />
                Configure
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Threat Intelligence Feeds</span>
              <Badge variant="outline" className="text-yellow-400 border-yellow-400">
                <Clock className="w-3 h-3 mr-1" />
                Configure
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}