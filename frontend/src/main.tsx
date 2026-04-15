import ReactDOM from 'react-dom/client';

import App from './App';
import { AuthProvider } from './context/auth-context';
import { LanguageProvider } from './context/language-context';
import { ThemeProvider } from './context/theme-context';
import { ToastProvider } from './context/toast-context';
import './styles/bare.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <LanguageProvider>
      <ToastProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ToastProvider>
    </LanguageProvider>
  </ThemeProvider>,
);
