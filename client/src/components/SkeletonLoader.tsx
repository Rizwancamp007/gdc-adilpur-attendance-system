import React from 'react';

export const SkeletonStats: React.FC = () => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs animate-pulse">
          <div className="flex items-center justify-between mb-3">
            <div className="h-3 w-20 bg-slate-200 rounded"></div>
            <div className="w-5 h-5 bg-slate-200 rounded-full"></div>
          </div>
          <div className="h-7 w-16 bg-slate-200 rounded mb-2"></div>
          <div className="h-2.5 w-24 bg-slate-100 rounded"></div>
        </div>
      ))}
    </div>
  );
};

export const SkeletonClassCards: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-3 w-16 bg-slate-200 rounded"></div>
            <div className="h-5 w-20 bg-slate-200 rounded-full"></div>
          </div>
          <div className="h-5 w-3/4 bg-slate-200 rounded mb-2"></div>
          <div className="h-3 w-1/2 bg-slate-100 rounded mb-6"></div>
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <div className="h-4 w-24 bg-slate-200 rounded"></div>
            <div className="h-8 w-24 bg-slate-200 rounded-xl"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const SkeletonTable: React.FC<{ rows?: number }> = ({ rows = 6 }) => {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden animate-pulse">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="h-4 w-32 bg-slate-200 rounded"></div>
        <div className="h-4 w-20 bg-slate-100 rounded"></div>
      </div>
      <div className="p-4 space-y-3">
        {Array.from({ length: rows }).map((_, idx) => (
          <div key={idx} className="flex items-center justify-between py-2.5 px-3 bg-slate-50/70 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-200"></div>
              <div className="space-y-1.5">
                <div className="h-3.5 w-36 bg-slate-200 rounded"></div>
                <div className="h-2.5 w-24 bg-slate-100 rounded"></div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-4 w-16 bg-slate-200 rounded"></div>
              <div className="h-6 w-16 bg-slate-200 rounded-lg"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
