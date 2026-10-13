import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import Account from './redesign/Account';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {new URLSearchParams(window.location.search).get('preview') === 'redesign' ? <Account /> : <App />}
  </StrictMode>,
);
