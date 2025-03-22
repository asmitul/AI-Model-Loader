const path = require('path');

module.exports = {
  entry: './src/demo/demo.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: 'demo.js',
    path: path.resolve(__dirname, 'dist/demo'),
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'src/demo'),
    },
    compress: true,
    port: 9000,
  },
}; 