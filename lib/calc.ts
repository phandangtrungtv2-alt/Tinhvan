import { Material, MaterialCalcResult } from "./types";

/**
 * Thuật toán tính toán đặt hàng vật tư chuẩn ngành gỗ công nghiệp:
 * Net_Qty = SUM(quantity_SP * net_quantity_per_unit)
 * Waste_Rate = waste_rate_override ?? default_waste_rate
 * Gross_Qty = Net_Qty * (1 + Waste_Rate/100)
 * 
 * Order Qty:
 * - ceil_integer: Order_Qty = CEIL(Gross_Qty)
 * - package:      Order_Packs = CEIL(Gross_Qty / pack_size); Order_Qty = Order_Packs * pack_size
 * - exact:        Order_Qty = ROUND(Gross_Qty, 2)
 */
export function calcMaterial(
  material: Material,
  netQty: number,
  wasteRateOverride?: number | null
): MaterialCalcResult {
  const wasteRate = typeof wasteRateOverride === 'number' && !isNaN(wasteRateOverride)
    ? wasteRateOverride
    : material.default_waste_rate;

  const grossQty = Number((netQty * (1 + wasteRate / 100)).toFixed(4));

  return calcOrderFromGross(material, netQty, grossQty, wasteRate);
}

/**
 * Tính số lượng đặt hàng từ Gross Qty đã biết (dùng khi gộp nhiều đơn vị có hao hụt chi tiết)
 */
export function calcOrderFromGross(
  material: Material,
  netQty: number,
  grossQty: number,
  wasteRate?: number
): MaterialCalcResult {
  const effectiveWasteRate = wasteRate ?? (netQty > 0 ? ((grossQty - netQty) / netQty) * 100 : material.default_waste_rate);

  let orderQty = 0;
  let orderPacks = 0;

  switch (material.rounding_mode) {
    case 'ceil_integer': {
      orderQty = Math.ceil(grossQty);
      orderPacks = orderQty;
      break;
    }

    case 'package': {
      const packSize = Math.max(1, material.package_spec?.pack_size || 1);
      orderPacks = Math.ceil(grossQty / packSize);
      orderQty = orderPacks * packSize;
      break;
    }

    case 'exact':
    default: {
      orderQty = Math.round(grossQty * 100) / 100;
      orderPacks = 0;
      break;
    }
  }

  const surplus = Number(Math.max(0, orderQty - grossQty).toFixed(4));
  const totalAmount = Math.round(orderQty * (material.unit_price || 0));
  const totalWeight = Number((orderQty * (material.weight_per_unit || 0)).toFixed(2));

  return {
    netQty: Number(netQty.toFixed(4)),
    wasteRate: Number(effectiveWasteRate.toFixed(2)),
    grossQty: Number(grossQty.toFixed(4)),
    orderQty,
    orderPacks,
    surplus,
    totalAmount,
    totalWeight,
  };
}

/**
 * Tính tổng trọng lượng ước tính của 1 sản phẩm dựa trên định mức BOM (Kg)
 */
export function calcProductWeight(
  boms: { material_id: string; net_quantity_per_unit: number }[],
  materials: Material[]
): number {
  let totalKg = 0;
  for (const bom of boms) {
    const mat = materials.find((m) => m.id === bom.material_id);
    if (mat && mat.weight_per_unit) {
      totalKg += bom.net_quantity_per_unit * mat.weight_per_unit;
    }
  }
  return Number(totalKg.toFixed(2));
}
