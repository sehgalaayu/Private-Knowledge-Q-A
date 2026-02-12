# Private Knowledge Q&A

A production-ready full-stack web application for private document-based Q&A using RAG (Retrieval Augmented Generation).

## 🌟 Features

- **Document Upload**: Upload text documents with drag-and-drop interface
- **AI-Powered Q&A**: Ask questions and get accurate answers from your documents
- **Source Citations**: See exactly which document and snippet the answer came from
- **Beautiful UI**: Premium glassmorphism design with dark mode
- **Real-time Status**: Monitor system health and statistics

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- Python 3.8+
- MongoDB

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env  # Configure your environment variables
python -m uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The application will be available at `http://localhost:3000`

## 🏗️ Architecture

### Backend (FastAPI + Python)

- **FastAPI**: Modern, fast web framework
- **MongoDB**: Document and chunk storage
- **OpenAI API**: Embeddings and text generation
- **NumPy**: Cosine similarity calculations

### Frontend (React + TypeScript)

- **React**: UI framework
- **Framer Motion**: Smooth animations
- **Tailwind CSS**: Styling
- **Lucide Icons**: Beautiful icons
- **Sonner**: Toast notifications

## 📖 How It Works

### Document Upload Process

1. User uploads a text file
2. File is split into ~300-word chunks with overlap
3. Each chunk is embedded using OpenAI's text-embedding-3-small
4. Chunks and embeddings are stored in MongoDB

### Question Answering (RAG)

1. User asks a question
2. Question is embedded using the same model
3. Cosine similarity is calculated between question and all chunks
4. Top 3 most similar chunks are retrieved
5. Chunks are sent to GPT-4o with strict prompt
6. AI generates answer with source citations

## 🔐 Environment Variables

### Backend (.env)

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=knowledge_qa
CORS_ORIGINS=*
EMERGENT_LLM_KEY=your_key_here
```

### Frontend (.env)

```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

## 📊 API Endpoints

### Documents

- `POST /api/documents/upload` - Upload a document
- `GET /api/documents` - List all documents
- `GET /api/documents/{id}` - Get specific document

### Q&A

- `POST /api/ask` - Ask a question

### Health

- `GET /api/health` - System health check

## 🎨 UI Components

- **GlassCard**: Glassmorphic container component
- **GlowButton**: Primary action button with glow effect
- **SourcePill**: Citation tag component
- **DashboardLayout**: Main layout with sidebar navigation

## 📝 Pages

- **Home**: Dashboard with stats and quick actions
- **Upload**: Drag-and-drop document upload
- **Ask**: Question input with split-view answer/sources
- **Documents**: Library of uploaded documents
- **Status**: System health monitoring

## 🧪 Testing

Run the testing suite to verify all functionality:

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

## 🚢 Deployment

The application is production-ready and can be deployed to:

- **Frontend**: Vercel, Netlify, AWS S3 + CloudFront
- **Backend**: AWS EC2, Google Cloud Run, Railway
- **Database**: MongoDB Atlas, AWS DocumentDB

## 📄 License

MIT License - feel free to use for personal or commercial projects.

## 🙏 Credits

Built with modern web technologies and AI-powered by OpenAI.