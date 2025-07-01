# SecureTeam Tracker

A comprehensive cybersecurity collaboration and analysis platform designed to empower security professionals with advanced reporting, threat management, and collaborative investigation capabilities.

![SecureTeam Tracker](https://img.shields.io/badge/SecureTeam-Tracker-red?style=for-the-badge&logo=security&logoColor=white)

## 🎯 Overview

SecureTeam Tracker is a full-stack web application built for internal penetration testing teams and red team operations. It provides a centralized platform for managing security findings, collaborating on investigations, generating professional reports, and maintaining comprehensive audit trails.

## 🚀 Features

### 🔐 Authentication & User Management
- **Role-based access control** (Admin, User, Team Lead)
- **User approval workflow** with admin oversight
- **Strong password policies** with real-time validation
- **Session management** with secure authentication
- **Multi-user collaboration** capabilities

### 🔍 Security Finding Management
- **Dynamic finding categorization** with severity levels
- **Advanced filtering and search** capabilities
- **User assignment and tracking** for workload distribution
- **Evidence attachment support** (files, screenshots, documents)
- **Real-time commenting system** for collaboration
- **Status tracking** (Open, In Progress, Resolved, Closed)

### 📊 Reporting & Analytics
- **Professional PDF report generation** with custom branding
- **Automated report compilation** from selected findings
- **Executive summary generation** with statistics
- **Export capabilities** for external sharing
- **Audit trail maintenance** for compliance

### 💬 Real-time Communication
- **WebSocket-based messaging** system
- **Channel-based organization** for different teams/projects
- **File sharing** within conversations
- **Notification system** for important updates

### 📧 Email Integration
- **Exchange Server SMTP relay** support
- **Automated notifications** for key events
- **Customizable email templates** with branding
- **Admin testing interface** for configuration verification

### 🛡️ Security Features
- **Input validation and sanitization**
- **SQL injection prevention**
- **XSS protection** with content security policies
- **Secure file upload** with type validation
- **Environment-based configuration** management

## 🛠️ Tech Stack

### Frontend
- **[React 18](https://reactjs.org/)** - Modern UI library with hooks and concurrent features
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript development
- **[Vite](https://vitejs.dev/)** - Fast build tool and development server
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[shadcn/ui](https://ui.shadcn.com/)** - Beautiful and accessible component library
- **[React Hook Form](https://react-hook-form.com/)** - Performant forms with easy validation
- **[TanStack Query](https://tanstack.com/query/latest)** - Powerful data synchronization
- **[Wouter](https://github.com/molefrog/wouter)** - Lightweight client-side routing
- **[Lucide React](https://lucide.dev/)** - Beautiful and consistent icons
- **[Framer Motion](https://www.framer.com/motion/)** - Production-ready motion library

### Backend
- **[Node.js](https://nodejs.org/)** - JavaScript runtime environment
- **[Express.js](https://expressjs.com/)** - Fast and minimalist web framework
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe server development
- **[PostgreSQL](https://www.postgresql.org/)** - Advanced open-source relational database
- **[Drizzle ORM](https://orm.drizzle.team/)** - TypeScript ORM with excellent performance
- **[WebSocket (ws)](https://github.com/websockets/ws)** - Real-time bidirectional communication
- **[Nodemailer](https://nodemailer.com/)** - Email sending with SMTP support
- **[Puppeteer](https://pptr.dev/)** - PDF generation and web scraping
- **[Multer](https://github.com/expressjs/multer)** - Middleware for file uploads

### Database & ORM
- **[PostgreSQL](https://www.postgresql.org/)** - Primary database with JSONB support
- **[Drizzle ORM](https://orm.drizzle.team/)** - Type-safe database operations
- **[Drizzle Kit](https://orm.drizzle.team/kit-docs/overview)** - Database migration and schema management
- **[Zod](https://zod.dev/)** - TypeScript-first schema validation

### Authentication & Security
- **[Express Session](https://github.com/expressjs/session)** - Session management
- **[Connect-PG-Simple](https://github.com/voxpelli/node-connect-pg-simple)** - PostgreSQL session store
- **[Crypto (Node.js)](https://nodejs.org/api/crypto.html)** - Password hashing and security
- **[Helmet.js](https://helmetjs.github.io/)** - Security headers and protection

### Development & Build Tools
- **[TSX](https://github.com/esbuild-kit/tsx)** - TypeScript execution and hot reload
- **[ESBuild](https://esbuild.github.io/)** - Fast JavaScript bundler
- **[PostCSS](https://postcss.org/)** - CSS transformation and optimization
- **[Autoprefixer](https://autoprefixer.github.io/)** - CSS vendor prefixing

### Email & Communication
- **[Nodemailer](https://nodemailer.com/)** - Email sending with Exchange Server support
- **Exchange Server SMTP** - Enterprise email relay integration
- **WebSocket Server** - Real-time messaging and notifications

## 🏗️ Architecture

### System Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React Frontend │    │  Express Backend │    │   PostgreSQL    │
│                 │────│                  │────│    Database     │
│   • TypeScript  │    │   • TypeScript   │    │                 │
│   • Tailwind    │    │   • Drizzle ORM  │    │   • JSONB       │
│   • TanStack    │    │   • WebSockets   │    │   • Sessions    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  File Storage   │    │  Email Service   │    │  PDF Generation │
│                 │    │                  │    │                 │
│   • Attachments │    │  • Exchange SMTP │    │   • Puppeteer   │
│   • Reports     │    │  • Templates     │    │   • Custom CSS  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Database Schema
- **Users** - Authentication and profile management
- **Findings** - Security vulnerabilities and issues
- **Comments** - Collaborative discussions
- **Attachments** - File evidence and documentation
- **Reports** - Generated analysis documents
- **Messages** - Real-time communication
- **Sessions** - Secure session storage

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** and npm
- **PostgreSQL 12+** database
- **Exchange Server** (optional, for email notifications)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/secureteam-tracker.git
   cd secureteam-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your database and email configuration
   ```

4. **Set up database**
   ```bash
   npm run db:push
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Open http://localhost:5000 in your browser
   - Register a new account (requires admin approval)

### Production Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Configure production environment**
   ```bash
   # Set production environment variables
   export NODE_ENV=production
   export DATABASE_URL="your-production-database-url"
   export SESSION_SECRET="your-secure-session-secret"
   ```

3. **Start production server**
   ```bash
   npm start
   ```

## 📝 Configuration

### Environment Variables

#### Database Configuration
```env
DATABASE_URL=postgresql://user:password@host:port/database
```

#### Session Management
```env
SESSION_SECRET=your-super-secret-session-key
```

#### Email Configuration (Exchange Server)
```env
SMTP_HOST=your-exchange-server.company.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=service-account@company.com
SMTP_PASS=service-account-password
EMAIL_NOTIFICATIONS_ENABLED=true
EMAIL_ADMIN_RECIPIENTS=admin@company.com,security@company.com
```

#### Application Settings
```env
NODE_ENV=development
PORT=5000
```

## 🔧 API Endpoints

### Authentication
- `POST /api/register` - User registration
- `POST /api/login` - User authentication
- `POST /api/logout` - Session termination
- `GET /api/user` - Current user profile

### Findings Management
- `GET /api/findings` - List all findings with filters
- `POST /api/findings` - Create new finding
- `GET /api/findings/:id` - Get specific finding
- `PATCH /api/findings/:id` - Update finding
- `DELETE /api/findings/:id` - Delete finding

### User Administration
- `GET /api/admin/users` - List all users (admin only)
- `POST /api/admin/users` - Create new user (admin only)
- `PATCH /api/admin/users/:id/role` - Update user role
- `POST /api/admin/users/:id/approve` - Approve user registration

### Reports
- `POST /api/reports` - Generate new report
- `GET /api/reports` - List all reports
- `GET /api/reports/:id/download` - Download report PDF

### Email Testing
- `POST /api/admin/test-email` - Test email configuration (admin only)

## 🔒 Security Features

### Password Security
- **Minimum 12 characters** with complexity requirements
- **Real-time strength validation** with visual feedback
- **Secure hashing** using scrypt algorithm
- **Password history** to prevent reuse

### Data Protection
- **Input sanitization** and validation on all endpoints
- **Parameterized queries** to prevent SQL injection
- **File type validation** for uploads
- **Session-based authentication** with secure cookies

### Access Control
- **Role-based permissions** (Admin, User, Team Lead)
- **Route-level protection** for sensitive operations
- **User approval workflow** for new registrations
- **Audit logging** for administrative actions

## 📊 Database Schema

### Core Tables
```sql
-- Users table with role-based access
users (id, username, email, firstName, lastName, role, status, password_hash)

-- Security findings with categorization
findings (id, title, description, severity, category, status, evidence, assigned_to)

-- Collaborative comments
comments (id, finding_id, user_id, content, created_at)

-- File attachments
attachments (id, finding_id, filename, file_path, mime_type, uploaded_by)

-- Generated reports
reports (id, title, description, findings, file_path, generated_by)

-- Real-time messages
messages (id, channel, user_id, content, created_at)
```

## 🧪 Testing

### Manual Testing
The application includes built-in testing capabilities:
- **Email configuration testing** in admin settings
- **Database connection validation** on startup
- **File upload verification** with type checking
- **Authentication flow testing** with session management

### API Testing
Use the included test scripts or tools like Postman:
```bash
# Test user registration
curl -X POST http://localhost:5000/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"SecurePass123!","firstName":"Test","lastName":"User","email":"test@example.com"}'
```

## 📚 Documentation

- **[Email Configuration Guide](EMAIL_CONFIGURATION_GUIDE.md)** - Exchange Server setup
- **[API Documentation](docs/api.md)** - Complete endpoint reference
- **[Deployment Guide](docs/deployment.md)** - Production deployment instructions
- **[User Manual](docs/user-guide.md)** - End-user documentation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Use meaningful commit messages
- Add appropriate error handling
- Update documentation for new features
- Test email notifications with Exchange Server

## 📈 Performance Optimizations

### Frontend
- **Code splitting** with dynamic imports
- **Image optimization** and lazy loading
- **Memoization** of expensive computations
- **Bundle optimization** with Vite

### Backend
- **Database indexing** for common queries
- **Connection pooling** for PostgreSQL
- **Efficient file handling** with streaming
- **Session store optimization**

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify PostgreSQL is running
   - Check connection string format
   - Ensure database exists and permissions are correct

2. **Email Not Sending**
   - Test Exchange Server connectivity
   - Verify SMTP credentials
   - Check firewall rules for port 587

3. **File Upload Issues**
   - Check server disk space
   - Verify file permissions
   - Review file size limits

4. **Session Problems**
   - Clear browser cookies
   - Check session store configuration
   - Verify session secret is set

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Support

For support and questions:
- Check the troubleshooting section above
- Review the email configuration guide
- Test system components using built-in diagnostics
- Monitor application logs for detailed error information

## 🚀 Roadmap

### Planned Features
- **LDAP/Active Directory integration** for enterprise authentication
- **Advanced analytics dashboard** with charts and metrics
- **Mobile-responsive interface** improvements
- **Automated vulnerability scanning** integration
- **Advanced reporting templates** with custom branding
- **Multi-tenant support** for larger organizations

---

**SecureTeam Tracker** - Empowering cybersecurity professionals with collaborative investigation capabilities.