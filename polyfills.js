import { Buffer } from 'buffer';

if (typeof window !== 'undefined') {
  window.global = window.global ?? window;
  window.Buffer = window.Buffer ?? Buffer;

  // More robust process polyfill
  if (!window.process) {
    window.process = { env: {} };
  }

  // Ensure process.env exists
  if (!window.process.env) {
    window.process.env = {};
  }
}

export { };