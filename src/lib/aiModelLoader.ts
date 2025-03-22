/**
 * AI Model Loader
 * A lightweight module for lazy-loading AI models in web applications
 * with minimal impact on initial page load performance.
 */

/**
 * Model loading status enumeration
 */
export enum ModelLoadingStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  LOADED = 'loaded',
  ERROR = 'error'
}

/**
 * AI Model configuration interface
 */
export interface AIModelConfig {
  name: string;
  modelUrl?: string;
  modelType: 'tfjs' | 'onnx' | 'custom';
  loadModel: () => Promise<any>;
  initOptions?: Record<string, any>;
}

/**
 * Model cache storage
 */
interface ModelCacheEntry {
  model: any;
  status: ModelLoadingStatus;
  lastUsed: number;
  loadPromise: Promise<any> | null;
  config: AIModelConfig;
}

/**
 * AI Model Loader class
 * Handles the lazy loading and caching of AI models
 */
export class AIModelLoader {
  private modelCache: Map<string, ModelCacheEntry> = new Map();
  private maxCacheSize: number;
  private cacheTtl: number; // Time-to-live in milliseconds
  private isInitialized: boolean = false;
  private loadingQueue: Set<string> = new Set();
  private loadingPromises: Map<string, Promise<any>> = new Map();

  /**
   * Create a new AIModelLoader instance
   * @param options Configuration options
   */
  constructor(options: {
    maxCacheSize?: number;
    cacheTtl?: number; // in milliseconds
  } = {}) {
    this.maxCacheSize = options.maxCacheSize || 5;
    this.cacheTtl = options.cacheTtl || 30 * 60 * 1000; // Default: 30 minutes
  }

  /**
   * Initialize the model loader
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Add initialization logic here if needed
    // For example, setting up event listeners for network status

    this.isInitialized = true;
  }

  /**
   * Register a model with the loader
   * @param config The model configuration
   */
  public registerModel(config: AIModelConfig): void {
    if (this.modelCache.has(config.name)) {
      console.warn(`Model '${config.name}' is already registered.`);
      return;
    }

    this.modelCache.set(config.name, {
      model: null,
      status: ModelLoadingStatus.IDLE,
      lastUsed: Date.now(),
      loadPromise: null,
      config: config
    });
  }

  /**
   * Get the loading status of a model
   * @param modelName The name of the model
   */
  public getModelStatus(modelName: string): ModelLoadingStatus {
    const entry = this.modelCache.get(modelName);
    return entry ? entry.status : ModelLoadingStatus.IDLE;
  }

  /**
   * Lazy load a model on demand
   * @param modelName The name of the model to load
   * @param config Optional model configuration (if not previously registered)
   */
  public async loadModel<T = any>(
    modelName: string, 
    config?: AIModelConfig
  ): Promise<T> {
    // If this is a new model, register it first
    if (!this.modelCache.has(modelName) && config) {
      this.registerModel(config);
    }

    const entry = this.modelCache.get(modelName);
    if (!entry) {
      throw new Error(`Model '${modelName}' is not registered.`);
    }

    // Update last used timestamp
    entry.lastUsed = Date.now();

    // Return cached model if available
    if (entry.model && entry.status === ModelLoadingStatus.LOADED) {
      return entry.model as T;
    }

    // If already loading, return the existing promise
    if (entry.status === ModelLoadingStatus.LOADING && entry.loadPromise) {
      return entry.loadPromise as Promise<T>;
    }

    // Start loading the model
    entry.status = ModelLoadingStatus.LOADING;
    
    try {
      // Manage model loading cache size
      await this.ensureCacheSpace();
      
      // Create loading promise - use the stored config if no new config is provided
      const modelConfig = config || entry.config;
      if (!modelConfig || typeof modelConfig.loadModel !== 'function') {
        throw new Error(`No valid load function found for model '${modelName}'`);
      }
      
      entry.loadPromise = modelConfig.loadModel();
      
      // Wait for the model to load
      const model = await entry.loadPromise;
      
      // Update cache
      entry.model = model;
      entry.status = ModelLoadingStatus.LOADED;
      
      return model as T;
    } catch (error) {
      entry.status = ModelLoadingStatus.ERROR;
      console.error(`Failed to load model '${modelName}':`, error);
      throw error;
    } finally {
      entry.loadPromise = null;
    }
  }

  /**
   * Preload a model in the background
   * @param modelName The name of the model to preload
   */
  public preloadModel(modelName: string): void {
    const entry = this.modelCache.get(modelName);
    if (!entry || entry.status !== ModelLoadingStatus.IDLE) return;
    
    // Add to loading queue but don't await
    this.loadModel(modelName).catch(err => 
      console.warn(`Preloading model '${modelName}' failed:`, err)
    );
  }

  /**
   * Unload a model from memory
   * @param modelName The name of the model to unload
   */
  public unloadModel(modelName: string): void {
    const entry = this.modelCache.get(modelName);
    if (!entry || entry.status !== ModelLoadingStatus.LOADED) return;

    // Perform model cleanup if needed
    // This is model-specific and may involve calling dispose() methods
    
    // Update cache
    entry.model = null;
    entry.status = ModelLoadingStatus.IDLE;
  }

  /**
   * Ensures there's enough space in the cache for a new model
   * by removing least recently used models if necessary
   */
  private async ensureCacheSpace(): Promise<void> {
    if (this.modelCache.size <= this.maxCacheSize) return;

    // Get sorted entries by last used time (oldest first)
    const entries = Array.from(this.modelCache.entries())
      .filter(([modelId, entry]) => entry.status === ModelLoadingStatus.LOADED)
      .sort(([idA, entryA], [idB, entryB]) => entryA.lastUsed - entryB.lastUsed);

    // Unload models until we're under the limit
    while (entries.length > 0 && this.modelCache.size > this.maxCacheSize) {
      const [modelName, unused] = entries.shift()!;
      this.unloadModel(modelName);
    }
  }

  /**
   * Clean up expired models based on TTL
   */
  public cleanupExpiredModels(): void {
    const now = Date.now();
    for (const [modelName, entry] of this.modelCache.entries()) {
      if (
        entry.status === ModelLoadingStatus.LOADED &&
        now - entry.lastUsed > this.cacheTtl
      ) {
        this.unloadModel(modelName);
      }
    }
  }

  /**
   * Dispose all models and clean up resources
   */
  public dispose(): void {
    for (const [modelName, entry] of this.modelCache.entries()) {
      this.unloadModel(modelName);
    }
    this.modelCache.clear();
    this.isInitialized = false;
  }
}

// Export a singleton instance for convenient use
export const aiModelLoader = new AIModelLoader(); 