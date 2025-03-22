/**
 * AI Model Loader
 * A lightweight module for lazy-loading AI models in web applications
 * with minimal impact on initial page load performance.
 */

// Export the core model loader
export * from './aiModelLoader';

// Export the TensorFlow.js adapter
export * from './tfjsModelAdapter';

// Default export for convenience
import { aiModelLoader } from './aiModelLoader';
export default aiModelLoader; 