import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { apiRequest } from "@/api/apiClient";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Search, ShoppingCart, User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ShoppingItemCard from '@/components/shopping/ShoppingItemCard';
import SkeletonCard from '@/components/loading/SkeletonCard';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function MinhaLista() {
  const [listItems, setListItems] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  // Fetch products
  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list(),
  });

  // Fetch prices
  const { data: prices = [] } = useQuery({
    queryKey: ['prices'],
    queryFn: () => base44.entities.Price.list(),
  });

  // Fetch markets
  const { data: markets = [] } = useQuery({
    queryKey: ['markets'],
    queryFn: () => base44.entities.Market.list(),
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.Category.list(),
  });

  // Fetch savings snapshots for suggestions
  const { data: snapshots = [] } = useQuery({
    queryKey: ['savingsSnapshots'],
    queryFn: async () => {
      try {
        const sessionId = localStorage.getItem('sessionId');
        let user = null;
        
        try {
          user = await base44.auth.me();
        } catch (error) {
          // Not authenticated
        }

        if (user) {
          return await base44.entities.SavingsSnapshot.filter({ user: user.id });
        } else if (sessionId) {
          return await base44.entities.SavingsSnapshot.filter({ sessionId });
        }
        return [];
      } catch (error) {
        return [];
      }
    },
  });

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('shoppingList');
    if (saved) {
      setListItems(JSON.parse(saved));
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('shoppingList', JSON.stringify(listItems));
    
    // Save to history for suggestions (keep last 20 lists)
    if (listItems.length > 0) {
      const previousLists = JSON.parse(localStorage.getItem('previousLists') || '[]');
      previousLists.unshift(listItems);
      localStorage.setItem('previousLists', JSON.stringify(previousLists.slice(0, 20)));
    }
  }, [listItems]);

  // Build enriched items with product, price, market, category data
  const enrichedItems = React.useMemo(() => {
    return listItems.map(item => {
      const product = products.find(p => p.id === item.productId);
      
      if (!product) {
        return { ...item, product: null, price: null, market: null, category: null };
      }

      // Find price for this product (use first available market's price)
      const priceObj = prices.find(p => p.product === product.id);
      const price = priceObj?.price || item.estimatedPrice || 0;
      
      // Find market and category
      const market = priceObj ? markets.find(m => m.id === priceObj.market) : null;
      const category = market ? categories.find(c => c.id === market.category) : null;

      return {
        ...item,
        product,
        price,
        market,
        category,
      };
    });
  }, [listItems, products, prices, markets, categories]);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !listItems.find(item => item.productId === p.id)
  );

  const addProduct = (product) => {
    // Find best price for this product
    const productPrices = prices.filter(p => p.product === product.id);
    const bestPrice = productPrices.length > 0 
      ? Math.min(...productPrices.map(p => p.price))
      : 0;

    const newItem = {
      id: Date.now().toString(),
      productId: product.id,
      quantity: 1,
      estimatedPrice: bestPrice,
    };
    setListItems([...listItems, newItem]);
    setShowAddModal(false);
    setSearchTerm('');
  };

  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity < 1) {
      removeItem(itemId);
      return;
    }
    setListItems(listItems.map(item => 
      item.id === itemId ? { ...item, quantity: newQuantity } : item
    ));
  };

  const removeItem = (itemId) => {
    setListItems(listItems.filter(item => item.id !== itemId));
  };

  const addSuggestedProduct = (product) => {
    // Find best price for this product
    const productPrices = prices.filter(p => p.product === product.id);
    const bestPrice = productPrices.length > 0 
      ? Math.min(...productPrices.map(p => p.price))
      : 0;

    const newItem = {
      id: Date.now().toString(),
      productId: product.id,
      quantity: 1,
      estimatedPrice: bestPrice,
    };
    setListItems([...listItems, newItem]);
  };

  const totalEstimated = enrichedItems.reduce((sum, item) => 
    sum + ((item.price || item.estimatedPrice || 0) * item.quantity), 0
  );

  // Calculate product suggestions
  const suggestedProducts = React.useMemo(() => {
    if (snapshots.length === 0) return [];
    
    // Get all product IDs from shopping list items in previous snapshots
    const savedLists = JSON.parse(localStorage.getItem('previousLists') || '[]');
    const productFrequency = {};
    
    savedLists.forEach(list => {
      list.forEach(item => {
        if (item.productId) {
          productFrequency[item.productId] = (productFrequency[item.productId] || 0) + 1;
        }
      });
    });
    
    // Sort by frequency
    const sortedProducts = Object.entries(productFrequency)
      .sort((a, b) => b[1] - a[1])
      .map(([productId]) => productId);
    
    // Filter out products already in current list
    const currentProductIds = listItems.map(item => item.productId);
    const suggestions = sortedProducts
      .filter(productId => !currentProductIds.includes(productId))
      .slice(0, 5);
    
    return suggestions
      .map(productId => products.find(p => p.id === productId))
      .filter(Boolean);
  }, [snapshots, products, listItems]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to={createPageUrl('Home')}>
                <button className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
              </Link>
              <div>
                <h1 className="font-semibold text-gray-900">Minha Lista</h1>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Visitante</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-6 pb-32">
        {isLoadingProducts ? (
          <div className="space-y-3">
            <SkeletonCard variant="product" />
            <SkeletonCard variant="product" />
            <SkeletonCard variant="product" />
          </div>
        ) : listItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingCart className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Lista vazia</h3>
            <p className="text-gray-500 mb-6">Adicione itens para começar a comparar preços</p>
            <Button 
              onClick={() => setShowAddModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              Adicionar produto
            </Button>
          </motion.div>
        ) : (
          <>
            {/* Summary Card */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total estimado</p>
                  <p className="text-3xl font-bold text-gray-900">R$ {totalEstimated.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">{listItems.length} {listItems.length === 1 ? 'item' : 'itens'}</p>
                </div>
              </div>
            </div>

            {/* Items List */}
            <div className="space-y-3 mb-6">
              <AnimatePresence>
                {enrichedItems.map((enrichedItem, i) => (
                  <motion.div
                    key={enrichedItem.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                  >
                    <ShoppingItemCard
                      item={enrichedItem}
                      product={enrichedItem.product}
                      market={enrichedItem.market}
                      category={enrichedItem.category}
                      price={enrichedItem.price}
                      onUpdateQuantity={(qty) => updateQuantity(enrichedItem.id, qty)}
                      onRemove={() => removeItem(enrichedItem.id)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Add More Button */}
            <button
              onClick={() => setShowAddModal(true)}
              className="w-full py-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:border-emerald-300 hover:text-emerald-600 transition-colors flex items-center justify-center gap-2 mb-6"
            >
              <Plus className="w-5 h-5" />
              Adicionar mais produtos
            </button>

            {/* Suggestions */}
            {suggestedProducts.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <span className="text-lg">💡</span>
                  </div>
                  <h3 className="font-semibold text-gray-900">Sugestões para você</h3>
                </div>
                <p className="text-xs text-gray-500 mb-3">Baseado nas suas compras anteriores</p>
                <div className="space-y-2">
                  {suggestedProducts.map((product, i) => {
                    const productPrices = prices.filter(p => p.product === product.id);
                    const bestPrice = productPrices.length > 0 
                      ? Math.min(...productPrices.map(p => p.price))
                      : null;

                    return (
                      <motion.button
                        key={product.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => addSuggestedProduct(product)}
                        className="w-full p-3 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl text-left transition-colors flex items-center justify-between group"
                      >
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{product.name}</p>
                          <p className="text-xs text-gray-500">
                            {bestPrice ? `R$ ${bestPrice.toFixed(2)}` : 'Preço não disponível'}
                          </p>
                        </div>
                        <Plus className="w-5 h-5 text-purple-600 group-hover:scale-110 transition-transform" />
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Fixed Bottom Button */}
      {listItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 shadow-lg">
          <div className="max-w-lg mx-auto">
            <Link to={createPageUrl('Comparacao')}>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 py-6 text-lg rounded-xl shadow-lg shadow-emerald-200">
                Comparar preços
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle>Adicionar produto</DialogTitle>
          </DialogHeader>
          
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Buscar produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="mt-4 max-h-80 overflow-y-auto space-y-2">
            {filteredProducts.map((product) => {
              // Find best price
              const productPrices = prices.filter(p => p.product === product.id);
              const bestPrice = productPrices.length > 0 
                ? Math.min(...productPrices.map(p => p.price))
                : null;

              return (
                <button
                  key={product.id}
                  onClick={() => addProduct(product)}
                  className="w-full p-4 bg-gray-50 hover:bg-emerald-50 rounded-xl text-left transition-colors flex items-center justify-between group"
                >
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-500">
                      {bestPrice ? `R$ ${bestPrice.toFixed(2)}` : 'Preço não disponível'}
                    </p>
                  </div>
                  <Plus className="w-5 h-5 text-gray-400 group-hover:text-emerald-600" />
                </button>
              );
            })}
            {filteredProducts.length === 0 && (
              <p className="text-center text-gray-500 py-8">Nenhum produto encontrado</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}