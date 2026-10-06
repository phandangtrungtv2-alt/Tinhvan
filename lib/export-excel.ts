import * as XLSX from 'xlsx';
import { BatchBreakdown, Project } from './types';
import { CATEGORY_LABELS } from './format';

export function exportProcurementToExcel(batch: BatchBreakdown, allProjects: Project[]) {
  const wb = XLSX.utils.book_new();

  // 1. DATA CHO SHEET 1: Tổng hợp Kê Khối Lượng Đặt Hàng (PO)
  const selectedProjects = allProjects.filter((p) => batch.selectedProjectIds.includes(p.id));

  const projectRows: (string | number)[][] = [];
  if (selectedProjects.length === 0) {
    projectRows.push(['Công trình áp dụng: Tất cả công trình']);
  } else if (selectedProjects.length === 1) {
    projectRows.push([
      `Công trình áp dụng: ${selectedProjects[0].project_code} - ${selectedProjects[0].name}${
        selectedProjects[0].client_name ? ` (${selectedProjects[0].client_name})` : ''
      }`,
    ]);
  } else {
    projectRows.push([`Công trình áp dụng (${selectedProjects.length} công trình):`]);
    selectedProjects.forEach((p, idx) => {
      projectRows.push([
        `  ${idx + 1}. ${p.project_code} - ${p.name}${p.client_name ? ` (${p.client_name})` : ''}`,
      ]);
    });
  }

  const sheet1Data: (string | number)[][] = [
    ['CÔNG TY CỔ PHẦN TƯ VẤN XÂY DỰNG HOÀNG NAM'],
    ['Nhà máy sản xuất: Việt Trì – Phú Thọ | Email: cthoangnampt@gmail.com'],
    ['BẢNG TỔNG HỢP KÊ KHỐI LƯỢNG VẬT TƯ CẦN MUA (PURCHASE ORDER)'],
    [`Ngày lập: ${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN')}`],
    ...projectRows,
    [], // Dòng trống
    [
      'STT',
      'Mã VT',
      'Tên Vật Tư',
      'Nhóm Vật Tư',
      'ĐVT',
      'Khối Lượng Tinh (Net)',
      '% Hao Hụt',
      'Khối Lượng Thô (Gross)',
      'Quy Cách Đóng Gói',
      'Khối Lượng Cần Mua (Order Qty)',
      'Dư Lưu Kho',
      'Trọng Lượng (Kg)',
    ],
  ];

  let stt = 1;
  let totalWeightAll = 0;

  for (const item of batch.items) {
    const mat = item.material;
    const catLabel = CATEGORY_LABELS[mat.category] || mat.category;
    let packSpecText = 'Nguyên tấm';
    if (mat.rounding_mode === 'package') {
      packSpecText = `${mat.package_spec?.pack_size} ${mat.base_unit}/${mat.package_spec?.pack_unit_name}`;
    } else if (mat.rounding_mode === 'exact') {
      packSpecText = 'Chính xác lẻ';
    }

    let orderQtyText: string | number = item.orderQty;
    if (mat.rounding_mode === 'package') {
      orderQtyText = `${item.orderPacks} ${mat.package_spec?.pack_unit_name} (${item.orderQty} ${mat.base_unit})`;
    }

    const itemWeight = Number((item.orderQty * (mat.weight_per_unit || 0)).toFixed(1));
    totalWeightAll += itemWeight;

    sheet1Data.push([
      stt++,
      mat.material_code,
      mat.name,
      catLabel,
      mat.base_unit,
      item.netQty,
      `${item.wasteRate}%`,
      item.grossQty,
      packSpecText,
      orderQtyText,
      item.surplus,
      itemWeight > 0 ? itemWeight : '-',
    ]);
  }

  // Dòng tổng cộng trọng lượng
  sheet1Data.push([
    '',
    '',
    'TỔNG TRỌNG LƯỢNG VẬT TƯ (KG)',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    Number(totalWeightAll.toFixed(1)),
  ]);

  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);

  // Thiết lập độ rộng cột
  ws1['!cols'] = [
    { wch: 6 },  // STT
    { wch: 15 }, // Mã VT
    { wch: 42 }, // Tên VT
    { wch: 22 }, // Nhóm
    { wch: 10 }, // ĐVT
    { wch: 14 }, // Net
    { wch: 12 }, // % HH
    { wch: 14 }, // Gross
    { wch: 20 }, // Quy cách
    { wch: 24 }, // Order Qty
    { wch: 12 }, // Dư
    { wch: 18 }, // Trọng lượng
  ];

  XLSX.utils.book_append_sheet(wb, ws1, 'Tổng hợp PO');

  // 2. DATA CHO SHEET 2: Chi tiết theo từng công trình
  const sheet2Data: (string | number)[][] = [
    ['CHI TIẾT ĐÓNG GÓP VẬT TƯ THEO TỪNG CÔNG TRÌNH'],
    [`Ngày trích xuất: ${new Date().toLocaleDateString('vi-VN')}`],
    [],
    [
      'STT',
      'Mã Công Trình',
      'Tên Công Trình',
      'Mã VT',
      'Tên Vật Tư',
      'ĐVT',
      'Net Công Trình',
      'Gross Công Trình',
      'Trọng Lượng (Kg)',
    ],
  ];

  let stt2 = 1;
  for (const item of batch.items) {
    for (const contrib of item.projectContributions) {
      const contribWeight = Number((contrib.grossQty * (item.material.weight_per_unit || 0)).toFixed(1));

      sheet2Data.push([
        stt2++,
        contrib.projectCode,
        contrib.projectName,
        item.material.material_code,
        item.material.name,
        item.material.base_unit,
        contrib.netQty,
        contrib.grossQty,
        contribWeight > 0 ? contribWeight : '-',
      ]);
    }
  }

  const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);
  ws2['!cols'] = [
    { wch: 6 },
    { wch: 15 },
    { wch: 32 },
    { wch: 15 },
    { wch: 40 },
    { wch: 10 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
  ];

  XLSX.utils.book_append_sheet(wb, ws2, 'Breakdown Công Trình');

  // Tạo tên file
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `Don_Dat_Hang_Vat_Tu_${dateStr}.xlsx`;

  XLSX.writeFile(wb, fileName);
}
