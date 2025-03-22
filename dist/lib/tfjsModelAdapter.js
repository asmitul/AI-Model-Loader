"use strict";
/**
 * TensorFlow.js Model Adapter
 * Helper utilities for loading and managing TensorFlow.js models
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTfjsModel = registerTfjsModel;
exports.ensureTfBackend = ensureTfBackend;
exports.loadTfjsModel = loadTfjsModel;
exports.unloadTfjsModel = unloadTfjsModel;
exports.clearTfjsMemory = clearTfjsMemory;
const tf = __importStar(require("@tensorflow/tfjs"));
const aiModelLoader_1 = require("./aiModelLoader");
/**
 * Register a TensorFlow.js model with the loader
 * @param config TensorFlow.js model configuration
 */
function registerTfjsModel(config) {
    const fullConfig = {
        ...config,
        modelType: 'tfjs',
        loadModel: async () => {
            try {
                // Ensure TensorFlow.js is initialized
                await ensureTfBackend();
                console.log(`Loading model from URL: ${config.modelUrl}`);
                // Load the model based on format
                let model;
                if (config.modelFormat === 'layers' || !config.modelFormat) {
                    model = await tf.loadLayersModel(config.modelUrl);
                }
                else if (config.modelFormat === 'graph') {
                    model = await tf.loadGraphModel(config.modelUrl);
                }
                else {
                    throw new Error(`Unsupported model format: ${config.modelFormat}`);
                }
                // Optional: Warm up the model with a dummy prediction if specified
                if (config.warmup && config.inputShape) {
                    const dummyInput = tf.zeros(config.inputShape);
                    // For layers model
                    if ('predict' in model) {
                        model.predict(dummyInput);
                    }
                    // For graph model
                    else if ('execute' in model) {
                        model.execute(dummyInput);
                    }
                    dummyInput.dispose();
                }
                return model;
            }
            catch (error) {
                console.error('Failed to load TensorFlow.js model:', error);
                // Provide more detailed error information
                if (error instanceof Error) {
                    // Check for common error patterns
                    if (error.message.includes('fetch')) {
                        throw new Error(`Network error loading model from ${config.modelUrl}. Check your internet connection and CORS settings.`);
                    }
                    else if (error.message.includes('JSON')) {
                        throw new Error(`Invalid model format or corrupt model file at ${config.modelUrl}. The file might not be a valid TensorFlow.js model.`);
                    }
                    else if (error.message.includes('undefined is not an object') || error.message.includes('null')) {
                        throw new Error(`Model structure error. The model at ${config.modelUrl} may be incompatible with the current TensorFlow.js version.`);
                    }
                }
                // If we can't provide a more specific error, rethrow the original
                throw error;
            }
        }
    };
    aiModelLoader_1.aiModelLoader.registerModel(fullConfig);
}
/**
 * Ensure TensorFlow.js backend is initialized
 */
async function ensureTfBackend() {
    if (tf.getBackend()) {
        return tf.getBackend();
    }
    console.log('Initializing TensorFlow.js backend...');
    // Try WebGL first for better performance
    try {
        await tf.setBackend('webgl');
        await tf.ready();
        console.log('Using WebGL backend');
        return 'webgl';
    }
    catch (e) {
        console.warn('WebGL backend failed to initialize, falling back to CPU', e);
        // Fall back to CPU
        try {
            await tf.setBackend('cpu');
            await tf.ready();
            console.log('Using CPU backend');
            return 'cpu';
        }
        catch (err) {
            console.error('Failed to initialize TensorFlow.js backend', err);
            throw new Error('Could not initialize TensorFlow.js backend. Check browser compatibility.');
        }
    }
}
/**
 * Load a TensorFlow.js model with progress tracking
 * @param modelName The name of the registered model
 * @param progressCallback Optional callback for loading progress
 */
async function loadTfjsModel(modelName, progressCallback) {
    // Check if the model is registered
    const status = aiModelLoader_1.aiModelLoader.getModelStatus(modelName);
    if (status === aiModelLoader_1.ModelLoadingStatus.IDLE) {
        // If we're using progress tracking, need to set up interceptors
        if (progressCallback) {
            // This requires a custom HTTP implementation which is beyond the scope
            // But in a real implementation, you'd intercept fetch requests here
            console.warn('Progress tracking not implemented in this example');
        }
    }
    try {
        return await aiModelLoader_1.aiModelLoader.loadModel(modelName);
    }
    catch (error) {
        console.error(`Error loading TensorFlow.js model '${modelName}':`, error);
        // Add additional context
        throw new Error(`Failed to load model '${modelName}': ${error instanceof Error ? error.message : String(error)}`);
    }
}
/**
 * Unload and dispose a TensorFlow.js model properly
 * @param modelName The name of the model to unload
 */
function unloadTfjsModel(modelName) {
    try {
        const model = aiModelLoader_1.aiModelLoader.loadModel(modelName);
        // First dispose the model properly to free GPU memory
        if (model && typeof model === 'object' && 'dispose' in model) {
            model.dispose();
        }
        // Then unload from our cache
        aiModelLoader_1.aiModelLoader.unloadModel(modelName);
    }
    catch (error) {
        console.error(`Error unloading model '${modelName}':`, error);
    }
}
/**
 * Helper to clear TensorFlow.js memory
 */
function clearTfjsMemory() {
    // Clear unused tensors
    tf.tidy(() => { });
    // Dispose all variables
    tf.disposeVariables();
}
