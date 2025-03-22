/**
 * TensorFlow.js Model Adapter
 * Helper utilities for loading and managing TensorFlow.js models
 */
import * as tf from '@tensorflow/tfjs';
import { AIModelConfig } from './aiModelLoader';
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
export declare function registerTfjsModel(config: Omit<TfjsModelConfig, 'loadModel'>): void;
/**
 * Ensure TensorFlow.js backend is initialized
 */
export declare function ensureTfBackend(): Promise<string>;
/**
 * Load a TensorFlow.js model with progress tracking
 * @param modelName The name of the registered model
 * @param progressCallback Optional callback for loading progress
 */
export declare function loadTfjsModel<T extends tf.LayersModel | tf.GraphModel>(modelName: string, progressCallback?: (progress: number) => void): Promise<T>;
/**
 * Unload and dispose a TensorFlow.js model properly
 * @param modelName The name of the model to unload
 */
export declare function unloadTfjsModel(modelName: string): void;
/**
 * Helper to clear TensorFlow.js memory
 */
export declare function clearTfjsMemory(): void;
