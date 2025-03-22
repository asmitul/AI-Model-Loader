/**
 * TensorFlow.js Model Adapter
 * Helper utilities for loading and managing TensorFlow.js models
 */

import * as tf from '@tensorflow/tfjs';
import { AIModelConfig, ModelLoadingStatus, aiModelLoader } from './aiModelLoader';

/**
 * TensorFlow.js model specific configuration
 */
export interface TfjsModelConfig extends AIModelConfig {
  modelType: 'tfjs';
  modelUrl: string;
  modelFormat?: 'graph' | 'layers' | 'tfhub';
  inputShape?: number[];
  warmup?: boolean;
}

/**
 * Register a TensorFlow.js model with the loader
 * @param config TensorFlow.js model configuration
 */
export function registerTfjsModel(config: Omit<TfjsModelConfig, 'loadModel'>): void {
  const fullConfig: TfjsModelConfig = {
    ...config,
    modelType: 'tfjs',
    loadModel: async () => {
      try {
        // Ensure TensorFlow.js is initialized
        await ensureTfBackend();
        console.log(`Loading model from URL: ${config.modelUrl}`);
        
        // Load the model based on format
        let model: tf.LayersModel | tf.GraphModel;
        
        if (config.modelFormat === 'layers' || !config.modelFormat) {
          model = await tf.loadLayersModel(config.modelUrl);
        } else if (config.modelFormat === 'graph') {
          model = await tf.loadGraphModel(config.modelUrl);
        } else {
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
            (model as tf.GraphModel).execute(dummyInput);
          }
          dummyInput.dispose();
        }
        
        return model;
      } catch (error) {
        console.error('Failed to load TensorFlow.js model:', error);
        // Provide more detailed error information
        if (error instanceof Error) {
          // Check for common error patterns
          if (error.message.includes('fetch')) {
            throw new Error(`Network error loading model from ${config.modelUrl}. Check your internet connection and CORS settings.`);
          } else if (error.message.includes('JSON')) {
            throw new Error(`Invalid model format or corrupt model file at ${config.modelUrl}. The file might not be a valid TensorFlow.js model.`);
          } else if (error.message.includes('undefined is not an object') || error.message.includes('null')) {
            throw new Error(`Model structure error. The model at ${config.modelUrl} may be incompatible with the current TensorFlow.js version.`);
          }
        }
        // If we can't provide a more specific error, rethrow the original
        throw error;
      }
    }
  };
  
  aiModelLoader.registerModel(fullConfig);
}

/**
 * Ensure TensorFlow.js backend is initialized
 */
export async function ensureTfBackend(): Promise<string> {
  if (tf.getBackend()) {
    return tf.getBackend()!;
  }
  
  console.log('Initializing TensorFlow.js backend...');
  
  // Try WebGL first for better performance
  try {
    await tf.setBackend('webgl');
    await tf.ready();
    console.log('Using WebGL backend');
    return 'webgl';
  } catch (e) {
    console.warn('WebGL backend failed to initialize, falling back to CPU', e);
    
    // Fall back to CPU
    try {
      await tf.setBackend('cpu');
      await tf.ready();
      console.log('Using CPU backend');
      return 'cpu';
    } catch (err) {
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
export async function loadTfjsModel<T extends tf.LayersModel | tf.GraphModel>(
  modelName: string,
  progressCallback?: (progress: number) => void
): Promise<T> {
  // Check if the model is registered
  const status = aiModelLoader.getModelStatus(modelName);
  
  if (status === ModelLoadingStatus.IDLE) {
    // If we're using progress tracking, need to set up interceptors
    if (progressCallback) {
      // This requires a custom HTTP implementation which is beyond the scope
      // But in a real implementation, you'd intercept fetch requests here
      console.warn('Progress tracking not implemented in this example');
    }
  }
  
  try {
    return await aiModelLoader.loadModel<T>(modelName);
  } catch (error) {
    console.error(`Error loading TensorFlow.js model '${modelName}':`, error);
    // Add additional context
    throw new Error(`Failed to load model '${modelName}': ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Unload and dispose a TensorFlow.js model properly
 * @param modelName The name of the model to unload
 */
export function unloadTfjsModel(modelName: string): void {
  try {
    const model = aiModelLoader.loadModel(modelName);
    
    // First dispose the model properly to free GPU memory
    if (model && typeof model === 'object' && 'dispose' in model) {
      (model as any).dispose();
    }
    
    // Then unload from our cache
    aiModelLoader.unloadModel(modelName);
  } catch (error) {
    console.error(`Error unloading model '${modelName}':`, error);
  }
}

/**
 * Helper to clear TensorFlow.js memory
 */
export function clearTfjsMemory(): void {
  // Clear unused tensors
  tf.tidy(() => {});
  // Dispose all variables
  tf.disposeVariables();
} 