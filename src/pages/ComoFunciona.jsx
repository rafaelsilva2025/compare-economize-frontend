import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowRight, ListPlus, Search, Target, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function ComoFunciona() {
  const steps = [
    {
      number: '1',
      title: 'Crie sua lista',
      description: 'Adicione os produtos ou serviços que você deseja comprar.',
      icon: ListPlus,
      color: 'emerald',
    },
    {
      number: '2',
      title: 'Compare em tempo real',
      description: 'Compare preços, distância e custo-benefício em estabelecimentos próximos.',
      icon: Search,
      color: 'blue',
    },
    {
      number: '3',
      title: 'Veja o melhor resultado',
      description: 'Identificamos onde vale mais a pena comprar agora.',
      icon: Target,
      color: 'amber',
    },
    {
      number: '4',
      title: 'Economize de verdade',
      description: 'Tome decisões mais inteligentes e acompanhe sua economia ao longo do tempo.',
      icon: TrendingUp,
      color: 'purple',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-4 py-20 md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
            Como funciona o CompareEconomize?
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Em 4 passos simples você começa a economizar nas suas compras
          </p>
        </motion.div>

        {/* Steps */}
        <div className="space-y-8">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
              className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 hover:shadow-lg transition-all"
            >
              <div className="flex items-start gap-6">
                {/* Number Badge */}
                <div className="flex-shrink-0">
                  <div className={`w-12 h-12 bg-${step.color}-100 rounded-full flex items-center justify-center`}>
                    <span className={`text-xl font-bold text-${step.color}-600`}>
                      {step.number}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <step.icon className={`w-6 h-6 text-${step.color}-600`} />
                    <h3 className="text-xl font-bold text-gray-900">{step.title}</h3>
                  </div>
                  <p className="text-gray-600 leading-relaxed">{step.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="text-center mt-12"
        >
          <Link to={createPageUrl('MinhaLista')}>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white h-14 px-8 text-lg rounded-2xl shadow-md hover:shadow-lg transition-all">
              Começar agora
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
          <p className="text-sm text-gray-500 mt-4">
            Sem cadastro necessário • Grátis para sempre
          </p>
        </motion.div>
      </section>
    </div>
  );
}