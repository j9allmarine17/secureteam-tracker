-- Sample findings with comprehensive visualization data for SecureTeam Tracker
-- These demonstrate network topology and exploitation flow visualizations

-- Sample Finding 1: Web Application SQL Injection with Network Context
INSERT INTO findings (
  title,
  description,
  severity,
  category,
  status,
  cvss_score,
  affected_url,
  payload,
  evidence,
  network_topology,
  exploitation_flow,
  reported_by_id
) VALUES (
  'Critical SQL Injection in Customer Portal',
  'Unauthenticated SQL injection vulnerability in the customer login portal allowing database extraction and potential system compromise.',
  'critical',
  'web_application',
  'verified',
  '9.8',
  'https://portal.example.com/login.php',
  '1'' OR ''1''=''1'' UNION SELECT username,password FROM users--',
  '["sqli-payload.txt", "database-dump.sql", "admin-access.png"]',
  '{
    "nodes": [
      {
        "id": "web-dmz",
        "label": "Web Server (DMZ)",
        "type": "server",
        "ip": "203.0.113.10",
        "os": "Ubuntu 20.04",
        "services": ["Apache:80", "HTTPS:443", "SSH:22"],
        "vulnerabilities": ["SQL Injection", "Outdated Apache"],
        "compromised": true,
        "criticality": "critical"
      },
      {
        "id": "db-internal",
        "label": "Database Server",
        "type": "server",
        "ip": "10.0.1.50",
        "os": "MySQL 8.0",
        "services": ["MySQL:3306"],
        "vulnerabilities": ["Weak authentication", "Exposed to DMZ"],
        "compromised": true,
        "criticality": "critical"
      },
      {
        "id": "firewall-perimeter",
        "label": "Perimeter Firewall",
        "type": "firewall",
        "ip": "203.0.113.1",
        "os": "pfSense",
        "services": ["HTTP:80", "HTTPS:443"],
        "vulnerabilities": [],
        "compromised": false,
        "criticality": "high"
      },
      {
        "id": "admin-ws",
        "label": "Admin Workstation",
        "type": "workstation",
        "ip": "10.0.1.100",
        "os": "Windows 11",
        "services": ["RDP:3389", "SMB:445"],
        "vulnerabilities": ["Cached credentials"],
        "compromised": false,
        "criticality": "high"
      }
    ],
    "connections": [
      {
        "from": "firewall-perimeter",
        "to": "web-dmz",
        "type": "ethernet",
        "port": "80,443",
        "protocol": "TCP"
      },
      {
        "from": "web-dmz",
        "to": "db-internal",
        "type": "ethernet",
        "port": "3306",
        "protocol": "TCP"
      },
      {
        "from": "db-internal",
        "to": "admin-ws",
        "type": "ethernet",
        "port": "445",
        "protocol": "TCP"
      }
    ]
  }',
  '{
    "steps": [
      {
        "id": "recon",
        "title": "Initial Reconnaissance",
        "description": "Identified customer portal and performed initial enumeration",
        "timestamp": "2024-06-22T10:00:00Z",
        "tools": ["Nmap", "Dirb"],
        "techniques": ["T1595.001"],
        "targets": ["web-dmz"],
        "success": true,
        "evidence": ["nmap-scan.txt", "directory-enum.txt"]
      },
      {
        "id": "sqli-discovery",
        "title": "SQL Injection Discovery",
        "description": "Discovered SQL injection vulnerability in login form",
        "timestamp": "2024-06-22T11:30:00Z",
        "tools": ["SQLMap", "Burp Suite"],
        "techniques": ["T1190"],
        "targets": ["web-dmz"],
        "success": true,
        "evidence": ["sqli-proof.png", "error-messages.txt"]
      },
      {
        "id": "db-extraction",
        "title": "Database Extraction",
        "description": "Extracted user credentials and sensitive data",
        "timestamp": "2024-06-22T12:15:00Z",
        "tools": ["SQLMap"],
        "techniques": ["T1005"],
        "targets": ["db-internal"],
        "success": true,
        "evidence": ["user-dump.sql", "admin-hashes.txt"]
      },
      {
        "id": "credential-cracking",
        "title": "Password Cracking",
        "description": "Cracked admin password hashes",
        "timestamp": "2024-06-22T13:00:00Z",
        "tools": ["Hashcat", "Rockyou wordlist"],
        "techniques": ["T1110.002"],
        "targets": ["admin-ws"],
        "success": true,
        "evidence": ["cracked-passwords.txt"]
      }
    ],
    "timeline": {
      "start": "2024-06-22T10:00:00Z",
      "end": "2024-06-22T13:30:00Z",
      "duration": "3.5 hours"
    },
    "impact": {
      "confidentiality": "high",
      "integrity": "high",
      "availability": "medium",
      "scope": ["web-dmz", "db-internal"]
    }
  }',
  'admin-user-001'
);

-- Sample Finding 2: Network Lateral Movement Attack
INSERT INTO findings (
  title,
  description,
  severity,
  category,
  status,
  cvss_score,
  network_topology,
  exploitation_flow,
  reported_by_id
) VALUES (
  'Domain Controller Compromise via SMB Relay',
  'Successful lateral movement attack leading to domain controller compromise through SMB relay and credential harvesting.',
  'critical',
  'network',
  'verified',
  '9.6',
  '{
    "nodes": [
      {
        "id": "workstation-1",
        "label": "Employee Workstation",
        "type": "workstation",
        "ip": "192.168.1.50",
        "os": "Windows 10",
        "services": ["SMB:445", "RDP:3389"],
        "vulnerabilities": ["SMB signing disabled"],
        "compromised": true,
        "criticality": "medium"
      },
      {
        "id": "file-server",
        "label": "File Server",
        "type": "server",
        "ip": "192.168.1.20",
        "os": "Windows Server 2019",
        "services": ["SMB:445", "RPC:135"],
        "vulnerabilities": ["Relay attack possible"],
        "compromised": true,
        "criticality": "high"
      },
      {
        "id": "domain-controller",
        "label": "Domain Controller",
        "type": "server",
        "ip": "192.168.1.10",
        "os": "Windows Server 2022",
        "services": ["LDAP:389", "Kerberos:88", "SMB:445"],
        "vulnerabilities": ["Administrative access gained"],
        "compromised": true,
        "criticality": "critical"
      },
      {
        "id": "core-switch",
        "label": "Core Network Switch",
        "type": "switch",
        "ip": "192.168.1.1",
        "os": "Cisco IOS",
        "services": ["SNMP:161", "SSH:22"],
        "vulnerabilities": [],
        "compromised": false,
        "criticality": "high"
      }
    ],
    "connections": [
      {
        "from": "core-switch",
        "to": "workstation-1",
        "type": "ethernet",
        "port": "445",
        "protocol": "TCP"
      },
      {
        "from": "core-switch",
        "to": "file-server",
        "type": "ethernet",
        "port": "445",
        "protocol": "TCP"
      },
      {
        "from": "core-switch",
        "to": "domain-controller",
        "type": "ethernet",
        "port": "389,88",
        "protocol": "TCP"
      }
    ]
  }',
  '{
    "steps": [
      {
        "id": "initial-access",
        "title": "Initial Network Access",
        "description": "Gained initial foothold on employee workstation via phishing",
        "timestamp": "2024-06-22T09:00:00Z",
        "tools": ["Metasploit", "Custom payload"],
        "techniques": ["T1566.001"],
        "targets": ["workstation-1"],
        "success": true,
        "evidence": ["phishing-email.eml", "initial-shell.txt"]
      },
      {
        "id": "network-discovery",
        "title": "Network Discovery",
        "description": "Enumerated network hosts and services",
        "timestamp": "2024-06-22T09:30:00Z",
        "tools": ["NetView", "PowerShell"],
        "techniques": ["T1018"],
        "targets": ["workstation-1"],
        "success": true,
        "evidence": ["network-hosts.txt", "service-enum.txt"]
      },
      {
        "id": "smb-relay",
        "title": "SMB Relay Attack",
        "description": "Performed SMB relay attack to authenticate to file server",
        "timestamp": "2024-06-22T10:15:00Z",
        "tools": ["Responder", "ntlmrelayx"],
        "techniques": ["T1557.001"],
        "targets": ["file-server"],
        "success": true,
        "evidence": ["relay-attack.pcap", "file-server-access.txt"]
      },
      {
        "id": "credential-harvest",
        "title": "Credential Harvesting",
        "description": "Dumped LSASS memory to extract domain credentials",
        "timestamp": "2024-06-22T11:00:00Z",
        "tools": ["Mimikatz", "ProcDump"],
        "techniques": ["T1003.001"],
        "targets": ["file-server"],
        "success": true,
        "evidence": ["lsass-dump.dmp", "domain-creds.txt"]
      },
      {
        "id": "dc-compromise",
        "title": "Domain Controller Access",
        "description": "Used harvested credentials to access domain controller",
        "timestamp": "2024-06-22T11:45:00Z",
        "tools": ["PSExec", "WMI"],
        "techniques": ["T1021.002"],
        "targets": ["domain-controller"],
        "success": true,
        "evidence": ["dc-shell.txt", "admin-privileges.png"]
      },
      {
        "id": "persistence",
        "title": "Establish Persistence",
        "description": "Created golden ticket for persistent domain access",
        "timestamp": "2024-06-22T12:30:00Z",
        "tools": ["Mimikatz"],
        "techniques": ["T1558.001"],
        "targets": ["domain-controller"],
        "success": true,
        "evidence": ["golden-ticket.kirbi", "persistence-test.txt"]
      }
    ],
    "timeline": {
      "start": "2024-06-22T09:00:00Z",
      "end": "2024-06-22T13:00:00Z",
      "duration": "4 hours"
    },
    "impact": {
      "confidentiality": "critical",
      "integrity": "critical",
      "availability": "high",
      "scope": ["workstation-1", "file-server", "domain-controller"]
    }
  }',
  'admin-user-001'
);

-- Sample Finding 3: Cloud Infrastructure Compromise
INSERT INTO findings (
  title,
  description,
  severity,
  category,
  status,
  cvss_score,
  network_topology,
  exploitation_flow,
  reported_by_id
) VALUES (
  'AWS S3 Bucket Misconfiguration Leading to Data Exposure',
  'Discovered publicly accessible S3 bucket containing sensitive customer data and application secrets.',
  'high',
  'infrastructure',
  'verified',
  '7.5',
  '{
    "nodes": [
      {
        "id": "aws-s3",
        "label": "AWS S3 Bucket",
        "type": "server",
        "ip": "52.218.0.0/16",
        "os": "AWS S3",
        "services": ["HTTPS:443"],
        "vulnerabilities": ["Public read access", "No encryption"],
        "compromised": true,
        "criticality": "high"
      },
      {
        "id": "web-app",
        "label": "Web Application",
        "type": "server",
        "ip": "203.0.113.50",
        "os": "Ubuntu 22.04",
        "services": ["HTTPS:443", "SSH:22"],
        "vulnerabilities": ["Exposed API keys"],
        "compromised": true,
        "criticality": "high"
      },
      {
        "id": "cdn",
        "label": "CloudFront CDN",
        "type": "server",
        "ip": "54.230.0.0/15",
        "os": "AWS CloudFront",
        "services": ["HTTPS:443"],
        "vulnerabilities": ["Origin exposure"],
        "compromised": false,
        "criticality": "medium"
      }
    ],
    "connections": [
      {
        "from": "cdn",
        "to": "web-app",
        "type": "internet",
        "port": "443",
        "protocol": "HTTPS"
      },
      {
        "from": "web-app",
        "to": "aws-s3",
        "type": "internet",
        "port": "443",
        "protocol": "HTTPS"
      }
    ]
  }',
  '{
    "steps": [
      {
        "id": "bucket-discovery",
        "title": "S3 Bucket Discovery",
        "description": "Discovered S3 bucket through subdomain enumeration",
        "timestamp": "2024-06-22T14:00:00Z",
        "tools": ["AWS CLI", "S3Scanner"],
        "techniques": ["T1526"],
        "targets": ["aws-s3"],
        "success": true,
        "evidence": ["bucket-discovery.txt", "dns-enum.txt"]
      },
      {
        "id": "bucket-enumeration",
        "title": "Bucket Content Enumeration",
        "description": "Listed all objects in the publicly accessible bucket",
        "timestamp": "2024-06-22T14:30:00Z",
        "tools": ["AWS CLI", "Custom scripts"],
        "techniques": ["T1530"],
        "targets": ["aws-s3"],
        "success": true,
        "evidence": ["bucket-contents.txt", "file-listing.json"]
      },
      {
        "id": "data-extraction",
        "title": "Sensitive Data Download",
        "description": "Downloaded customer database backups and configuration files",
        "timestamp": "2024-06-22T15:00:00Z",
        "tools": ["AWS CLI", "wget"],
        "techniques": ["T1005"],
        "targets": ["aws-s3"],
        "success": true,
        "evidence": ["customer-data.sql", "app-config.json"]
      },
      {
        "id": "api-key-discovery",
        "title": "API Key Discovery",
        "description": "Found AWS API keys in configuration files",
        "timestamp": "2024-06-22T15:30:00Z",
        "tools": ["grep", "TruffleHog"],
        "techniques": ["T1552.001"],
        "targets": ["web-app"],
        "success": true,
        "evidence": ["api-keys.txt", "secrets-scan.json"]
      }
    ],
    "timeline": {
      "start": "2024-06-22T14:00:00Z",
      "end": "2024-06-22T16:00:00Z",
      "duration": "2 hours"
    },
    "impact": {
      "confidentiality": "high",
      "integrity": "low",
      "availability": "low",
      "scope": ["aws-s3", "web-app"]
    }
  }',
  'admin-user-001'
);

-- Sample Finding 4: Wireless Network Compromise
INSERT INTO findings (
  title,
  description,
  severity,
  category,
  status,
  cvss_score,
  network_topology,
  exploitation_flow,
  reported_by_id
) VALUES (
  'WPA2 Enterprise Bypass and Network Infiltration',
  'Bypassed WPA2 Enterprise authentication and gained access to internal corporate network.',
  'high',
  'network',
  'verified',
  '8.1',
  '{
    "nodes": [
      {
        "id": "wireless-ap",
        "label": "Wireless Access Point",
        "type": "router",
        "ip": "192.168.10.1",
        "os": "Cisco WLC",
        "services": ["HTTPS:443", "SNMP:161"],
        "vulnerabilities": ["Weak EAP configuration"],
        "compromised": true,
        "criticality": "high"
      },
      {
        "id": "radius-server",
        "label": "RADIUS Server",
        "type": "server",
        "ip": "192.168.1.30",
        "os": "Windows Server 2019",
        "services": ["RADIUS:1812", "LDAP:389"],
        "vulnerabilities": ["Certificate validation bypass"],
        "compromised": true,
        "criticality": "high"
      },
      {
        "id": "employee-laptop",
        "label": "Employee Laptop",
        "type": "workstation",
        "ip": "192.168.10.100",
        "os": "Windows 11",
        "services": ["SMB:445"],
        "vulnerabilities": ["Saved wireless credentials"],
        "compromised": true,
        "criticality": "medium"
      }
    ],
    "connections": [
      {
        "from": "wireless-ap",
        "to": "radius-server",
        "type": "ethernet",
        "port": "1812",
        "protocol": "UDP"
      },
      {
        "from": "wireless-ap",
        "to": "employee-laptop",
        "type": "wifi",
        "port": "All",
        "protocol": "802.11"
      }
    ]
  }',
  '{
    "steps": [
      {
        "id": "wireless-recon",
        "title": "Wireless Reconnaissance",
        "description": "Identified corporate wireless networks and security configurations",
        "timestamp": "2024-06-22T08:00:00Z",
        "tools": ["Airodump-ng", "Wireshark"],
        "techniques": ["T1040"],
        "targets": ["wireless-ap"],
        "success": true,
        "evidence": ["wireless-scan.pcap", "network-list.txt"]
      },
      {
        "id": "evil-twin",
        "title": "Evil Twin Attack",
        "description": "Created rogue access point to capture credentials",
        "timestamp": "2024-06-22T09:00:00Z",
        "tools": ["hostapd", "FreeRADIUS"],
        "techniques": ["T1557.002"],
        "targets": ["employee-laptop"],
        "success": true,
        "evidence": ["captured-handshake.cap", "evil-twin-log.txt"]
      },
      {
        "id": "credential-capture",
        "title": "Credential Interception",
        "description": "Intercepted and cracked wireless credentials",
        "timestamp": "2024-06-22T10:30:00Z",
        "tools": ["asleap", "john"],
        "techniques": ["T1110.002"],
        "targets": ["radius-server"],
        "success": true,
        "evidence": ["cracked-creds.txt", "mschap-challenge.txt"]
      },
      {
        "id": "network-access",
        "title": "Network Infiltration",
        "description": "Connected to corporate network using captured credentials",
        "timestamp": "2024-06-22T11:15:00Z",
        "tools": ["wpa_supplicant"],
        "techniques": ["T1078"],
        "targets": ["wireless-ap"],
        "success": true,
        "evidence": ["network-connection.png", "dhcp-lease.txt"]
      }
    ],
    "timeline": {
      "start": "2024-06-22T08:00:00Z",
      "end": "2024-06-22T12:00:00Z",
      "duration": "4 hours"
    },
    "impact": {
      "confidentiality": "high",
      "integrity": "medium",
      "availability": "low",
      "scope": ["wireless-ap", "radius-server", "employee-laptop"]
    }
  }',
  'admin-user-001'
);