# Prompts Used in Private Knowledge Q&A

This document contains all AI prompts used in the application for transparency and reproducibility.

## 1. RAG System Prompt

**Location**: `backend/server.py` → `ask_question()` function

**Model**: GPT-4o (via emergentintegrations)

**Purpose**: Instruct the LLM to answer questions based strictly on provided context.

### System Message

```
You are a helpful AI assistant that answers questions based ONLY on the provided context.

IMPORTANT RULES:
1. Answer ONLY using information from the context provided
2. If the context doesn't contain enough information to answer the question, respond with: "I don't have enough information in the uploaded documents to answer this question."
3. Be concise and accurate
4. Cite which source you're using when relevant
```

**Design Rationale:**

- **Strict grounding**: The phrase "based ONLY on the provided context" is emphasized to prevent hallucination
- **Explicit fallback**: Provides exact wording for when information is insufficient
- **Conciseness**: Encourages brief, focused answers
- **Attribution**: Asks for source citation to build user trust

### User Message Template

```
Context from documents:

[Source 1: {document_name_1}]
{chunk_text_1}

[Source 2: {document_name_2}]
{chunk_text_2}

[Source 3: {document_name_3}]
{chunk_text_3}

---

Question: {user_question}

Answer:
```

**Design Rationale:**

- **Clear separation**: Context and question are separated by `---`
- **Source labeling**: Each chunk is labeled with source number and document name
- **Explicit structure**: "Answer:" prompt encourages direct response

## 2. Example Interactions

### Example 1: Successful Retrieval

**Context:**
```
[Source 1: company_policy.txt]
Employees are entitled to 15 days of paid vacation per year. Vacation days must be requested at least 2 weeks in advance through the HR portal.

[Source 2: benefits_guide.txt]
In addition to vacation days, employees receive 10 sick days annually. Sick days do not require advance notice but must be reported within 24 hours.

[Source 3: company_policy.txt]
Remote work is allowed up to 2 days per week with manager approval. Employees must maintain regular communication during remote days.
```

**Question:** "How many vacation days do I get?"

**Expected Answer:** "According to the company policy, employees are entitled to 15 days of paid vacation per year. Vacation days must be requested at least 2 weeks in advance through the HR portal. (Source: company_policy.txt)"

### Example 2: Insufficient Information

**Context:**
```
[Source 1: product_specs.txt]
The device weighs 2.5 pounds and measures 10 inches diagonally. It has a battery life of up to 8 hours.

[Source 2: user_manual.txt]
To charge the device, connect the USB-C cable to the port on the right side. A full charge takes approximately 2 hours.

[Source 3: warranty_info.txt]
The device comes with a 1-year limited warranty covering manufacturing defects.
```

**Question:** "What colors is the device available in?"

**Expected Answer:** "I don't have enough information in the uploaded documents to answer this question about the available colors."

### Example 3: Multi-source Answer

**Context:**
```
[Source 1: sales_data_q1.txt]
Q1 revenue was $2.5M, representing a 15% increase from Q4 of the previous year.

[Source 2: sales_data_q2.txt]
Q2 revenue reached $2.8M, continuing the upward trend with strong performance in the enterprise segment.

[Source 3: annual_report.txt]
The company achieved total revenue of $10.2M for the fiscal year, with consistent quarter-over-quarter growth.
```

**Question:** "What was the revenue trend in the first half of the year?"

**Expected Answer:** "The revenue trend in the first half of the year showed consistent growth. Q1 revenue was $2.5M (a 15% increase from Q4 of the previous year), followed by Q2 revenue of $2.8M, continuing the upward trend with strong performance in the enterprise segment. (Sources: sales_data_q1.txt, sales_data_q2.txt)"

## 3. Prompt Engineering Principles Applied

### Principle 1: Clear Instructions
- Use imperative language: "Answer ONLY", "Be concise"
- Provide explicit rules rather than examples
- Specify exact fallback behavior

### Principle 2: Context Formatting
- Structured layout with clear delimiters
- Source attribution in every chunk
- Separation between context and question

### Principle 3: Temperature Settings

```python
# Default temperature for emergentintegrations
temperature = 0.7  # Balance between creativity and consistency
```

**Rationale:**
- Not 0.0: Allows some natural language variation
- Not 1.0: Maintains consistency and reduces hallucination
- 0.7: Sweet spot for factual Q&A tasks

### Principle 4: Token Limits

**Context tokens**: ~900 words × 1.3 tokens/word ≈ 1,170 tokens
**Question tokens**: ~50 tokens (average)
**System prompt tokens**: ~100 tokens
**Max output tokens**: ~500 tokens

**Total**: ~1,820 input + 500 output = 2,320 tokens per query

**Cost per query**: $0.0023 (GPT-4o pricing)

## 4. Prompt Versioning

### v1.0 (Current)
- Initial implementation
- Strict grounding rules
- Source attribution

### Future Iterations

**v1.1** (Planned):
- Add confidence scoring: "I'm highly/moderately confident..."
- Request bullet points for multi-part answers
- Add follow-up question suggestions

**v1.2** (Planned):
- Support for comparative questions
- Highlight contradictions in sources
- Summarization for long answers

## 5. Testing Prompts

Use these test questions to validate prompt behavior:

### Grounding Tests
1. "What is the capital of France?" (Should refuse if not in docs)
2. "Tell me about quantum physics" (Should refuse if not in docs)

### Retrieval Tests
1. "What does the document say about X?" (Should cite specific source)
2. "Summarize the main points" (Should synthesize from multiple chunks)

### Edge Cases
1. "" (Empty question - should be caught before LLM)
2. "asdfghjkl" (Nonsense - should return insufficient info)
3. Very long question (Should still work with truncation)

## 6. Prompt Monitoring

**Metrics to track:**
- % of "insufficient information" responses
- Average response length
- Source citation rate
- User satisfaction scores

**Red flags:**
- > 50% insufficient info responses → Poor document coverage or retrieval
- No source citations → Prompt not being followed
- Very short answers → Context not being used
- Very long answers → Lack of conciseness

## 7. Ethical Considerations

### Bias Mitigation
- Instruct to "be objective and balanced"
- Acknowledge uncertainty when sources conflict
- Avoid injecting personal opinions

### Safety
- Refuse to answer harmful queries (handled by OpenAI moderation)
- Don't generate sensitive PII not in documents
- Maintain context boundaries (no cross-session info leakage)

### Privacy
- All data stays in user's private database
- No logging of document contents to third parties
- LLM API calls are ephemeral (not stored by provider beyond moderation)

## References

- [OpenAI Prompt Engineering Guide](https://platform.openai.com/docs/guides/prompt-engineering)
- [Anthropic Constitutional AI](https://www.anthropic.com/index/constitutional-ai-harmlessness-from-ai-feedback)
- [Best Practices for RAG](https://www.pinecone.io/learn/retrieval-augmented-generation/)