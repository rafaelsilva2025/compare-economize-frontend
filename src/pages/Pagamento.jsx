import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Copy, CheckCircle, Loader2, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { activateSubscriptionFromPayment } from '@/lib/payments';

export default function Pagamento() {
  const navigate = useNavigate();
  const [paymentData, setPaymentData] = useState(null);
  const [status, setStatus] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [pollingCount, setPollingCount] = useState(0);

  // Get payment ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const internalId = urlParams.get('payment');

  // Plan details
  const planDetails = {
    user_pro: { name: 'Usuário Pro', price: 9.90 },
    business_pro: { name: 'Empresa Pro', price: 29.90 },
    business_premium: { name: 'Empresa Premium', price: 59.90 },
  };

  // Load payment data from localStorage (set when creating payment)
  useEffect(() => {
    if (!internalId) {
      toast.error('Pagamento não encontrado');
      navigate(createPageUrl('Home'));
      return;
    }

    const savedPayment = localStorage.getItem(`payment_${internalId}`);
    if (savedPayment) {
      const data = JSON.parse(savedPayment);
      setPaymentData(data);
      setLoading(false);
    } else {
      toast.error('Dados do pagamento não encontrados');
      setLoading(false);
    }
  }, [internalId, navigate]);

  // Polling for payment status
  useEffect(() => {
    if (!internalId || status !== 'pending') return;
    // In Base44-only/manual mode there is no backend to confirm automatically.
    if (paymentData?.mode === 'manual') return;

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/payments/status?internal_id=${internalId}`);
        if (!response.ok) throw new Error('Erro ao verificar status');
        
        const data = await response.json();
        
        if (data.status === 'approved') {
          setStatus('approved');
          toast.success('Pagamento confirmado!');
          setTimeout(() => {
            navigate(createPageUrl('PagamentoSucesso') + `?payment=${internalId}`);
          }, 1500);
        } else if (data.status === 'rejected' || data.status === 'expired') {
          setStatus(data.status);
          toast.error('Pagamento não confirmado');
          setTimeout(() => {
            navigate(createPageUrl('PagamentoErro') + `?payment=${internalId}`);
          }, 1500);
        }
      } catch (error) {
        console.error('Erro ao verificar status:', error);
      }
      
      setPollingCount(prev => prev + 1);
    };

    // Check immediately
    checkStatus();

    // Then check every 5 seconds
    const interval = setInterval(checkStatus, 5000);

    // Stop after 10 minutes (120 checks)
    if (pollingCount > 120) {
      clearInterval(interval);
      toast.error('Tempo limite excedido');
      navigate(createPageUrl('PagamentoErro') + `?payment=${internalId}`);
    }

    return () => clearInterval(interval);
  }, [internalId, status, navigate, pollingCount, paymentData]);

  const confirmManualPayment = async () => {
    try {
      setStatus('approved');
      const updated = { ...paymentData, status: 'approved' };
      localStorage.setItem(`payment_${internalId}`, JSON.stringify(updated));
      setPaymentData(updated);
      toast.success('Pagamento confirmado (modo manual). Ativando plano...');
      await activateSubscriptionFromPayment(updated);
      setTimeout(() => {
        navigate(createPageUrl('PagamentoSucesso') + `?payment=${internalId}`);
      }, 800);
    } catch (e) {
      console.error(e);
      toast.error(e?.message || 'Não foi possível ativar o plano.');
    }
  };

  const copyPixCode = () => {
    if (paymentData?.qr_code) {
      navigator.clipboard.writeText(paymentData.qr_code);
      toast.success('Código Pix copiado!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (!paymentData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Pagamento não encontrado</h2>
          <Link to={createPageUrl('Home')}>
            <Button>Voltar ao início</Button>
          </Link>
        </div>
      </div>
    );
  }

  const plan = planDetails[paymentData.plan_code];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('Home')}>
              <button className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            </Link>
            <h1 className="font-semibold text-gray-900">Pagamento via Pix</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
        >
          {/* Plan Info */}
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-6 border-b border-gray-100">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h2>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-bold text-emerald-600">
                  R$ {plan.price.toFixed(2)}
                </span>
                <span className="text-gray-600">/mês</span>
              </div>
              <p className="text-sm text-gray-600 mt-2">{paymentData.name}</p>
            </div>
          </div>

          {/* QR Code */}
          <div className="p-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-4">
                <QrCode className="w-4 h-4" />
                Escaneie o QR Code
              </div>
              <p className="text-gray-600">
                Use o app do seu banco para escanear ou copie o código abaixo
              </p>
            </div>

            {/* QR Code Image */}
            {paymentData.qr_code_base64 && (
              <div className="flex justify-center mb-6">
                <div className="bg-white p-4 rounded-2xl border-2 border-gray-200 shadow-sm">
                  <img
                    src={paymentData.qr_code_base64.startsWith('data:image') || paymentData.qr_code_base64.startsWith('http')
                      ? paymentData.qr_code_base64
                      : `data:image/png;base64,${paymentData.qr_code_base64}`}
                    alt="QR Code Pix"
                    className="w-64 h-64"
                  />
                </div>
              </div>
            )}

            {/* Copy Button */}
            <Button
              onClick={copyPixCode}
              className="w-full bg-emerald-600 hover:bg-emerald-700 py-6 rounded-xl mb-4"
            >
              <Copy className="w-5 h-5 mr-2" />
              Copiar código Pix
            </Button>

            {/* Status */}
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-center gap-2 text-gray-600">
                {status === 'pending' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">
                      {paymentData.mode === 'manual'
                        ? 'Modo manual: após pagar, confirme abaixo.'
                        : 'Aguardando confirmação do pagamento...'}
                    </span>
                  </>
                ) : status === 'approved' ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm text-emerald-600">Pagamento confirmado!</span>
                  </>
                ) : null}
              </div>
            </div>

            {paymentData.mode === 'manual' && status === 'pending' && (
              <Button
                onClick={confirmManualPayment}
                variant="outline"
                className="w-full py-6 rounded-xl mb-4 border-2"
              >
                Já paguei (confirmar)
              </Button>
            )}

            {/* Instructions */}
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-emerald-600 font-bold text-xs">1</span>
                </div>
                <p>Abra o app do seu banco e escolha pagar com Pix</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-emerald-600 font-bold text-xs">2</span>
                </div>
                <p>Escaneie o QR Code ou cole o código copiado</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-emerald-600 font-bold text-xs">3</span>
                </div>
                <p>
                  {paymentData.mode === 'manual'
                    ? 'Após pagar, toque em “Já paguei (confirmar)” para ativar o plano (modo manual).'
                    : 'Confirme o pagamento. Seu plano será ativado automaticamente'}
                </p>
              </div>
            </div>

            {/* Payment ID */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-xs text-gray-400 text-center">
                ID do pagamento: {internalId?.substring(0, 8)}...
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}