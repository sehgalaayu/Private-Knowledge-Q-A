# AI Implementation Notes

## RAG (Retrieval Augmented Generation) Architecture

### Overview

This application implements a simple but effective RAG system for document-based Q&A. The implementation prioritizes clarity and maintainability over complexity.

### Text Chunking Strategy

**Function**: `chunk_text()` in `backend/server.py`

```python
def chunk_text(text: str, chunk_size: int = 400, overlap: int = 100) -> List[str]:
   """
   Split text into chunks with overlap and section awareness.

   - chunk_size: 400 characters (tight semantic focus)
   - overlap: 100 characters (preserve boundary context)
   """
```

**Why 400 characters?**

- Reduces topic mixing inside a chunk
- Keeps retrieval precise while retaining enough context
- Easier to control overlap consistently

**Why 100-character overlap?**

- Prevents important context from being split
- Improves retrieval accuracy at chunk boundaries
- Minimal storage overhead

**Section-aware splitting**

- Chunking runs per detected section header (e.g., `# Header`, `SECTION:`)
- Avoids merging unrelated sections into the same chunk

### Embedding Generation

**Model**: OpenAI-compatible embeddings, default `text-embedding-3-small`

**Function**: `get_embedding()` in `backend/server.py`

```python
async def get_embedding(text: str) -> List[float]:
   """
   Generates embedding vectors using a consistent model for
   both documents and queries.
   """
```

**Why text-embedding-3-small?**

- Cost-effective and fast
- Strong quality for general English
- 1536 dimensions (good balance)

**Consistency requirement**

- Documents and queries must use the same embedding model
- The embedding base URL can be configured separately if the LLM provider
  does not support embeddings

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

**Why normalize to [0, 1]?**

- Raw cosine is in [-1, 1] which is less intuitive for thresholds and UI
- Normalized scores make filtering and confidence thresholds consistent

**Alternative approaches considered:**

- Euclidean distance: Sensitive to magnitude, not ideal for embeddings
- Dot product: Not normalized, biased by vector length
- Jaccard similarity: Works on sets, not suitable for dense vectors

### Retrieval Strategy

**Top-K Selection**: K = 10 (then filtered)

```python
# Sort by similarity, keep top 10, then filter by adaptive threshold
chunk_scores.sort(key=lambda x: x['score'], reverse=True)
top_k_candidates = chunk_scores[:10]
adaptive_floor = max(min_score, top_similarity - 0.15)
filtered = [c for c in top_k_candidates if c['score'] >= adaptive_floor]
```

**Why top 10 + adaptive floor?**

- Keeps enough candidates for comparison queries
- Adaptive floor reduces irrelevant chunks per query
- Preserves precision without manual tuning per document set

### LLM Prompt Design

**Model**: Configurable via `OPENAI_MODEL` (OpenAI-compatible API)

```python
system_message = """
You are a helpful AI assistant that answers questions based ONLY on the provided context.

IMPORTANT RULES:
1. Base your answer ONLY on the retrieved context. If multiple sources are present, consider all before answering.
2. When multiple documents are retrieved and the question asks for comparison, explicitly compare information from EACH document.
3. Do NOT assume missing information if context from both documents is present.
4. If both documents contain refund policy details, extract and compare both.
5. If a document truly has no relevant info, explicitly verify before stating it.
6. If the context doesn't contain enough information to answer the question, respond with: "I don't have enough information in the uploaded documents to answer this question."
7. Return STRICT JSON only, with this shape:
   {"answer": string, "sources": [{"documentName": string, "snippet": string}]}
8. Do not include markdown, code fences, or extra keys
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

### AI Assistance and Human Review

**AI-assisted**

- Drafting retrieval pipeline refactors (thresholding, top-k selection)
- Logging improvements and configuration scaffolding
- UI adjustments for source display and document deletion

**Manually reviewed and validated**

- Cosine similarity formula and normalization behavior
- Retrieval thresholds and confidence banding
- Chunking strategy decisions (size, overlap, section boundaries)
- API behavior for insufficient-context responses

### Known Limitations

1. **Linear scan over all chunks**
   - O(n) similarity checks; performance degrades with large corpora

2. **Threshold tuning is heuristic**
   - Precision/recall tradeoffs require ongoing calibration

3. **No offline evaluation harness**
   - Retrieval quality is not yet measured against labeled queries

4. **External dependency on embedding/LLM providers**
   - Availability and latency depend on third-party APIs

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
