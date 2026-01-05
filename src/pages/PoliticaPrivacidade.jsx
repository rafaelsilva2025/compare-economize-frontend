import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Shield, MapPin, Users, Lock, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PoliticaPrivacidade() {
  const sections = [
    {
      icon: Users,
      title: 'Informações Coletadas',
      items: [
        'Dados de uso do aplicativo',
        'Informações de localização (quando autorizadas)',
        'Preferências de listas e comparações',
      ],
    },
    {
      icon: Shield,
      title: 'Uso das Informações',
      items: [
        'Calcular distâncias',
        'Melhorar comparações',
        'Personalizar a experiência do usuário',
      ],
    },
    {
      icon: MapPin,
      title: 'Localização',
      items: [
        'Uso opcional',
        'Pode ser ativado ou desativado a qualquer momento',
      ],
    },
    {
      icon: Lock,
      title: 'Segurança',
      items: [
        'Medidas técnicas para proteção das informações',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link to={createPageUrl('Home')}>
            <button className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Title */}
          <div className="text-center mb-12">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-200">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Política de Privacidade
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Sua privacidade é importante para nós. O CompareEconomize coleta apenas as informações necessárias para oferecer uma melhor experiência.
            </p>
          </div>

          {/* Sections */}
          <div className="space-y-6 mb-12">
            {sections.map((section, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.1 }}
                className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <section.icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">{section.title}</h2>
                </div>
                <ul className="space-y-2">
                  {section.items.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-gray-600">
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}

            {/* Compartilhamento */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-6 md:p-8 border border-emerald-200"
            >
              <h2 className="text-xl font-bold text-gray-900 mb-3">Compartilhamento</h2>
              <p className="text-gray-700 font-medium">
                Não vendemos nem compartilhamos dados pessoais com terceiros
              </p>
            </motion.div>

            {/* Alterações */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-gray-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Alterações</h2>
              </div>
              <p className="text-gray-600">
                Esta política pode ser atualizada periodicamente. Recomendamos que você a revise com frequência.
              </p>
            </motion.div>
          </div>

          {/* Footer note */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="text-center text-sm text-gray-500"
          >
            <p>Última atualização: dezembro de 2025</p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}