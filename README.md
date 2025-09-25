# Insurance Analyzer Agent - Litigation Analyzer

A sophisticated AI-powered document analysis platform designed for legal professionals to analyze litigation documents with intelligent chat capabilities and dynamic RAG (Retrieval-Augmented Generation) technology.

## 🚀 Overview

The Accenture Insurance Agent is a comprehensive litigation analysis tool that combines advanced AI agents with dynamic RAG technology to provide intelligent document processing, analysis, and interactive chat capabilities. The platform processes PDF documents, extracts key information, and enables users to interact with their documents through an AI-powered chat interface.

## ✨ Key Features

### 📄 Document Processing
- **Multi-PDF Upload**: Process multiple PDF documents simultaneously
- **Intelligent Text Extraction**: Advanced PDF parsing with metadata extraction
- **Document Management**: Store and manage litigation documents with MongoDB
- **Real-time Processing**: Live progress tracking with step-by-step status updates

### 🤖 AI Agent Integration
- **Lyzr AI Agents**: Integrated with multiple specialized AI agents:
  - **Chat Agent**: Interactive document Q&A (`NEXT_PUBLIC_AGENT_CHAT`)
  - **Short Summary Agent**: Concise document summaries (`NEXT_PUBLIC_SHORT_SUMMARY_AGENT`)
  - **Long Summary Agent**: Detailed document analysis (`NEXT_PUBLIC_LONG_SUMMARY_AGENT`)

### 🧠 Dynamic RAG System
- **Intelligent Knowledge Base**: Dynamic RAG creation for each document set
- **Contextual Retrieval**: MMR (Maximal Marginal Relevance) retrieval with configurable parameters
- **Multi-stage Training**: RAG training with original documents and AI-generated summaries
- **Session-based Context**: Maintains conversation context across chat sessions

### 🔐 User Management
- **Cookie-based Authentication**: Secure user session management
- **User Onboarding**: Guided setup process for new users
- **API Key Management**: Individual API keys per user for Lyzr services
- **Profile Management**: User profile and preferences tracking

### 📊 Process Tracking
- **Real-time Status Updates**: Live progress tracking for document processing
- **Dual Tracking Systems**: MongoDB and Supabase job storage options
- **Error Handling**: Comprehensive error tracking and recovery
- **Background Processing**: Asynchronous document processing with job queues

## 🏗️ Architecture

### Frontend
- **Next.js 15**: React-based application with App Router
- **TypeScript**: Full type safety and development experience
- **Tailwind CSS**: Modern, responsive UI design
- **Redux Toolkit**: State management for user authentication and onboarding
- **PDF.js**: Client-side PDF rendering and interaction

### Backend
- **Next.js API Routes**: Serverless API endpoints
- **MongoDB**: Primary database for user data and document storage
- **Supabase**: Alternative storage option for job management
- **Mongoose**: MongoDB object modeling and validation

### AI Integration
- **Lyzr Studio SDK**: Direct integration with Lyzr AI platform
- **Dynamic RAG**: Real-time knowledge base creation and management
- **Multi-Agent Architecture**: Specialized agents for different tasks

## 🔧 Technology Stack

### Core Technologies
- **Next.js 15.1.7**: React framework with App Router
- **React 18.2.0**: Frontend library
- **TypeScript 5**: Type-safe JavaScript
- **Tailwind CSS 3.4.1**: Utility-first CSS framework

### Database & Storage
- **MongoDB**: Document database with Mongoose ODM
- **Supabase**: Alternative database and authentication
- **Mongoose 8.14.2**: MongoDB object modeling

### AI & ML
- **Lyzr Agent SDK**: AI agent integration
- **OpenAI 4.77.0**: AI model integration
- **PDF Processing**: pdf-parse, pdfjs-dist for document handling

### UI Components
- **Framer Motion 11.15.0**: Animation library
- **Lucide React**: Icon library
- **React PDF**: PDF rendering components
- **Lottie Files**: Animation components

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- MongoDB database
- Lyzr AI API access
- Supabase account (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd accenture-insurance-agent
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env.local
   ```
   Configure your environment variables (see Environment Variables section)

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Access the application**
   Open [http://localhost:3000](http://localhost:3000) in your browser

### Build for Production
```bash
npm run build
npm start
```

## 🔑 Environment Variables

Create a `.env.local` file with the following variables:

### Required Variables
```env
# MongoDB Configuration
NEXT_PUBLIC_MONGODB_URI=mongodb://localhost:27017/litigation-agent

# Lyzr AI Configuration
NEXT_PUBLIC_LYZR_API_KEY=your_lyzr_api_key_here

# AI Agent IDs
NEXT_PUBLIC_AGENT_CHAT=your_chat_agent_id
NEXT_PUBLIC_SHORT_SUMMARY_AGENT=your_short_summary_agent_id
NEXT_PUBLIC_LONG_SUMMARY_AGENT=your_long_summary_agent_id

# Supabase Configuration (Optional)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

See `.env.example` for complete configuration details.

## 📁 Project Structure

```
accenture-insurance-agent/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── chat/                 # Chat API with RAG integration
│   │   ├── litigation-document/  # Document processing
│   │   ├── litigation-summary/   # Summary generation
│   │   └── process-status/       # Status tracking
│   ├── pdf-insights-chat/        # Main chat interface
│   ├── onboarding/               # User onboarding flow
│   └── process-status/           # Status tracking UI
├── components/                   # React components
│   ├── ui/                       # UI components
│   ├── AuthProvider.tsx          # Authentication context
│   └── ProfileHeader.tsx         # User profile component
├── lib/                          # Utility libraries
│   └── mongodb.ts                # Database connection
├── models/                       # Mongoose models
│   ├── User.ts                   # User model
│   ├── LitigationDoc.ts          # Document model
│   └── BatchJob.ts               # Job tracking model
├── utils/                        # Utility functions
│   ├── LyzrApiCall.ts            # Lyzr AI integration
│   ├── ragApiCall.ts             # RAG operations
│   ├── processStatus.ts          # Status tracking
│   └── auth.ts                   # Authentication utilities
└── store/                        # Redux store
    └── onboardingSlice.ts       # Onboarding state
```

## 🔄 Dynamic RAG Workflow

### 1. Document Upload
- User uploads PDF documents
- System extracts text and metadata
- Creates unique RAG instance for document set

### 2. RAG Training
- **Stage 1**: Train with original document text
- **Stage 2**: Generate AI summaries using specialized agents
- **Stage 3**: Train RAG with AI-generated summaries
- **Stage 4**: Enable contextual chat capabilities

### 3. Chat Integration
- RAG provides contextual document retrieval
- MMR algorithm ensures diverse, relevant results
- Configurable parameters (top_k=7, score_threshold=0)
- Session-based conversation context

## 🔐 Authentication Flow

### User Registration
1. User visits application
2. System generates unique user ID and API key
3. User data stored in MongoDB
4. Onboarding process initiated

### Session Management
- Cookie-based authentication
- Secure token storage
- Automatic session validation
- User profile management

## 📊 Process Tracking

### MongoDB-based Tracking
- Real-time status updates
- Step-by-step progress tracking
- Error handling and recovery
- Document and RAG ID management

### Supabase Alternative
- Job queue management
- Background processing
- Status polling system
- Result storage

## 🛠️ API Endpoints

### Authentication
- `GET /api/auth` - User authentication
- `PUT /api/auth` - Update user status

### Document Processing
- `POST /api/litigation-document` - Process PDF documents
- `POST /api/litigation-summary` - Generate document summaries
- `POST /api/process-pdf` - PDF processing with RAG

### Chat & RAG
- `POST /api/chat` - Interactive chat with RAG
- `POST /api/litigation-documents/[id]/train` - Train RAG

### Status Tracking
- `GET /api/process-status/[id]` - Get processing status
- `GET /api/jobs/[id]` - Get job status

## 🚀 Deployment

### Vercel Deployment
1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Docker Deployment
```bash
# Build Docker image
docker build -t litigation-agent .

# Run container
docker run -p 3000:3000 --env-file .env.local litigation-agent
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Contact the development team
- Check the documentation for common issues

## 🔮 Future Enhancements

- **Multi-language Support**: Support for documents in multiple languages
- **Advanced Analytics**: Document analysis metrics and insights
- **Collaboration Features**: Multi-user document sharing and collaboration
- **API Rate Limiting**: Enhanced API security and rate limiting
- **Mobile App**: React Native mobile application
- **Advanced RAG**: Enhanced retrieval algorithms and vector search

---

Built with ❤️ by the Accenture Insurance Agent team
