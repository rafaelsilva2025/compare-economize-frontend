import React from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ShoppingItemCard({ item, product, market, category, price, onUpdateQuantity, onRemove }) {
  const unitPrice = price || item.estimatedPrice || 0;
  
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{product?.name || 'Produto'}</h4>
          {market || category ? (
            <p className="text-xs text-gray-500">
              {market?.name || 'Local não definido'}
              {category && ` • ${category.name}`}
            </p>
          ) : null}
        </div>
        
        <div className="text-right mr-3">
          <p className="text-sm font-semibold text-gray-900">R$ {unitPrice.toFixed(2)}</p>
          <p className="text-xs text-gray-500">{product?.unit || 'un'}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-50 rounded-full p-1">
            <button
              onClick={() => onUpdateQuantity(item.quantity - 1)}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white transition-colors text-gray-600"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center font-semibold text-gray-900">{item.quantity}</span>
            <button
              onClick={() => onUpdateQuantity(item.quantity + 1)}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white transition-colors text-gray-600"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <button
            onClick={onRemove}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="text-right">
          <span className="text-sm text-gray-500">Total</span>
          <p className="font-semibold text-gray-900">R$ {(unitPrice * item.quantity).toFixed(2)}</p>
        </div>
      </div>
      
      {!product && (
        <div className="mt-3 pt-3 border-t border-gray-50">
          <p className="text-xs text-amber-600">⚠️ Item sem vínculo de produto</p>
        </div>
      )}
    </div>
  );
}