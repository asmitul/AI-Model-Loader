/**
 * AI Model Loader Demo
 * Shows how to use the AI Model Loader with the Universal Sentence Encoder
 */

import * as tf from '@tensorflow/tfjs';
import * as use from '@tensorflow-models/universal-sentence-encoder';
import { aiModelLoader, ModelLoadingStatus } from '../lib/aiModelLoader';
import { registerTfjsModel, loadTfjsModel, unloadTfjsModel, clearTfjsMemory } from '../lib/tfjsModelAdapter';

// Constants
const MODEL_NAME = 'universal-sentence-encoder';
const DEFAULT_SENTENCES = ['Hello world', 'How are you today?'];
let useFallbackModel = false;
let fallbackModel: use.UniversalSentenceEncoder | null = null;

// DOM Elements
const loadModelBtn = document.getElementById('load-model') as HTMLButtonElement;
const preloadModelBtn = document.getElementById('preload-model') as HTMLButtonElement;
const unloadModelBtn = document.getElementById('unload-model') as HTMLButtonElement;
const encodeTextBtn = document.getElementById('encode-text') as HTMLButtonElement;
const modelStatusEl = document.getElementById('model-status') as HTMLDivElement;
const encodingResultEl = document.getElementById('encoding-result') as HTMLDivElement;
const inputTextEl = document.getElementById('input-text') as HTMLTextAreaElement;
const loadTimeEl = document.getElementById('load-time') as HTMLSpanElement;
const encodeTimeEl = document.getElementById('encode-time') as HTMLSpanElement;
const memoryUsageEl = document.getElementById('memory-usage') as HTMLSpanElement;

// Initialize the AI model loader
async function initialize() {
  await aiModelLoader.initialize();
  
  // Register the Universal Sentence Encoder model
  // Instead of using TF Hub directly, use the specialized adapter that handles model loading
  // This avoids CORS issues and other browser limitations
  registerModel();
  
  updateUI();
}

// Register the model using a more reliable approach
function registerModel() {
  // For demo purposes, we'll directly load the model using the @tensorflow-models/universal-sentence-encoder package
  // This handles all the complexity of finding the right model URL and loading it correctly
  registerTfjsModel({
    name: MODEL_NAME,
    // Using a known-working URL format that's compatible with browsers
    modelUrl: 'https://storage.googleapis.com/tfjs-models/savedmodel/universal_sentence_encoder/model.json',
    modelType: 'tfjs',
    modelFormat: 'graph',
    warmup: true,
    inputShape: [1]
  });
  
  console.log('Model registered');
}

// Load the model using the official package as a fallback
async function loadFallbackModel(): Promise<use.UniversalSentenceEncoder> {
  if (fallbackModel) {
    return fallbackModel;
  }
  
  console.log('Loading fallback model using @tensorflow-models/universal-sentence-encoder package');
  const model = await use.load();
  fallbackModel = model;
  return model;
}

// Update UI based on model status
function updateUI() {
  const status = useFallbackModel 
    ? (fallbackModel ? ModelLoadingStatus.LOADED : ModelLoadingStatus.IDLE)
    : aiModelLoader.getModelStatus(MODEL_NAME);
  
  modelStatusEl.textContent = `Status: ${status}${useFallbackModel ? ' (using fallback)' : ''}`;
  modelStatusEl.className = 'status';
  
  switch (status) {
    case ModelLoadingStatus.LOADING:
      modelStatusEl.classList.add('loading');
      loadModelBtn.disabled = true;
      preloadModelBtn.disabled = true;
      unloadModelBtn.disabled = true;
      encodeTextBtn.disabled = true;
      break;
      
    case ModelLoadingStatus.LOADED:
      modelStatusEl.classList.add('success');
      loadModelBtn.disabled = true;
      preloadModelBtn.disabled = true;
      unloadModelBtn.disabled = false;
      encodeTextBtn.disabled = false;
      break;
      
    case ModelLoadingStatus.ERROR:
      if (!useFallbackModel) {
        modelStatusEl.classList.add('error');
        loadModelBtn.disabled = false;
        preloadModelBtn.disabled = false;
        unloadModelBtn.disabled = true;
        encodeTextBtn.disabled = true;
      }
      break;
      
    case ModelLoadingStatus.IDLE:
    default:
      loadModelBtn.disabled = false;
      preloadModelBtn.disabled = false;
      unloadModelBtn.disabled = true;
      encodeTextBtn.disabled = true;
      break;
  }
}

// Load the model
async function loadModel() {
  try {
    modelStatusEl.textContent = 'Status: Loading model...';
    modelStatusEl.className = 'status loading';
    updateUI();
    
    const startTime = performance.now();
    
    // First try to load using our custom loader
    try {
      if (useFallbackModel) {
        // Use the fallback approach
        await loadFallbackModel();
      } else {
        // Use our custom loader
        await loadTfjsModel(MODEL_NAME);
      }
    } catch (initialError) {
      console.error('Initial loading attempt failed, trying fallback:', initialError);
      
      // If our custom loader fails, try the fallback approach
      useFallbackModel = true;
      await loadFallbackModel();
      
      console.log('Successfully loaded fallback model');
    }
    
    const endTime = performance.now();
    loadTimeEl.textContent = (endTime - startTime).toFixed(2);
    
    updateUI();
    updateMemoryUsage();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    modelStatusEl.textContent = `Status: Error - ${errorMessage}`;
    modelStatusEl.className = 'status error';
    console.error('Error loading model:', error);
  }
}

// Preload the model in the background
function preloadModel() {
  if (useFallbackModel) {
    // Use the fallback approach directly
    loadModel();
    return;
  }
  
  modelStatusEl.textContent = 'Status: Preloading model in background...';
  modelStatusEl.className = 'status loading';
  
  aiModelLoader.preloadModel(MODEL_NAME);
  
  const checkInterval = setInterval(() => {
    const status = aiModelLoader.getModelStatus(MODEL_NAME);
    updateUI();
    
    if (status === ModelLoadingStatus.LOADED || status === ModelLoadingStatus.ERROR) {
      clearInterval(checkInterval);
      updateMemoryUsage();
      
      // If preloading failed, we'll try the fallback next time
      if (status === ModelLoadingStatus.ERROR) {
        useFallbackModel = true;
      }
    }
  }, 500);
}

// Unload the model
function unloadModel() {
  try {
    if (useFallbackModel && fallbackModel) {
      // For the fallback model, just set it to null and let garbage collection handle it
      fallbackModel = null;
    } else {
      // For our custom loader
      unloadTfjsModel(MODEL_NAME);
      clearTfjsMemory();
    }
    
    loadTimeEl.textContent = '-';
    encodeTimeEl.textContent = '-';
    encodingResultEl.textContent = 'No results yet';
    
    updateUI();
    updateMemoryUsage();
  } catch (error: unknown) {
    console.error('Error unloading model:', error);
  }
}

// Encode text using the model
async function encodeText() {
  try {
    const text = inputTextEl.value.trim() || DEFAULT_SENTENCES.join('\n');
    const sentences = text.split(/\n+/).filter(s => s.trim());
    
    if (sentences.length === 0) {
      alert('Please enter some text to encode.');
      return;
    }
    
    encodingResultEl.textContent = 'Encoding...';
    
    const startTime = performance.now();
    let embeddings;
    
    if (useFallbackModel) {
      // Use the fallback model
      const model = await loadFallbackModel();
      embeddings = await model.embed(sentences);
    } else {
      // Use our custom model
      const model = await loadTfjsModel<any>(MODEL_NAME);
      
      // For this model, we need to convert the input to tensors
      const inputs = tf.tensor2d(
        sentences.map(sentence => [sentence]), 
        [sentences.length, 1]
      );
      
      // Execute the model
      embeddings = await model.executeAsync(inputs);
      
      // Clean up input tensor
      inputs.dispose();
    }
    
    const endTime = performance.now();
    encodeTimeEl.textContent = (endTime - startTime).toFixed(2);
    
    // Get the embedding data
    const data = await embeddings.array();
    
    // Clean up embeddings tensor
    embeddings.dispose();
    
    // Format and display results
    const result = {
      sentences,
      embeddingShape: data.length > 0 ? `[${data.length}, ${data[0].length}]` : '[]',
      // Just show a sample of the embedding for the first sentence
      sample: data.length > 0 ? data[0].slice(0, 5).map((n: number) => n.toFixed(4)) : []
    };
    
    encodingResultEl.textContent = JSON.stringify(result, null, 2);
    updateMemoryUsage();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    encodingResultEl.textContent = `Error: ${errorMessage}`;
    console.error('Error encoding text:', error);
  }
}

// Update memory usage information
function updateMemoryUsage() {
  const memory = tf.memory();
  if (memory) {
    memoryUsageEl.textContent = `Tensors: ${memory.numTensors}, Bytes: ${formatBytes(memory.numBytes)}`;
  } else {
    memoryUsageEl.textContent = 'Not available';
  }
}

// Format bytes to human-readable format
function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

// Event listeners
loadModelBtn.addEventListener('click', loadModel);
preloadModelBtn.addEventListener('click', preloadModel);
unloadModelBtn.addEventListener('click', unloadModel);
encodeTextBtn.addEventListener('click', encodeText);

// Initialize the demo
initialize().catch(console.error); 