# Finding Visualization Data Structure Guide

This guide explains the exact data format needed in your findings to create network topology and exploitation flow visualizations.

## Database Schema Changes

Your findings table now includes two new JSON fields:
- `networkTopology` - Contains network nodes and connections
- `exploitationFlow` - Contains attack steps and timeline data

## 1. Network Topology Data Structure

When creating or editing a finding, include this JSON structure in the `networkTopology` field:

```json
{
  "nodes": [
    {
      "id": "web-server-01",
      "label": "Web Server",
      "type": "server",
      "ip": "192.168.1.10",
      "os": "Ubuntu 20.04",
      "services": ["HTTP:80", "HTTPS:443", "SSH:22"],
      "vulnerabilities": ["CVE-2023-1234", "Outdated Apache"],
      "compromised": true,
      "criticality": "critical"
    },
    {
      "id": "database-01",
      "label": "Database Server",
      "type": "server",
      "ip": "192.168.1.20",
      "os": "CentOS 8",
      "services": ["MySQL:3306", "SSH:22"],
      "vulnerabilities": ["Weak passwords", "Unpatched MySQL"],
      "compromised": false,
      "criticality": "high"
    },
    {
      "id": "firewall-01",
      "label": "Perimeter Firewall",
      "type": "firewall",
      "ip": "203.0.113.1",
      "os": "pfSense",
      "services": ["HTTP:80", "HTTPS:443"],
      "vulnerabilities": [],
      "compromised": false,
      "criticality": "medium"
    }
  ],
  "connections": [
    {
      "from": "web-server-01",
      "to": "database-01",
      "type": "ethernet",
      "port": "3306",
      "protocol": "TCP"
    },
    {
      "from": "firewall-01",
      "to": "web-server-01",
      "type": "ethernet",
      "port": "80,443",
      "protocol": "TCP"
    }
  ]
}
```

### Node Types Available:
- `router` - Network router
- `switch` - Network switch
- `server` - Server system
- `workstation` - Client workstation
- `firewall` - Security appliance
- `dmz` - DMZ zone
- `internet` - External internet

### Connection Types Available:
- `ethernet` - Wired network connection
- `wifi` - Wireless connection
- `vpn` - VPN tunnel
- `internet` - Internet connection

### Criticality Levels:
- `low` - Low risk/impact
- `medium` - Medium risk/impact
- `high` - High risk/impact
- `critical` - Critical risk/impact

## 2. Exploitation Flow Data Structure

Include this JSON structure in the `exploitationFlow` field:

```json
{
  "steps": [
    {
      "id": "step-1",
      "title": "Initial Reconnaissance",
      "description": "Port scanning and service enumeration",
      "timestamp": "2024-01-15T10:00:00Z",
      "tools": ["Nmap", "Nessus"],
      "techniques": ["T1595.001", "T1595.002"],
      "targets": ["web-server-01"],
      "success": true,
      "evidence": ["scan-results.txt", "service-enum.png"]
    },
    {
      "id": "step-2",
      "title": "Vulnerability Exploitation",
      "description": "Exploited Apache vulnerability for initial access",
      "timestamp": "2024-01-15T10:30:00Z",
      "tools": ["Metasploit", "Custom exploit"],
      "techniques": ["T1190"],
      "targets": ["web-server-01"],
      "success": true,
      "evidence": ["exploit-output.txt", "shell-access.png"]
    },
    {
      "id": "step-3",
      "title": "Privilege Escalation",
      "description": "Escalated to root using kernel exploit",
      "timestamp": "2024-01-15T11:00:00Z",
      "tools": ["Linux exploit"],
      "techniques": ["T1068"],
      "targets": ["web-server-01"],
      "success": true,
      "evidence": ["privesc-proof.txt"]
    },
    {
      "id": "step-4",
      "title": "Lateral Movement",
      "description": "Moved to database server using stolen credentials",
      "timestamp": "2024-01-15T11:30:00Z",
      "tools": ["SSH", "Hydra"],
      "techniques": ["T1021.004", "T1110.001"],
      "targets": ["database-01"],
      "success": true,
      "evidence": ["lateral-movement.txt", "db-access.png"]
    }
  ],
  "timeline": {
    "start": "2024-01-15T10:00:00Z",
    "end": "2024-01-15T12:00:00Z",
    "duration": "2 hours"
  },
  "impact": {
    "confidentiality": "high",
    "integrity": "medium",
    "availability": "low",
    "scope": ["web-server-01", "database-01"]
  }
}
```

### MITRE ATT&CK Techniques:
Reference standard MITRE ATT&CK technique IDs for consistency:
- `T1595.001` - Active Scanning: Scanning IP Blocks
- `T1595.002` - Active Scanning: Vulnerability Scanning
- `T1190` - Exploit Public-Facing Application
- `T1068` - Exploitation for Privilege Escalation
- `T1021.004` - Remote Services: SSH
- `T1110.001` - Brute Force: Password Guessing

## 3. Example Complete Finding

Here's a complete finding record with both visualization data structures:

```json
{
  "title": "Critical Web Application Compromise",
  "description": "Successful exploitation of web server leading to database access",
  "severity": "critical",
  "category": "web_application",
  "status": "verified",
  "cvssScore": "9.8",
  "affectedUrl": "https://target.example.com",
  "payload": "<?php system($_GET['cmd']); ?>",
  "evidence": ["exploit-proof.png", "shell-access.mp4"],
  "networkTopology": {
    "nodes": [
      {
        "id": "web-01",
        "label": "Target Web Server",
        "type": "server",
        "ip": "192.168.1.10",
        "os": "Ubuntu 20.04",
        "services": ["Apache:80", "MySQL:3306"],
        "vulnerabilities": ["CVE-2023-1234", "File upload bypass"],
        "compromised": true,
        "criticality": "critical"
      }
    ],
    "connections": []
  },
  "exploitationFlow": {
    "steps": [
      {
        "id": "recon",
        "title": "Reconnaissance",
        "description": "Identified file upload vulnerability",
        "timestamp": "2024-01-15T14:00:00Z",
        "tools": ["Burp Suite"],
        "techniques": ["T1592.002"],
        "targets": ["web-01"],
        "success": true,
        "evidence": ["vuln-scan.png"]
      }
    ],
    "timeline": {
      "start": "2024-01-15T14:00:00Z",
      "end": "2024-01-15T15:30:00Z",
      "duration": "1.5 hours"
    },
    "impact": {
      "confidentiality": "high",
      "integrity": "high",
      "availability": "medium",
      "scope": ["web-01"]
    }
  }
}
```

## 4. Adding Visualization Data via UI

When creating findings through the web interface:

1. **Basic Finding Info:** Fill out title, description, severity, etc.
2. **Network Tab:** Use the interactive network diagram editor to:
   - Add nodes by clicking "Add Node"
   - Connect nodes by drawing connections
   - Set node properties (IP, OS, services)
   - Mark compromised systems
3. **Exploitation Tab:** Document your attack chain:
   - Add exploitation steps in chronological order
   - Include MITRE ATT&CK techniques
   - Upload evidence files
   - Set timestamps

## 5. API Examples

### Creating a Finding with Visualization Data

```javascript
const findingData = {
  title: "Network Compromise Chain",
  description: "Multi-stage attack compromising web and database servers",
  severity: "critical",
  category: "network",
  networkTopology: {
    nodes: [/* node data */],
    connections: [/* connection data */]
  },
  exploitationFlow: {
    steps: [/* exploitation steps */],
    timeline: {/* timeline data */},
    impact: {/* impact assessment */}
  }
};

fetch('/api/findings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(findingData)
});
```

### Updating Visualization Data

```javascript
const updateData = {
  networkTopology: {
    nodes: [/* updated nodes */],
    connections: [/* updated connections */]
  }
};

fetch(`/api/findings/${findingId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(updateData)
});
```

## 6. Visualization Behavior

**Network Topology Diagram:**
- Shows nodes as colored shapes based on type and criticality
- Connections appear as lines between nodes
- Compromised nodes highlighted in red
- Click nodes to see details (IP, services, vulnerabilities)

**Exploitation Flow Diagram:**
- Displays attack steps as a flowchart or timeline
- Color-codes steps by success/failure
- Shows MITRE ATT&CK techniques
- Links to evidence files

**Risk Analysis View:**
- Combines network topology with exploitation data
- Highlights attack paths through the network
- Shows impact scope and recommendations

## 7. Data Validation

The system validates visualization data to ensure:
- Node IDs are unique within each finding
- Connections reference valid node IDs
- Required fields are present
- Timestamps are in ISO 8601 format
- MITRE ATT&CK technique IDs are valid

## 8. Best Practices

1. **Consistent Naming:** Use consistent node IDs and labels across findings
2. **Complete Data:** Include all relevant network nodes, even if not directly exploited
3. **Evidence Links:** Reference actual evidence files in exploitation steps
4. **Accurate Timeline:** Use precise timestamps for exploitation steps
5. **MITRE Mapping:** Map attack techniques to MITRE ATT&CK framework
6. **Impact Assessment:** Document the business impact of each compromise

This data structure enables rich, interactive visualizations that help teams understand both the technical network layout and the attack progression in your penetration testing findings.