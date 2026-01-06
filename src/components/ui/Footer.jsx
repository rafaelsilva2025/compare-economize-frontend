import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Mail, Phone } from 'lucide-react';

export default function Footer() {
  const [showContact, setShowContact] = useState(false);

  return (
    <>
      <footer className="bg-white border-t border-gray-100 mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-500">
              © 2025 CompareEconomize
            </p>
            <div className="flex items-center gap-6">
              <Link to={createPageUrl('Sobre')} className="text-xs text-gray-500 hover:text-gray-700 transition-colors">
                Sobre
              </Link>
              <Link to={createPageUrl('ComoFunciona')} className="text-xs text-gray-500 hover:text-gray-700 transition-colors">
                Como funciona
              </Link>
              <Link to={createPageUrl('PoliticaPrivacidade')} className="text-xs text-gray-500 hover:text-gray-700 transition-colors">
                Privacidade
              </Link>
              <button 
                onClick={() => setShowContact(true)}
                className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                Contato
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Contact Modal */}
      <Dialog open={showContact} onOpenChange={setShowContact}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Precisa de ajuda?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            <a 
              href="mailto:compareeeconomize@gmail.com"
              className="flex items-center justify-center gap-3 py-3 px-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                <path d="M22 6C22 4.9 21.1 4 20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6Z" fill="#EA4335"/>
                <path d="M22 6L12 13L2 6" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 6L12 13L22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6Z" fill="url(#gmail-gradient)"/>
                <defs>
                  <linearGradient id="gmail-gradient" x1="2" y1="6" x2="22" y2="20" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#FBBC04"/>
                    <stop offset="0.5" stopColor="#34A853"/>
                    <stop offset="1" stopColor="#4285F4"/>
                  </linearGradient>
                </defs>
              </svg>
              <span className="text-sm text-gray-700">compareeconomize@gmail.com</span>
            </a>
            <a 
              href="https://wa.me/5567999999999"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 py-3 px-4 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" fill="#25D366"/>
              </svg>
              <span className="text-sm text-emerald-700">(67) 99999-9999</span>
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}