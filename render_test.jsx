import React from 'react';
import { renderToString } from 'react-dom/server';
import App from './src/App.jsx';

try {
  renderToString(<App />);
  console.log("Rendered successfully");
} catch (err) {
  console.error("Render failed:", err);
}
