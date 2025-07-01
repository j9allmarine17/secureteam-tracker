# Live Data Integration Guide - SecureTeam Tracker

This guide explains how to integrate real-time network and security data sources with your interactive visualizations.

## Overview

The live data system supports integration with:
- **Network Scanning Tools** (Nmap, Masscan)
- **Vulnerability Scanners** (Nessus, OpenVAS, Qualys)
- **SIEM Platforms** (Splunk, ELK Stack, QRadar)
- **Network Monitoring** (SNMP, NetFlow, sFlow)
- **Threat Intelligence** (MISP, ThreatConnect, AlienVault OTX)

## 1. Network Discovery Integration

### Nmap Integration
The system includes basic Nmap integration for network discovery:

```bash
# Install Nmap (if not already installed)
sudo apt-get install nmap

# Grant permissions for network scanning
sudo setcap cap_net_raw,cap_net_admin+eip /usr/bin/nmap
```

**Configuration:**
1. Ensure the application server has network access to target subnets
2. Configure firewall rules to allow ICMP and TCP scanning
3. Use service accounts with appropriate scanning permissions

### API Usage:
```javascript
// Scan a network subnet
fetch('/api/live/scan-network', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ subnet: '192.168.1.0/24' })
});
```

## 2. Vulnerability Scanner Integration

### Nessus Integration

**Setup:**
1. Install Nessus scanner on your network
2. Configure scan policies for different asset types
3. Create API credentials for SecureTeam Tracker

**Configuration in `server/liveDataService.ts`:**
```typescript
// Update executeVulnerabilityScan method
private async executeVulnerabilityScan(target: string): Promise<{ vulnerabilities: string[] }> {
  const nessusConfig = {
    baseUrl: process.env.NESSUS_BASE_URL,
    accessKey: process.env.NESSUS_ACCESS_KEY,
    secretKey: process.env.NESSUS_SECRET_KEY
  };
  
  // Implement Nessus API calls
  const response = await fetch(`${nessusConfig.baseUrl}/scans`, {
    headers: {
      'X-ApiKeys': `accessKey=${nessusConfig.accessKey}; secretKey=${nessusConfig.secretKey}`
    }
  });
  
  return { vulnerabilities: parseNessusResults(await response.json()) };
}
```

### OpenVAS Integration

**Setup:**
1. Install OpenVAS/GVM on your network
2. Configure target lists and scan configurations
3. Create user account for API access

**Environment Variables:**
```env
OPENVAS_BASE_URL=https://your-openvas-server:9392
OPENVAS_USERNAME=scanner-user
OPENVAS_PASSWORD=scanner-password
```

## 3. SIEM Integration

### Splunk Integration

**Setup:**
1. Create a Splunk app for SecureTeam Tracker
2. Configure saved searches for security events
3. Generate API token for authentication

**Configuration:**
```env
SPLUNK_BASE_URL=https://your-splunk-server:8089
SPLUNK_TOKEN=your-splunk-token
SPLUNK_INDEX=security
```

**Implementation:**
```typescript
private async querySIEM(timeRange: { start: Date; end: Date }): Promise<LiveSecurityEvent[]> {
  const splunkQuery = `
    search index=security earliest=${timeRange.start.toISOString()} latest=${timeRange.end.toISOString()}
    | eval severity=case(
        risk_score>=90, "critical",
        risk_score>=70, "high",
        risk_score>=30, "medium",
        1=1, "low"
    )
    | table _time, src, dest, event_type, severity, description
  `;
  
  const response = await fetch(`${process.env.SPLUNK_BASE_URL}/services/search/jobs/oneshot`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SPLUNK_TOKEN}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: `search=${encodeURIComponent(splunkQuery)}&output_mode=json`
  });
  
  return parseSplunkResults(await response.json());
}
```

### ELK Stack Integration

**Setup:**
1. Configure Elasticsearch indices for security events
2. Set up Kibana dashboards for visualization
3. Create API key for Elasticsearch access

**Configuration:**
```env
ELASTICSEARCH_URL=https://your-elasticsearch:9200
ELASTICSEARCH_API_KEY=your-api-key
ELASTICSEARCH_INDEX=security-events-*
```

## 4. Network Monitoring Integration

### SNMP Integration

**Setup:**
1. Configure SNMP on network devices
2. Install SNMP tools on application server
3. Create SNMP community strings or v3 credentials

```bash
# Install SNMP tools
sudo apt-get install snmp snmp-mibs-downloader

# Configure SNMP
echo 'mibs +ALL' >> /etc/snmp/snmp.conf
```

**Implementation:**
```typescript
private async getActiveConnections(): Promise<LiveNetworkConnection[]> {
  // Query network devices via SNMP for active connections
  const devices = await this.getNetworkDevices();
  const connections: LiveNetworkConnection[] = [];
  
  for (const device of devices) {
    const snmpData = await this.querySNMP(device.ip, {
      community: process.env.SNMP_COMMUNITY,
      oids: ['1.3.6.1.2.1.4.20.1.1'] // IP-MIB::ipAdEntAddr
    });
    
    connections.push(...parseSNMPConnections(snmpData));
  }
  
  return connections;
}
```

### NetFlow Integration

**Setup:**
1. Configure NetFlow/sFlow on routers and switches
2. Install flow collector (nfcapd, pmacct)
3. Set up flow analysis tools

```bash
# Install nfcapd for NetFlow collection
sudo apt-get install nfcapd
```

## 5. Threat Intelligence Integration

### MISP Integration

**Setup:**
1. Install and configure MISP instance
2. Subscribe to threat intelligence feeds
3. Generate API key for SecureTeam Tracker

**Configuration:**
```env
MISP_BASE_URL=https://your-misp-server
MISP_API_KEY=your-misp-api-key
```

**Implementation:**
```typescript
private async fetchThreatFeeds(): Promise<any[]> {
  const response = await fetch(`${process.env.MISP_BASE_URL}/attributes/restSearch`, {
    method: 'POST',
    headers: {
      'Authorization': process.env.MISP_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      returnFormat: 'json',
      type: ['ip-dst', 'domain', 'url'],
      last: '7d'
    })
  });
  
  return (await response.json()).Attribute || [];
}
```

## 6. Real-time Updates via WebSocket

The system provides real-time updates through WebSocket connections:

**Client Connection:**
```javascript
// Connect to live data WebSocket
const ws = new WebSocket('ws://localhost:5000/ws/live-data');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  switch (data.type) {
    case 'network_update':
      updateNetworkVisualization(data.nodes, data.connections);
      break;
    case 'security_update':
      updateSecurityEvents(data.events);
      break;
  }
};
```

## 7. Automated Data Collection

### Scheduled Scanning
Set up cron jobs for regular data collection:

```bash
# Add to crontab for automated scanning
# Scan network every 15 minutes
*/15 * * * * curl -X POST http://localhost:5000/api/live/scan-network -d '{"subnet":"192.168.1.0/24"}'

# Update threat intelligence every hour
0 * * * * curl -X POST http://localhost:5000/api/live/update-threat-intelligence
```

### Systemd Services
Create systemd services for continuous monitoring:

```ini
# /etc/systemd/system/secureteam-monitor.service
[Unit]
Description=SecureTeam Tracker Live Data Monitor
After=network.target

[Service]
Type=simple
User=secureteam
ExecStart=/usr/local/bin/secureteam-monitor
Restart=always
RestartSec=30

[Install]
WantedBy=multi-user.target
```

## 8. Performance Optimization

### Caching Strategy
- Cache network scan results for 5 minutes
- Cache vulnerability scan results for 1 hour
- Cache threat intelligence for 4 hours

### Rate Limiting
```typescript
// Implement rate limiting for external API calls
private rateLimiter = new Map<string, number>();

private async checkRateLimit(service: string, maxCalls: number, timeWindow: number): Promise<boolean> {
  const now = Date.now();
  const calls = this.rateLimiter.get(service) || 0;
  
  if (calls >= maxCalls) {
    return false;
  }
  
  this.rateLimiter.set(service, calls + 1);
  setTimeout(() => {
    this.rateLimiter.delete(service);
  }, timeWindow);
  
  return true;
}
```

## 9. Security Considerations

### API Security
- Use API keys or certificates for authentication
- Implement proper access controls
- Encrypt data in transit and at rest

### Network Security
- Isolate scanning networks from production
- Use dedicated service accounts
- Monitor scanning activities

### Data Privacy
- Implement data retention policies
- Anonymize sensitive network information
- Comply with data protection regulations

## 10. Troubleshooting

### Common Issues

**WebSocket Connection Failed:**
```bash
# Check if WebSocket port is accessible
netstat -tuln | grep 5000

# Test WebSocket connection
wscat -c ws://localhost:5000/ws/live-data
```

**Network Scanning Errors:**
```bash
# Check Nmap permissions
getcap /usr/bin/nmap

# Test network connectivity
ping -c 1 192.168.1.1
```

**SIEM Integration Issues:**
```bash
# Test Splunk API connectivity
curl -k -H "Authorization: Bearer your-token" https://splunk-server:8089/services/search/jobs

# Check Elasticsearch connectivity
curl -H "Authorization: ApiKey your-key" https://elasticsearch:9200/_cluster/health
```

## 11. Deployment Checklist

- [ ] Install required scanning tools (Nmap, etc.)
- [ ] Configure network access and permissions
- [ ] Set up API credentials for external services
- [ ] Test WebSocket connectivity
- [ ] Configure automated scanning schedules
- [ ] Set up monitoring and alerting
- [ ] Implement backup and recovery procedures
- [ ] Document custom integrations

## Support

For additional integration support:
1. Check application logs for detailed error messages
2. Verify network connectivity to external services
3. Validate API credentials and permissions
4. Test individual components before full integration