import React from 'react';

export default function SkeletonCard({ variant = 'market' }) {
  if (variant === 'market') {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 animate-pulse">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-100 rounded w-1/2"></div>
          </div>
          <div className="text-right">
            <div className="h-4 bg-gray-100 rounded w-12 mb-1"></div>
            <div className="h-6 bg-gray-200 rounded w-20"></div>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 h-10 bg-gray-100 rounded-xl"></div>
          <div className="flex-1 h-10 bg-gray-100 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (variant === 'product') {
    return (
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-100 rounded w-1/2"></div>
          </div>
          <div className="h-6 bg-gray-200 rounded w-16"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-4 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
      <div className="h-4 bg-gray-100 rounded w-3/4"></div>
    </div>
  );
}