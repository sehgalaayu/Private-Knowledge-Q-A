# AI Implementation Notes

## RAG (Retrieval Augmented Generation) Architecture

### Overview

This application implements a simple but effective RAG system for document-based Q&A. The implementation prioritizes clarity and maintainability over complexity.

### Text Chunking Strategy

**Function**: `chunk_text()` in `backend/server.py`

```python
def chunk_text(text: str, chunk_size: int = 300, overlap: int = 50) -> List[str]:
    """
    Split text into chunks with overlap.
    
    - chunk_size: 300 words (balance between context and granularity)
    - overlap: 50 words (preserve context across boundaries)
    """
```

**Why 300 words?**
- Large enough to contain meaningful context
- Small enough for precise relevance matching
- Optimal for embedding model performance

**Why 50-word overlap?**
- Prevents important context from being split
- Improves retrieval accuracy at chunk boundaries
- Minimal storage overhead

### Embedding Generation

**Model**: OpenAI `text-embedding-3-small`

**Function**: `get_embedding()` in `backend/server.py`

```python
async def get_embedding(text: str) -> List[float]:
    """
    Generates 1536-dimensional embedding vectors.
    
    Current implementation uses hash-based demo embeddings.
    In production, replace with actual OpenAI API call:
    
    from openai import AsyncOpenAI
    client = AsyncOpenAI(api_key=EMERGENT_KEY)
    response = await client.embeddings.create(
        input=text,
        model="text-embedding-3-small"
    )
    return response.data[0].embedding
    """
```

**Why text-embedding-3-small?**
- Cost-effective ($0.02 per 1M tokens)
- Fast inference time
- High-quality embeddings for English text
- 1536 dimensions (good balance)

### Similarity Search

**Algorithm**: Cosine Similarity

**Function**: `cosine_similarity()` in `backend/server.py`

```python
def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """
    Cosine similarity formula:
    
    similarity = (A · B) / (||A|| * ||B||)
    
    Where:
    - A · B = dot product
    - ||A|| = magnitude of vector A
    - ||B|| = magnitude of vector B
    
    Returns value between -1 and 1:
    - 1 = identical direction
    - 0 = orthogonal (unrelated)
    - -1 = opposite direction
    """
```

**Why cosine similarity?**
- Direction matters more than magnitude for semantic similarity
- Normalized comparison (scale-independent)
- Fast to compute with NumPy
- Industry standard for text embeddings

**Alternative approaches considered:**
- Euclidean distance: Sensitive to magnitude, not ideal for embeddings
- Dot product: Not normalized, biased by vector length
- Jaccard similarity: Works on sets, not suitable for dense vectors

### Retrieval Strategy

**Top-K Selection**: K = 3

```python
# Sort by similarity and get top 3
chunk_scores.sort(key=lambda x: x['score'], reverse=True)
top_chunks = chunk_scores[:3]
```

**Why top 3?**
- Provides sufficient context without overwhelming the LLM
- Keeps token count manageable (~900 words max)
- Allows for diverse perspectives on the topic
- Balances precision vs. recall

### LLM Prompt Design

**Model**: GPT-4o (via emergentintegrations)

```python
system_message = """
You are a helpful AI assistant that answers questions based ONLY on the provided context.

IMPORTANT RULES:
1. Answer ONLY using information from the context provided
2. If the context doesn't contain enough information, say: "I don't have enough information..."
3. Be concise and accurate
4. Cite which source you're using when relevant
"""
```

**Why this prompt structure?**
- **Strict grounding**: Prevents hallucination
- **Fallback behavior**: Honest about limitations
- **Source attribution**: Builds trust
- **Conciseness**: Faster responses, lower cost

### Storage Schema

**MongoDB Collections:**

1. **documents**
```json
{
  "id": "uuid",
  "name": "document.txt",
  "text": "full text...",
  "upload_date": "2024-01-01T00:00:00Z",
  "chunk_count": 10
}
```

2. **chunks**
```json
{
  "id": "uuid",
  "document_id": "parent_uuid",
  "document_name": "document.txt",
  "text": "chunk text...",
  "embedding": [0.123, -0.456, ...],  // 1536 dims
  "chunk_index": 0
}
```

**Why MongoDB?**
- Schema flexibility for embeddings
- Good performance for document storage
- Easy to scale horizontally
- Native support for large arrays

**Note**: For production at scale, consider:
- **Pinecone**: Purpose-built vector database
- **Weaviate**: Open-source vector search
- **Milvus**: High-performance similarity search

### Performance Considerations

**Current Implementation:**
- All chunks loaded into memory for similarity search
- Linear scan through all embeddings
- Time complexity: O(n) where n = total chunks

**Acceptable for:**
- < 1,000 documents
- < 10,000 chunks
- Response time: < 2 seconds

**Optimization strategies for scale:**

1. **Vector Index** (e.g., FAISS)
   - Approximate nearest neighbors
   - Sub-linear search time
   - Trade accuracy for speed

2. **Batch Processing**
   - Pre-compute chunk similarities
   - Cache frequent queries
   - Async background jobs

3. **Hierarchical Retrieval**
   - Document-level filtering first
   - Then chunk-level search
   - Reduces search space

### Error Handling

**Key scenarios:**

1. **No documents uploaded**
   - Return helpful error message
   - Suggest uploading documents

2. **Empty question**
   - Validate input before processing
   - Return 400 error

3. **LLM API failure**
   - Catch exceptions
   - Log error details
   - Return 500 with user-friendly message

4. **Embedding generation failure**
   - Critical path failure
   - Abort upload/query
   - Clean up partial data

### Monitoring & Observability

**Metrics to track:**
- Average query latency
- Embedding generation time
- Top-K retrieval accuracy
- LLM token usage
- User satisfaction (thumbs up/down)

**Logs to capture:**
- Similarity scores for debugging
- Retrieved chunk indices
- Full prompts sent to LLM
- Error stack traces

### Future Improvements

1. **Hybrid Search**
   - Combine semantic (embeddings) + keyword (BM25)
   - Better for specific entity queries

2. **Re-ranking**
   - Use cross-encoder model
   - Re-score top-K candidates
   - Improved relevance

3. **Query Expansion**
   - Generate similar questions
   - Search with variations
   - Better recall

4. **Document Metadata**
   - Filter by date, author, type
   - Improve precision
   - Faster queries

5. **Streaming Responses**
   - Show answer as it's generated
   - Better UX for long answers
   - Lower perceived latency

## References

- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
- [RAG Paper (Lewis et al., 2020)](https://arxiv.org/abs/2005.11401)
- [Dense Passage Retrieval](https://arxiv.org/abs/2004.04906)