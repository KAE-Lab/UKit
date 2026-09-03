import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import './styles.css';

const racine = document.getElementById('racine');
if (racine === null) throw new Error('index.html ne porte pas de #racine');
createRoot(racine).render(<StrictMode><App /></StrictMode>);
