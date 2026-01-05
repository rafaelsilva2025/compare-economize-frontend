import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ShoppingCart, Pill, Fuel, Store, Plus, ArrowRight, Hotel } from 'lucide-react';
import { motion } from 'framer-motion';

const iconMap = {
  'mercado': ShoppingCart,
  'farmacia': Pill,
  'combustivel': Fuel,
  'conveniencia': Store,
  'hotel': Hotel,
  'outros': Plus,
};

export default function CategoryCard({ category, index = 0 }) {
  const Icon = iconMap[category.slug] || ShoppingCart;
  
  if (category.isComingSoon) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.05 }}
      >
        <div className="bg-white rounded-2xl p-5 border border-gray-100 opacity-60 cursor-not-allowed">
          <div className="flex items-start justify-between mb-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${category.bgColor}`}>
              <Icon className={`w-6 h-6 ${category.iconColor}`} />
            </div>
            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
              Em breve
            </span>
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">{category.name}</h3>
          <p className="text-sm text-gray-500">{category.description}</p>
        </div>
      </motion.div>
    );
  }
  
  const targetPage = category.slug === 'hotel' ? 'HoteisComparacao' : `MinhaLista?category=${category.slug}`;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <Link to={createPageUrl(targetPage)}>
        <div className="group bg-white rounded-2xl p-5 border border-gray-100 hover:border-emerald-200 hover:shadow-md transition-all duration-200 cursor-pointer">
          <div className="flex items-start justify-between mb-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${category.bgColor}`}>
              <Icon className={`w-6 h-6 ${category.iconColor}`} />
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">{category.name}</h3>
          <p className="text-sm text-gray-500">{category.description}</p>
        </div>
      </Link>
    </motion.div>
  );
}