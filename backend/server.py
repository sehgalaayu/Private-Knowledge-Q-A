from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import json
import re
import numpy as np
from openai import AsyncOpenAI
import asyncio

# Load environment variables
from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import json
import re
import numpy as np
from openai import AsyncOpenAI
import asyncio

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# OpenAI-compatible client setup
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY') or os.environ.get('EMERGENT_LLM_KEY')
OPENAI_BASE_URL = os.environ.get('OPENAI_BASE_URL')
OPENAI_MODEL = os.environ.get('OPENAI_MODEL', 'gpt-4o')
OPENAI_EMBEDDING_MODEL = os.environ.get('OPENAI_EMBEDDING_MODEL', 'text-embedding-3-small')
OPENAI_EMBEDDING_BASE_URL = os.environ.get('OPENAI_EMBEDDING_BASE_URL', OPENAI_BASE_URL)
OPENAI_APP_URL = os.environ.get('OPENAI_APP_URL')
OPENAI_APP_NAME = os.environ.get('OPENAI_APP_NAME', 'Private Knowledge Q&A')

# Create the main app
app = FastAPI(title="Private Knowledge Q&A API")
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ============ MODELS ============

class Document(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    text: str
    upload_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    chunk_count: int = 0


class Chunk(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    document_id: str
    document_name: str
    text: str
    embedding: List[float]
    chunk_index: int


class AskRequest(BaseModel):
    question: str


class Source(BaseModel):
    document_id: str
    document_name: str
    snippet: str
    highlight: str
    score: float
    chunk_index: int


class AskResponse(BaseModel):
    answer: str
    sources: List[Source]
    confidence: str
    confidence_score: float


class HealthResponse(BaseModel):
    status: str
    database: str
    llm: str
    documents_count: int
    chunks_count: int


# ============ HELPERS ============

def chunk_text(text: str, chunk_size: int = 400, overlap: int = 100) -> List[str]:
    """Split text into character-based chunks with overlap."""
    if not text:
        return []

    chunks = []
    step = max(1, chunk_size - overlap)
    i = 0
    while i < len(text):
        chunk = text[i:i + chunk_size].strip()
        if chunk:
            chunks.append(chunk)
        i += step
        if i + overlap >= len(text):
            break
    return chunks


async def get_embedding(text: str) -> List[float]:
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not set")

    default_headers = {}
    if OPENAI_APP_URL:
        default_headers["HTTP-Referer"] = OPENAI_APP_URL
    if OPENAI_APP_NAME:
        default_headers["X-Title"] = OPENAI_APP_NAME

    client = AsyncOpenAI(
        api_key=OPENAI_API_KEY,
        base_url=OPENAI_EMBEDDING_BASE_URL or None,
        default_headers=default_headers or None,
    )
    response = await client.embeddings.create(
        model=OPENAI_EMBEDDING_MODEL,
        input=text,
    )
    return response.data[0].embedding


def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    a = np.array(vec1, dtype=np.float32)
    b = np.array(vec2, dtype=np.float32)
    denom = np.linalg.norm(a) * np.linalg.norm(b)
    if denom == 0:
        return 0.0
    value = float(np.dot(a, b) / denom)
    return max(-1.0, min(1.0, value))


def normalize_similarity(raw_cosine: float) -> float:
    normalized = (raw_cosine + 1.0) / 2.0
    return max(0.0, min(1.0, normalized))


def select_highlight_sentence(text: str, question: str) -> str:
    cleaned_question = re.sub(r"[^a-zA-Z0-9\s]", " ", question.lower())
    question_terms = {term for term in cleaned_question.split() if term}
    if not question_terms:
        return text.strip()

    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    best_sentence = sentences[0] if sentences else text
    best_score = -1

    for sentence in sentences:
        cleaned_sentence = re.sub(r"[^a-zA-Z0-9\s]", " ", sentence.lower())
        sentence_terms = {term for term in cleaned_sentence.split() if term}
        if not sentence_terms:
            continue
        overlap = len(question_terms & sentence_terms)
        score = overlap / max(1, len(question_terms))
        if score > best_score:
            best_score = score
            best_sentence = sentence

    return best_sentence.strip()


def parse_llm_json(text: str) -> Optional[dict]:
    if not text:
        return None
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", text)
        if not match:
            return None
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            return None


async def check_llm_connection() -> bool:
    try:
        await asyncio.wait_for(get_embedding("health check"), timeout=8)
        return True
    except Exception as e:
        logger.error(f"LLM health check failed: {e}")
        return False


# ============ API ENDPOINTS ============

@api_router.get("/")
async def root():
    return {"message": "Private Knowledge Q&A API", "version": "1.0.0"}


@api_router.post("/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    try:
        content = await file.read()
        text = content.decode('utf-8')
        if not text.strip():
            raise HTTPException(status_code=400, detail="File is empty")

        doc = Document(name=file.filename, text=text)
        chunks_text = chunk_text(text, chunk_size=400, overlap=100)
        doc.chunk_count = len(chunks_text)

        chunks = []
        for idx, chunk_content in enumerate(chunks_text):
            embedding = await get_embedding(chunk_content)
            chunks.append(
                Chunk(
                    document_id=doc.id,
                    document_name=doc.name,
                    text=chunk_content,
                    embedding=embedding,
                    chunk_index=idx,
                )
            )

        doc_dict = doc.model_dump()
        doc_dict['upload_date'] = doc_dict['upload_date'].isoformat()
        await db.documents.insert_one(doc_dict)

        if chunks:
            await db.chunks.insert_many([chunk.model_dump() for chunk in chunks])

        return {
            "id": doc.id,
            "name": doc.name,
            "chunk_count": doc.chunk_count,
            "message": "Document uploaded successfully",
        }
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File must be a text file (UTF-8)")
    except Exception as e:
        logger.error(f"Error uploading document: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/documents")
async def get_documents():
    try:
        docs = await db.documents.find({}, {"_id": 0, "text": 0}).to_list(1000)
        for doc in docs:
            if isinstance(doc.get('upload_date'), str):
                doc['upload_date'] = datetime.fromisoformat(doc['upload_date'])
        return {"documents": docs, "count": len(docs)}
    except Exception as e:
        logger.error(f"Error fetching documents: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/documents/{document_id}")
async def get_document(document_id: str):
    try:
        doc = await db.documents.find_one({"id": document_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        if isinstance(doc.get('upload_date'), str):
            doc['upload_date'] = datetime.fromisoformat(doc['upload_date'])
        return doc
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching document: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.delete("/documents/{document_id}")
async def delete_document(document_id: str):
    try:
        doc = await db.documents.find_one({"id": document_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        deleted_chunks = await db.chunks.delete_many({"document_id": document_id})
        deleted_doc = await db.documents.delete_one({"id": document_id})
        return {
            "id": document_id,
            "deleted": deleted_doc.deleted_count == 1,
            "deleted_chunks": deleted_chunks.deleted_count,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/ask", response_model=AskResponse)
async def ask_question(request: AskRequest):
    try:
        question = request.question
        if not question.strip():
            raise HTTPException(status_code=400, detail="Question cannot be empty")

        question_embedding = await get_embedding(question)
        all_chunks = await db.chunks.find({}, {"_id": 0}).to_list(10000)
        if not all_chunks:
            raise HTTPException(status_code=404, detail="No documents available. Please upload documents first.")

        chunk_scores = []
        for chunk_data in all_chunks:
            raw_cosine = cosine_similarity(question_embedding, chunk_data['embedding'])
            chunk_scores.append({
                'chunk': chunk_data,
                'score': normalize_similarity(raw_cosine),
            })

        chunk_scores.sort(key=lambda x: x['score'], reverse=True)

        min_score = 0.40
        top_k = 10
        top_k_candidates = chunk_scores[:top_k]
        filtered_candidates = [item for item in top_k_candidates if item['score'] >= min_score]

        seen_exact = set()
        top_chunks = []
        for item in filtered_candidates:
            chunk = item['chunk']
            chunk_key = (chunk.get('document_id'), chunk.get('text'))
            if chunk_key in seen_exact:
                continue
            seen_exact.add(chunk_key)
            top_chunks.append(item)

        if not top_chunks:
            return AskResponse(
                answer="I don't have enough information in the uploaded documents to answer this question.",
                sources=[],
                confidence="low",
                confidence_score=0.0,
            )

        context_parts = [
            f"--- Document: {item['chunk']['document_name']}\n{item['chunk']['text']}"
            for item in top_chunks
        ]
        context = "\n\n".join(context_parts)

        system_message = """You are a helpful AI assistant that answers questions based ONLY on the provided context.

IMPORTANT RULES:
1. Base your answer ONLY on the retrieved context. If multiple sources are present, consider all before answering.
2. When multiple documents are retrieved and the question asks for comparison, explicitly compare information from EACH document.
3. Do NOT assume missing information if context from both documents is present.
4. If both documents contain refund policy details, extract and compare both.
5. If a document truly has no relevant info, explicitly verify before stating it.
6. If the context doesn't contain enough information to answer the question, respond with: "I don't have enough information in the uploaded documents to answer this question."
7. Return STRICT JSON only, with this shape:
   {"answer": string, "sources": [{"documentName": string, "snippet": string}]}
8. Do not include markdown, code fences, or extra keys"""

        user_prompt = f"""Context from documents:

{context}

---

Question: {question}

Return JSON only."""

        default_headers = {}
        if OPENAI_APP_URL:
            default_headers["HTTP-Referer"] = OPENAI_APP_URL
        if OPENAI_APP_NAME:
            default_headers["X-Title"] = OPENAI_APP_NAME

        client = AsyncOpenAI(
            api_key=OPENAI_API_KEY,
            base_url=OPENAI_BASE_URL or None,
            default_headers=default_headers or None,
        )
        response = await client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.2,
        )

        llm_text = (response.choices[0].message.content or "").strip()
        llm_json = parse_llm_json(llm_text)
        if isinstance(llm_json, dict) and isinstance(llm_json.get("answer"), str):
            llm_response = llm_json["answer"].strip()
        else:
            llm_response = llm_text

        sources = []
        for item in top_chunks:
            chunk = item['chunk']
            snippet_text = chunk['text'][:200] + "..." if len(chunk['text']) > 200 else chunk['text']
            sources.append(
                Source(
                    document_id=chunk['document_id'],
                    document_name=chunk['document_name'],
                    snippet=snippet_text,
                    highlight=select_highlight_sentence(chunk['text'], question),
                    score=round(item['score'], 4),
                    chunk_index=chunk['chunk_index'],
                )
            )

        confidence_score = sum(item['score'] for item in top_chunks) / len(top_chunks)
        if confidence_score >= 0.52:
            confidence = "high"
        elif confidence_score >= 0.49:
            confidence = "medium"
        else:
            confidence = "low"

        return AskResponse(
            answer=llm_response,
            sources=sources,
            confidence=confidence,
            confidence_score=round(confidence_score, 4),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing question: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/health", response_model=HealthResponse)
async def health_check():
    try:
        await db.command('ping')
        db_status = "connected"
        docs_count = await db.documents.count_documents({})
        chunks_count = await db.chunks.count_documents({})
        llm_ok = await check_llm_connection()
        llm_status = "connected" if llm_ok else "disconnected"

        return HealthResponse(
            status="healthy" if llm_ok else "degraded",
            database=db_status,
            llm=llm_status,
            documents_count=docs_count,
            chunks_count=chunks_count,
        )
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail="Service unavailable")


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
    logger.info("Database connection closed")