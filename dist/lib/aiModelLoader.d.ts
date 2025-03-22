/**
 * AI Model Loader
 * A lightweight module for lazy-loading AI models in web applications
 * with minimal impact on initial page load performance.
 */
/**
 * Model loading status enumeration
 */
export declare enum ModelLoadingStatus {
    IDLE = "idle",
    LOADING = "loading",
    LOADED = "loaded",
    ERROR = "error"
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
 * AI Model Loader class
 * Handles the lazy loading and caching of AI models
 */
export declare class AIModelLoader {
    private modelCache;
    private maxCacheSize;
    private cacheTtl;
    private isInitialized;
    private loadingQueue;
    private loadingPromises;
    /**
     * Create a new AIModelLoader instance
     * @param options Configuration options
     */
    constructor(options?: {
        maxCacheSize?: number;
        cacheTtl?: number;
    });
    /**
     * Initialize the model loader
     */
    initialize(): Promise<void>;
    /**
     * Register a model with the loader
     * @param config The model configuration
     */
    registerModel(config: AIModelConfig): void;
    /**
     * Get the loading status of a model
     * @param modelName The name of the model
     */
    getModelStatus(modelName: string): ModelLoadingStatus;
    /**
     * Lazy load a model on demand
     * @param modelName The name of the model to load
     * @param config Optional model configuration (if not previously registered)
     */
    loadModel<T = any>(modelName: string, config?: AIModelConfig): Promise<T>;
    /**
     * Preload a model in the background
     * @param modelName The name of the model to preload
     */
    preloadModel(modelName: string): void;
    /**
     * Unload a model from memory
     * @param modelName The name of the model to unload
     */
    unloadModel(modelName: string): void;
    /**
     * Ensures there's enough space in the cache for a new model
     * by removing least recently used models if necessary
     */
    private ensureCacheSpace;
    /**
     * Clean up expired models based on TTL
     */
    cleanupExpiredModels(): void;
    /**
     * Dispose all models and clean up resources
     */
    dispose(): void;
}
export declare const aiModelLoader: AIModelLoader;
