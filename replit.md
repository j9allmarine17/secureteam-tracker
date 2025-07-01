# SecureTeam Tracker - Project Documentation

## Overview
A comprehensive multi-user collaboration platform for internal penetration tests and red team operations. Features include user management, findings sharing, automated report generation, email notifications, real-time communication, and Active Directory integration.

## Recent Changes

### Active Directory Integration (June 24, 2025)
- Added database schema support for multiple authentication sources (local, ldap, replit)
- Implemented LDAP authentication with automatic user creation and role mapping
- Created AD test interface at `/ad-test` for configuration validation
- Added comprehensive setup guides and PowerShell commands for AD configuration
- Enhanced email notifications to work with AD email addresses

### Email Enhancement (Previous)
- Enhanced email notification system with direct finding links using server IP (172.31.128.27)
- Updated email templates with clickable "View Finding" buttons
- Configured frontend pages to handle email link parameters for seamless navigation

## Project Architecture

### Authentication System
- **Local Authentication**: Username/password with bcrypt hashing
- **Active Directory**: LDAP integration with automatic user provisioning
- **Session Management**: Express sessions with PostgreSQL storage
- **Role-Based Access**: Admin, Team Lead, Analyst roles with group mapping

### Database Schema
- **PostgreSQL**: Primary database with Neon hosting
- **Users**: Enhanced with authSource field for multi-auth support
- **Findings**: Security vulnerabilities with MITRE ATT&CK mapping
- **Reports**: Automated PDF generation with visualization data
- **Messages**: Real-time chat with WebSocket support
- **Attachments**: File uploads with finding associations

### Core Features
1. **User Management**: Multi-source authentication, role assignment, approval workflow
2. **Findings Management**: CRUD operations, severity classification, status tracking
3. **Real-time Communication**: WebSocket-based chat with channels
4. **Report Generation**: PDF reports with charts and finding summaries
5. **Email Notifications**: SMTP integration with enhanced templates
6. **Visualizations**: Mermaid.js network diagrams and attack flows
7. **File Attachments**: Secure file upload and management

### Technology Stack
- **Frontend**: React, TypeScript, Tailwind CSS, Wouter routing
- **Backend**: Express.js, TypeScript, PostgreSQL
- **Authentication**: Passport.js with LDAP support
- **Real-time**: WebSocket Server
- **Email**: Nodemailer with SMTP
- **Reports**: Puppeteer for PDF generation
- **Visualization**: Mermaid.js for diagrams

## User Preferences
- Focus on security and enterprise integration
- Prefer comprehensive documentation and setup guides
- Requires production-ready solutions with proper error handling
- Values automation and seamless user experience

## Configuration Status

### Email System
- Configured for Exchange/SMTP servers
- Templates include direct finding links with server IP
- Notifications for new findings, assignments, and status changes

### Active Directory
- Database schema ready with authSource field
- LDAP authentication endpoints implemented
- Role mapping based on AD security groups
- Test interface available at `/ad-test`
- Requires domain controller configuration

### Production Deployment
- Application runs on port 5000
- Database: Neon PostgreSQL
- Server IP: 172.31.128.27 (for email links)
- Session storage: PostgreSQL-backed

## Next Steps
1. Configure Active Directory environment variables
2. Set up AD security groups for role mapping
3. Test LDAP connectivity and user authentication
4. Deploy to production with proper SSL/TLS configuration