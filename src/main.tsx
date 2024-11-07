import { createRoot } from 'react-dom/client'
import {App} from './App.tsx'
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css'
import { ConvexProvider, ConvexReactClient } from 'convex/react';

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

createRoot(document.getElementById('root')!).render(
  <ConvexProvider client={convex}>
      <App />
  </ConvexProvider>
)