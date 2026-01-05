import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowRight, CheckCircle, TrendingUp, MapPin, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function Sobre() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-4 py-20 md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-8 leading-tight">
            Por que usar o CompareEconomize?
          </h1>

          <div className="bg-white rounded-3xl p-8 md:p-12 shadow-lg border border-gray-100 max-w-2xl mx-auto">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="text-2xl md:text-3xl font-semibold text-emerald-600 mb-6"
            >
              Porque você não precisa pagar mais caro.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="text-lg md:text-xl text-gray-700 space-y-4 mb-8"
            >
              <p>
                Aqui você compara preços, distância e custo-benefício antes de decidir onde comprar.
              </p>

              <div className="pt-4">
                <p className="text-xl font-semibold text-gray-900 mb-3">
                  O resultado?
                </p>
                <p>
                  Escolhas mais inteligentes e{' '}
                  <span className="font-semibold text-emerald-600">economia real</span>{' '}
                  no fim do mês.
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
            >
              <Link to={createPageUrl('MinhaLista')}>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white h-14 px-8 text-lg rounded-2xl shadow-md hover:shadow-lg transition-all">
                  Começar a economizar
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-all"
          >
            <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4">
              <TrendingUp className="w-7 h-7 text-emerald-600" strokeWidth={2} />
            </div>
            <h3 className="font-semibold text-gray-900 text-lg mb-2">Compare preços</h3>
            <p className="text-gray-600">Veja onde sua lista de compras sai mais barata</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.6 }}
            className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-all"
          >
            <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-4">
              <MapPin className="w-7 h-7 text-blue-600" strokeWidth={2} />
            </div>
            <h3 className="font-semibold text-gray-900 text-lg mb-2">Considere a distância</h3>
            <p className="text-gray-600">Encontre as melhores opções perto de você</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.7 }}
            className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-all"
          >
            <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mb-4">
              <ShoppingBag className="w-7 h-7 text-amber-600" strokeWidth={2} />
            </div>
            <h3 className="font-semibold text-gray-900 text-lg mb-2">Economize de verdade</h3>
            <p className="text-gray-600">Faça escolhas mais inteligentes e poupe dinheiro</p>
          </motion.div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-3xl p-8 md:p-12 text-center"
        >
          <CheckCircle className="w-16 h-16 text-emerald-600 mx-auto mb-6" />
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
            Simples, rápido e gratuito
          </h2>
          <p className="text-lg text-gray-700 mb-6 max-w-2xl mx-auto">
            Sem cadastro obrigatório, sem surpresas. Compare e economize em segundos.
          </p>
          <Link to={createPageUrl('MinhaLista')}>
            <Button variant="outline" className="border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-600 hover:text-white h-12 px-6 rounded-xl transition-all">
              Experimentar agora
            </Button>
          </Link>
        </motion.div>
      </section>
    </div>
  );
}