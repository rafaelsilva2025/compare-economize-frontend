
import React from 'react';
import Header from '@/components/ui/Header';
import Footer from '@/components/ui/Footer';

export default function Layout({ children, currentPageName }) {
  const hideHeader = currentPageName === 'CriarConta';
  const hideFooter = ['MinhaLista', 'Comparacao', 'MarketDetail', 'ProductDetail', 'CriarConta'].includes(currentPageName);
  
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {!hideHeader && <Header />}
      <main className="flex-1">
        {children}
      </main>
      {!hideFooter && <Footer />}
    </div>
  );
}
