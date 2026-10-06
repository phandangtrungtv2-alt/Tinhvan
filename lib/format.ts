import { Material } from "./types";

/**
 * Định dạng số tiền kiểu Việt Nam (ví dụ: 320.000đ, 1.200đ/m)
 */
export function formatVND(value: number, unitSuffix?: string): string {
  if (isNaN(value) || value === null || value === undefined) {
    return '0đ';
  }
  const rounded = Math.round(value);
  const formatted = new Intl.NumberFormat('vi-VN').format(rounded);
  if (unitSuffix) {
    return `${formatted}đ/${unitSuffix}`;
  }
  return `${formatted}đ`;
}

/**
 * Định dạng số kiểu Việt Nam: dấu chấm ngăn cách hàng nghìn, dấu phẩy thập phân
 * Tự động cắt bỏ số 0 vô nghĩa ở phần thập phân
 */
export function formatNumber(value: number, maxDecimals: number = 2): string {
  if (isNaN(value) || value === null || value === undefined) {
    return '0';
  }
  return new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  }).format(value);
}

/**
 * Định dạng số thô không có dấu phẩy nếu cần hiển thị gọn (ví dụ 0.8 thay vì 0,8 trong ghi chú)
 */
export function formatDecimalRaw(value: number, maxDecimals: number = 2): string {
  if (isNaN(value) || value === null || value === undefined) {
    return '0';
  }
  const factor = Math.pow(10, maxDecimals);
  const rounded = Math.round(value * factor) / factor;
  return rounded.toString();
}

/**
 * Định dạng khối lượng vật tư cần mua chuyên biệt cho ngành gỗ:
 * - Ván (ceil_integer): "35 Tấm (dư 0.8)"
 * - Nẹp (package cuộn): "3 Cuộn (≈ 300 Mét, dư 60 Mét)"
 * - Phụ kiện (package hộp/bịch): "2 Hộp / 200 Cái (dư 40 Cái)"
 * - Exact: "12,50 Mét"
 */
export function formatQtyDisplay(
  material: Material,
  orderQty: number,
  grossQty: number
): string {
  const surplus = Math.max(0, orderQty - grossQty);
  const cleanSurplus = Math.round(surplus * 100) / 100;

  switch (material.rounding_mode) {
    case 'ceil_integer': {
      const surplusText = cleanSurplus > 0.001 
        ? ` (dư ${formatDecimalRaw(cleanSurplus, 2)})` 
        : '';
      return `${formatNumber(orderQty)} ${material.base_unit}${surplusText}`;
    }

    case 'package': {
      const packSize = material.package_spec?.pack_size || 1;
      const packUnit = material.package_spec?.pack_unit_name || 'Gói';
      const orderPacks = Math.ceil(orderQty / packSize);
      
      const surplusText = cleanSurplus > 0.001
        ? `dư ${formatDecimalRaw(cleanSurplus, 2)} ${material.base_unit}`
        : '';

      if (packUnit === 'Cuộn') {
        const surplusPart = surplusText ? `, ${surplusText}` : '';
        return `${formatNumber(orderPacks)} ${packUnit} (≈ ${formatNumber(orderQty)} ${material.base_unit}${surplusPart})`;
      }

      const surplusPart = surplusText ? ` (${surplusText})` : '';
      return `${formatNumber(orderPacks)} ${packUnit} / ${formatNumber(orderQty)} ${material.base_unit}${surplusPart}`;
    }

    case 'exact':
    default: {
      return `${formatNumber(orderQty, 2)} ${material.base_unit}`;
    }
  }
}

export const CATEGORY_LABELS: Record<string, string> = {
  board: 'Ván gỗ công nghiệp',
  edge: 'Nẹp chỉ dán cạnh',
  hardware: 'Phụ kiện kim khí',
  accessory: 'Phụ kiện chức năng',
  consumable: 'Vật tư tiêu hao',
};

export const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  board: {
    bg: 'bg-amber-50/40 hover:bg-amber-50/80',
    text: 'text-amber-950',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-800 border-amber-300',
  },
  edge: {
    bg: 'bg-sky-50/40 hover:bg-sky-50/80',
    text: 'text-sky-950',
    border: 'border-sky-200',
    badge: 'bg-sky-100 text-sky-800 border-sky-300',
  },
  hardware: {
    bg: 'bg-emerald-50/40 hover:bg-emerald-50/80',
    text: 'text-emerald-950',
    border: 'border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
  accessory: {
    bg: 'bg-purple-50/40 hover:bg-purple-50/80',
    text: 'text-purple-950',
    border: 'border-purple-200',
    badge: 'bg-purple-100 text-purple-800 border-purple-300',
  },
  consumable: {
    bg: 'bg-slate-50/60 hover:bg-slate-100/80',
    text: 'text-slate-900',
    border: 'border-slate-200',
    badge: 'bg-slate-100 text-slate-800 border-slate-300',
  },
};
