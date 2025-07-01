# Visualization Usage Guide - SecureTeam Tracker

## Quick Start: Using Finding-Based Visualizations

Your SecureTeam Tracker now has 4 sample findings with complete visualization data that demonstrate different attack scenarios:

### Sample Findings Available:

1. **Critical SQL Injection in Customer Portal** (ID: 13)
   - Shows web application attack with network context
   - Network topology: DMZ web server → internal database
   - Exploitation flow: Recon → SQLi discovery → Data extraction → Credential cracking

2. **Domain Controller Compromise via SMB Relay** (ID: 14)
   - Demonstrates lateral movement attack
   - Network topology: Workstation → File server → Domain controller
   - Exploitation flow: Initial access → Network discovery → SMB relay → Credential harvest → DC compromise

3. **AWS S3 Bucket Misconfiguration** (ID: 15)
   - Cloud infrastructure vulnerability
   - Network topology: CDN → Web app → S3 bucket
   - Exploitation flow: Bucket discovery → Content enumeration → Data extraction → API key discovery

4. **WPA2 Enterprise Bypass** (ID: 16)
   - Wireless network compromise
   - Network topology: Wireless AP → RADIUS server → Employee laptop
   - Exploitation flow: Wireless recon → Evil twin attack → Credential capture → Network infiltration

## How to View Visualizations:

### Step 1: Navigate to Visualizations
- Go to the "Visualizations" page in your app
- You'll see data source options: "Finding-Based Data" vs "Live Network Data"

### Step 2: Select Finding-Based Data
- Choose "Finding-Based Data" from the dropdown
- Select one of the sample findings from the finding selector

### Step 3: Explore Different Views
**Network Topology Tab:**
- **Network Topology**: Shows infrastructure layout with compromised systems highlighted
- **Attack Path**: Visualizes the path through network systems
- **Risk Assessment**: Combined view with risk analysis

**Exploitation Flow Tab:**
- **Flowchart**: Shows attack steps as connected workflow
- **Timeline**: Chronological view of exploitation phases  
- **Sequence**: Actor-based sequence diagram
- **Attack Tree**: Hierarchical attack breakdown

**Risk Analysis Tab:**
- Combined network and exploitation data
- Attack surface analysis
- Exploitation timeline view

### Step 4: Understand the Visualizations

**Color Coding:**
- **Red nodes**: Compromised systems
- **Orange nodes**: Vulnerable systems  
- **Blue nodes**: Secure systems
- **Green connections**: Network links

**Interactive Features:**
- Click on network nodes to see details (IP, OS, services, vulnerabilities)
- View exploitation steps with MITRE ATT&CK techniques
- Access evidence files and timestamps
- See impact assessments and recommendations

## Live Data Integration:

### Step 5: Switch to Live Data (Optional)
- Change data source to "Live Network Data"
- Use the "Live Data Controls" tab to configure:
  - Network scanning (enter subnet like 192.168.1.0/24)
  - Vulnerability assessment targets
  - Security event time ranges
  - Real-time monitoring connections

**Live Data Features:**
- Real-time network discovery via Nmap integration
- WebSocket updates for live topology changes
- SIEM integration for security events
- Threat intelligence feeds

## Creating Your Own Visualization Data:

### For New Findings:
When creating findings, include these JSON structures:

**Network Topology Structure:**
```json
{
  "nodes": [
    {
      "id": "unique-id",
      "label": "System Name", 
      "type": "server|workstation|router|switch|firewall",
      "ip": "192.168.1.10",
      "os": "Operating System",
      "services": ["Service:Port"],
      "vulnerabilities": ["CVE or description"],
      "compromised": true|false,
      "criticality": "low|medium|high|critical"
    }
  ],
  "connections": [
    {
      "from": "source-node-id",
      "to": "target-node-id", 
      "type": "ethernet|wifi|vpn|internet",
      "port": "80,443",
      "protocol": "TCP|UDP"
    }
  ]
}
```

**Exploitation Flow Structure:**
```json
{
  "steps": [
    {
      "id": "step-id",
      "title": "Attack Step Name",
      "description": "What was done",
      "timestamp": "2024-06-22T10:00:00Z",
      "tools": ["Tool names"],
      "techniques": ["MITRE ATT&CK IDs"],
      "targets": ["target-node-ids"],
      "success": true|false,
      "evidence": ["file names"]
    }
  ],
  "timeline": {
    "start": "2024-06-22T10:00:00Z",
    "end": "2024-06-22T13:30:00Z", 
    "duration": "3.5 hours"
  },
  "impact": {
    "confidentiality": "low|medium|high|critical",
    "integrity": "low|medium|high|critical", 
    "availability": "low|medium|high|critical",
    "scope": ["affected-systems"]
  }
}
```

## Best Practices:

1. **Complete Network Context**: Include all relevant systems, even if not directly compromised
2. **Accurate Timestamps**: Use precise ISO 8601 format timestamps for exploitation steps
3. **MITRE ATT&CK Mapping**: Reference standard technique IDs for consistency
4. **Evidence Documentation**: Link actual evidence files to exploitation steps
5. **Impact Assessment**: Document business impact and technical scope

## Troubleshooting:

**No Visualization Showing:**
- Verify the finding has networkTopology and/or exploitationFlow data
- Check browser console for any JavaScript errors
- Ensure the finding ID is valid

**Diagram Rendering Issues:**
- Complex diagrams may take a moment to render
- Refresh the page if diagrams appear broken
- Check that JSON data structure is valid

**Live Data Not Working:**
- Verify network connectivity for scanning features
- Check that required services (Nmap, etc.) are installed
- Ensure WebSocket connection is established

Your visualization system provides comprehensive insight into both static penetration test findings and real-time network intelligence, enabling effective red team collaboration and threat analysis.