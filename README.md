# AI Model Loader

A lightweight JavaScript/TypeScript module for efficiently lazy-loading AI models in web applications with minimal impact on initial page load performance.

## Features

- **Lazy Loading**: Load AI models only when needed, reducing initial page load time
- **Caching**: Intelligent model caching with TTL and LRU eviction strategies
- **Memory Management**: Automatically manages model memory usage
- **Framework Agnostic**: Core module works with any AI model format
- **TensorFlow.js Support**: Built-in adapter for TensorFlow.js models
- **TypeScript Support**: Full TypeScript definitions

## Installation

```bash
npm install ai-model-loader
```

## Quick Start

```javascript
import { aiModelLoader, registerTfjsModel, loadTfjsModel } from 'ai-model-loader';

// Initialize the loader
await aiModelLoader.initialize();

// Register a TensorFlow.js model
registerTfjsModel({
  name: 'my-model',
  modelUrl: 'https://path/to/your/model.json',
  modelType: 'tfjs',
  modelFormat: 'layers',
  warmup: true,
  inputShape: [1, 224, 224, 3]
});

// Load the model when needed (e.g., in response to a user action)
document.getElementById('analyze-button').addEventListener('click', async () => {
  // Lazy load the model
  const model = await loadTfjsModel('my-model');
  
  // Use the model
  const result = model.predict(input);
  
  // Display results
  console.log(result);
});
```

## Advanced Usage

### Custom Model Types

You can integrate any model format by implementing the `loadModel` function:

```typescript
import { aiModelLoader, AIModelConfig } from 'ai-model-loader';

// Register a custom model
aiModelLoader.registerModel({
  name: 'custom-model',
  modelType: 'custom',
  loadModel: async () => {
    // Load your custom model here
    const model = await yourCustomLoader.load('model-path');
    return model;
  }
});

// Later, load the model
const model = await aiModelLoader.loadModel('custom-model');
```

### Preloading Models

You can preload models in the background:

```typescript
// Preload the model in the background
aiModelLoader.preloadModel('my-model');

// You can check the loading status
const status = aiModelLoader.getModelStatus('my-model');
```

### Memory Management

The module includes tools for memory management:

```typescript
// Unload a model when no longer needed
aiModelLoader.unloadModel('my-model');

// Clear up expired models based on TTL
aiModelLoader.cleanupExpiredModels();

// For TensorFlow.js models specifically
import { unloadTfjsModel, clearTfjsMemory } from 'ai-model-loader';

// Properly dispose TensorFlow.js models
unloadTfjsModel('my-tfjs-model');

// Clear TensorFlow.js memory
clearTfjsMemory();
```

## Configuration Options

You can customize the loader with various options:

```typescript
import { AIModelLoader } from 'ai-model-loader';

// Create a custom instance with options
const customLoader = new AIModelLoader({
  maxCacheSize: 3,     // Maximum number of models to keep in memory
  cacheTtl: 60 * 1000, // Time-to-live in milliseconds (1 minute)
});

// Use the custom loader
customLoader.initialize();
```

## Demo

The repository includes a demo showing how to use the Universal Sentence Encoder model.

To run the demo:

```bash
npm install
npm start
```

## Browser Compatibility

This module works in all modern browsers that support ES6 and Web Workers:
- Chrome
- Firefox
- Safari
- Edge

## License

MIT 