// React & 3rd-party
import React from 'react';
import ReactDOM from 'react-dom/client';

// UI Components
import App from './App';
import { StatePreviewProvider } from '../../components/ui/StatePreview';

// Utilities & Helpers
import { initializeTheme } from '../../theme/client';


void initializeTheme();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StatePreviewProvider><App /></StatePreviewProvider>
  </React.StrictMode>
);
