import React from 'react';
import { createRoot} from 'react-dom/client';
import App from '../../frontend/App.jsx';

const container = document.createElement('div');
container.id = 'pesu-max-root';
document.body.appendChild(container);
const root = createRoot(container);  
root.render(<App />);