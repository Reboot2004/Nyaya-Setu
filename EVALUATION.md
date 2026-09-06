# Nyaya-Setu Evaluation Framework (Fix #7)

## Overview

The evaluation framework measures the accuracy of Nyaya-Setu's complaint processing pipeline across multiple dimensions. This document describes the test dataset and evaluation methodology.

## Running Evaluations

```bash
# Install Node.js dependencies (if not already done)
npm install

# Run the evaluation suite
node tests/evaluate.js
```

## Test Dataset

**Location:** `tests/evaluation_dataset.json`

The dataset contains synthetic test cases covering:
- **6 base test complaints** in English, Hindi, and Telugu
- **Expected outcomes** for entity extraction, section retrieval, and filtering
- **Confidence levels** (high, medium, low) for statute matches

### Test Case Structure

```json
{
  "id": "TEST-001",
  "language": "en",
  "narrative": "...",
  "expected_entities": {
    "summary": "...",
    "aggressor": "...",
    "date": "...",
    "location": "...",
    "category": "..."
  },
  "expected_sections": ["BNS-117"],
  "should_accept": true,
  "confidence": "high"
}
```

## Evaluation Metrics

### 1. Entity Extraction Recall
- **Measures:** Accuracy of fact extraction (summary, aggressor, date, location, category)
- **Calculation:** Exact/fuzzy match on each field
- **Target:** >80% recall

### 2. Statute Retrieval Recall
- **Measures:** % of applicable statutes found in top results
- **Calculation:** Recall = (# correct sections found) / (# expected sections)
- **Target:** >70% recall on top-5 results

### 3. Filtering Accuracy
- **Measures:** Correctness of accept/reject decision on complainability
- **Calculation:** TP / (TP + FP + FN)
- **Target:** >85% accuracy

### 4. F1 Score
- **Measures:** Balanced precision/recall for statute retrieval
- **Calculation:** 2 * (recall * precision) / (recall + precision)
- **Target:** >0.75 F1

## Current Baseline (Prototype-0.5, REAL pipeline — `node tests/evaluate.js`)

Real calls to `extractEntitiesRuleBased()` + fused `retrieveFused()` (MiniLM semantic + lexical + dialect-phrase lexicon + fuzzy + rarity + dedupe) + `screenInput()` safety, 42 cases across all 8 UI languages:

- **Entity Extraction Recall:** 78.1% (rule regex + sanitizers; LLM WebGPU path not exercised in Node)
- **Statute Retrieval Recall:** 98.8% (41/42 full hits; TEST-006 finds 115 of [115, 351])
- **Filtering Accuracy:** 100.0% (42/42: offence scenarios incl. extortion/stalking/dowry/theft/forgery/bribery/kidnapping/cyber-fraud/hit-and-run/emergency, plus edge cases — civil disputes, advice-questions, self-harm routing, prompt-injection, junk, ALL-CAPS, long narratives, contradictions — correctly gated)
- **Origins:** most hits are `both` (semantic+lexical agree); vernacular-only hits stay `lexical`, which is why trigger lists are retained as the fallback spine.
- **Previous mocked baseline was 75-80% and is now deprecated.**

Run: `node tests/evaluate.js`. WebGPU LLM path not exercised in Node.

## Interpreting Results

### Entity Extraction Recall
- **>85%:** Excellent fact extraction
- **70-85%:** Good, may miss some edge cases
- **<70%:** Needs improvement; review missing fields (usually "date" and "location")

### Statute Retrieval Recall
- **>75%:** Strong keyword matching
- **50-75%:** Moderate; works for common offenses
- **<50%:** Weak corpus coverage; consider expanding BASE_STATUTES

### Filtering Accuracy
- **>90%:** Excellent gate-keeping
- **80-90%:** Good; prevents frivolous complaints
- **<80%:** Too permissive; review rejection thresholds in `isActionableComplaint()`

## Extending the Test Dataset

To add more test cases:

1. Add a new object to `test_cases` array in `evaluation_dataset.json`
2. Follow the existing structure with required fields
3. Ensure `expected_sections` contains valid BNS/BNSS section codes (e.g., "BNS-115")
4. Set `should_accept` to reflect complainability (legal merit)
5. Re-run `node tests/evaluate.js`

### Example Addition

```json
{
  "id": "TEST-007",
  "language": "hi",
  "narrative": "मेरे गांव के जमींदार ने मुझे जमीन से निकाल दिया और मेरे घर को तोड़ दिया।",
  "expected_entities": {
    "summary": "Unlawful eviction and property destruction",
    "aggressor": "landlord",
    "date": "unknown",
    "location": "village",
    "category": "property_crime"
  },
  "expected_sections": ["BNS-425"],
  "should_accept": true,
  "confidence": "medium"
}
```

## Limitations & Future Work

### Current Limitations
1. **Small corpus:** Only 14 statutes; many offenses unhandled
2. **Language scope:** Only En/Hi/Te tested; others have incomplete translations
3. **Lack of real data:** Test cases are synthetic; real complaints may behave differently
4. **No human review:** Accuracy not validated by legal experts

### Recommended Improvements
1. Expand test dataset to 50-100 real/anonymized complaints
2. Add cross-language evaluation (hi→en translation accuracy)
3. Conduct expert legal review of edge cases
4. Implement monthly metric tracking across app versions
5. Add per-statute accuracy breakdown
6. Test on mobile/low-bandwidth scenarios

## Performance Benchmarks

On prototype-0.3 (2026-09-01):
- **Entity extraction:** ~2-3ms per complaint (on-device)
- **Statute retrieval:** ~1-2ms for top-5
- **PDF generation:** ~10-15ms
- **Total pipeline:** ~100-150ms (including LLM inference when available)

## Known Issues & Next Steps

- [ ] Expand corpus to 50+ statutes (official India Code)
- [ ] Add real complaint feedback loop (NALSA partnership?)
- [ ] Implement monthly metric tracking dashboard
- [ ] Cross-validate with legal aid organizations
- [ ] Add per-language performance breakdown

## References

- **Corpus Source:** https://www.indiacode.nic.in/ (BNS/BNSS 2023)
- **Evaluation Methodology:** Adopted from NLP/ML classification metrics (precision, recall, F1)
- **Baseline Test Dataset:** Created 2026-09-01, version 1.0
