/**
 * CV-Screening Module Configuration
 * Centralized constants for the entire module
 */

export const CV_SCREENING_CONFIG = {
   // Retry configuration
   RETRY: {
      MAX_ATTEMPTS: 3,
      BASE_DELAY_MS: 1000,
      MAX_DELAY_MS: 10000,
   },
   
   // Circuit breaker configuration
   CIRCUIT_BREAKER: {
      FAILURE_THRESHOLD: 5,
      SUCCESS_THRESHOLD: 2,
      TIMEOUT_MS: 30000,
      RESET_TIMEOUT_MS: 60000,
   },
   
   // Text processing
   TEXT: {
      MAX_CHARACTERS: 8000,
      TRUNCATE_LIMIT: 8000,
   },
   
   // Model configuration
   MODELS: {
      EMBEDDING_DEFAULT: 'gemini-embedding-001',
      EMBEDDING_DIMENSIONS: 768,
   },
   
   // Timing
   TIMEOUTS: {
      EMBEDDING_MS: 30000,
      NLP_PROCESSING_MS: 60000,
      SUMMARY_GENERATION_MS: 120000,
   },
   
   // Chunking
   CHUNKING: {
      MAX_CHUNK_SIZE: 2000,
      OVERLAP_SIZE: 200,
      MIN_CHUNK_SIZE: 500,
   },
   
   // LLM Configuration
   LLM: {
      MAX_OUTPUT_TOKENS: 4096,
      STRUCTURED_OUTPUT_TEMPERATURE: 0.3,
      SUMMARY_TEMPERATURE: 0.6,
      TOP_K: 40,
      TOP_P: 0.95,
   },
   
   // File validation
   FILE: {
      MAX_SIZE_MB: 50,
      MIN_TEXT_LENGTH: 10,
   },
   
   // Queue configuration
   QUEUE: {
      CV_PROCESSING_CONCURRENCY: 2,
      SIMILARITY_CONCURRENCY: 3,
      SUMMARY_CONCURRENCY: 2,
   },
} as const;

