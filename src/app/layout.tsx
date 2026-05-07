import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import { PairProvider } from '../context/PairContext';
import { ThemeProvider } from '../context/ThemeContext';
import { ToastProvider } from '../context/ToastContext';
import Layout from '../components/Layout';
import ToastContainer from '../components/ToastContainer';

export const metadata: Metadata = {
  title: 'AURA FOREX — AI Trading Platform',
  description: 'Personal AI-powered FOREX trading prediction platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <AuthProvider>
            <PairProvider>
              <ToastProvider>
                <Layout>{children}</Layout>
                <ToastContainer />
              </ToastProvider>
            </PairProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
