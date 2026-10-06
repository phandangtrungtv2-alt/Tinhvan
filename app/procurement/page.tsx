'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShoppingCart, ArrowRight } from 'lucide-react';

export default function ProcurementRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/reports');
  }, [router]);

  return (
    <div className="bg-white p-12 rounded-xl border border-slate-200 text-center max-w-md mx-auto my-12 space-y-4">
      <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto">
        <ShoppingCart className="w-6 h-6" />
      </div>
      <div>
        <h3 className="font-bold text-slate-800 text-base">Chuyển hướng đến Đặt hàng & Báo cáo PO</h3>
        <p className="text-xs text-slate-500 mt-1">
          Chức năng Đặt hàng vật tư đã được gộp hoàn chỉnh vào màn hình <strong>Đặt hàng & Báo cáo PO</strong>.
        </p>
      </div>
      <Link
        href="/reports"
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg shadow-sm"
      >
        <span>Mở Đặt hàng & Báo cáo PO</span>
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
