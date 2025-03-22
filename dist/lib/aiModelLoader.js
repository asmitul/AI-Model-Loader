"use strict";
/**
 * AI Model Loader
 * A lightweight module for lazy-loading AI models in web applications
 * with minimal impact on initial page load performance.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiModelLoader = exports.AIModelLoader = exports.ModelLoadingStatus = void 0;
/**
 * Model loading status enumeration
 */
var ModelLoadingStatus;
(function (ModelLoadingStatus) {
    ModelLoadingStatus["IDLE"] = "idle";
    ModelLoadingStatus["LOADING"] = "loading";
    ModelLoadingStatus["LOADED"] = "loaded";
    ModelLoadingStatus["ERROR"] = "error";
})(ModelLoadingStatus || (exports.ModelLoadingStatus = ModelLoadingStatus = {}));
/**
 * AI Model Loader class
 * Handles the lazy loading and caching of AI models
 */
class AIModelLoader {
    /**
     * Create a new AIModelLoader instance
     * @param options Configuration options
     */
    constructor(options = {}) {
        this.modelCache = new Map();
        this.isInitialized = false;
        this.loadingQueue = new Set();
        this.loadingPromises = new Map();
        this.maxCacheSize = options.maxCacheSize || 5;
        this.cacheTtl = options.cacheTtl || 30 * 60 * 1000; // Default: 30 minutes
    }
    /**
     * Initialize the model loader
     */
    async initialize() {
        if (this.isInitialized)
            return;
        // Add initialization logic here if needed
        // For example, setting up event listeners for network status
        this.isInitialized = true;
    }
    /**
     * Register a model with the loader
     * @param config The model configuration
     */
    registerModel(config) {
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
    getModelStatus(modelName) {
        const entry = this.modelCache.get(modelName);
        return entry ? entry.status : ModelLoadingStatus.IDLE;
    }
    /**
     * Lazy load a model on demand
     * @param modelName The name of the model to load
     * @param config Optional model configuration (if not previously registered)
     */
    async loadModel(modelName, config) {
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
            return entry.model;
        }
        // If already loading, return the existing promise
        if (entry.status === ModelLoadingStatus.LOADING && entry.loadPromise) {
            return entry.loadPromise;
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
            return model;
        }
        catch (error) {
            entry.status = ModelLoadingStatus.ERROR;
            console.error(`Failed to load model '${modelName}':`, error);
            throw error;
        }
        finally {
            entry.loadPromise = null;
        }
    }
    /**
     * Preload a model in the background
     * @param modelName The name of the model to preload
     */
    preloadModel(modelName) {
        const entry = this.modelCache.get(modelName);
        if (!entry || entry.status !== ModelLoadingStatus.IDLE)
            return;
        // Add to loading queue but don't await
        this.loadModel(modelName).catch(err => console.warn(`Preloading model '${modelName}' failed:`, err));
    }
    /**
     * Unload a model from memory
     * @param modelName The name of the model to unload
     */
    unloadModel(modelName) {
        const entry = this.modelCache.get(modelName);
        if (!entry || entry.status !== ModelLoadingStatus.LOADED)
            return;
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
    async ensureCacheSpace() {
        if (this.modelCache.size <= this.maxCacheSize)
            return;
        // Get sorted entries by last used time (oldest first)
        const entries = Array.from(this.modelCache.entries())
            .filter(([modelId, entry]) => entry.status === ModelLoadingStatus.LOADED)
            .sort(([idA, entryA], [idB, entryB]) => entryA.lastUsed - entryB.lastUsed);
        // Unload models until we're under the limit
        while (entries.length > 0 && this.modelCache.size > this.maxCacheSize) {
            const [modelName, unused] = entries.shift();
            this.unloadModel(modelName);
        }
    }
    /**
     * Clean up expired models based on TTL
     */
    cleanupExpiredModels() {
        const now = Date.now();
        for (const [modelName, entry] of this.modelCache.entries()) {
            if (entry.status === ModelLoadingStatus.LOADED &&
                now - entry.lastUsed > this.cacheTtl) {
                this.unloadModel(modelName);
            }
        }
    }
    /**
     * Dispose all models and clean up resources
     */
    dispose() {
        for (const [modelName, entry] of this.modelCache.entries()) {
            this.unloadModel(modelName);
        }
        this.modelCache.clear();
        this.isInitialized = false;
    }
}
exports.AIModelLoader = AIModelLoader;
// Export a singleton instance for convenient use
exports.aiModelLoader = new AIModelLoader();
