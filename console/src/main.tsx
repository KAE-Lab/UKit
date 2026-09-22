import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';

import { App } from './App';
import { Panne } from './composants/Panne';
import { clientDeRequetes } from './requetes/client';
import './styles/index.css';

const racine = document.getElementById('racine');
if (racine === null) throw new Error('index.html ne porte pas de #racine');
createRoot(racine).render(
    <StrictMode>
        <ErrorBoundary FallbackComponent={Panne}>
            <QueryClientProvider client={clientDeRequetes}>
                <App />
            </QueryClientProvider>
        </ErrorBoundary>
    </StrictMode>,
);
