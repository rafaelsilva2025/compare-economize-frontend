import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function PagamentoErro() {
  const navigate = useNavigate();
  
  const urlParams = new URLSearchParams(window.location.search);
  const internalId = urlParams.get('payment');

  const handleTryAgain = () => {
    // Clear old payment data
    if (internalId) {
      localStorage.removeItem(`payment_${internalId}`);
    }
    
    // Redirect to plans
    navigate(createPageUrl('PlanosUsuarios'));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
          {/* Error Icon */}
          <div className="bg-gradient-to-br from-red-500 to-red-600 p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <XCircle className="w-12 h-12 text-red-600" />
            </motion.div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Pagamento não confirmado
            </h1>
            <p className="text-red-50">
              Não conseguimos confirmar seu pagamento
            </p>
          </div>

          {/* Content */}
          <div className="p-8">
            <div className="text-center mb-8">
              <p className="text-gray-600 mb-4">
                Isso pode acontecer por alguns motivos:
              </p>
              <ul className="text-sm text-gray-600 space-y-2 text-left max-w-xs mx-auto">
                <li className="flex items-start gap-2">
                  <span className="text-gray-400">•</span>
                  <span>O pagamento não foi concluído</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gray-400">•</span>
                  <span>O código Pix expirou</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gray-400">•</span>
                  <span>Houve um erro na transação</span>
                </li>
              </ul>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Button
                onClick={handleTryAgain}
                className="w-full bg-emerald-600 hover:bg-emerald-700 py-6 rounded-xl"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Tentar novamente
              </Button>
              
              <Link to={createPageUrl('Home')}>
                <Button
                  variant="outline"
                  className="w-full py-6 rounded-xl border-2"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Voltar ao início
                </Button>
              </Link>
            </div>

            {/* Support */}
            <div className="mt-6 pt-6 border-t border-gray-100 text-center">
              <p className="text-sm text-gray-500">
                Precisa de ajuda?{' '}
                <a href="mailto:suporte@compareeconomize.com" className="text-emerald-600 hover:underline">
                  Entre em contato
                </a>
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}