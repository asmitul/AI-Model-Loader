/**
 * AI Model Loader
 * A lightweight module for lazy-loading AI models in web applications
 * with minimal impact on initial page load performance.
 */
export * from './aiModelLoader';
export * from './tfjsModelAdapter';
import { aiModelLoader } from './aiModelLoader';
export default aiModelLoader;
