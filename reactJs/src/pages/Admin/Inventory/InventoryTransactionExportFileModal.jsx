import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { getInventoryTransactions } from "../../../apis/inventoryApi";
import { FiEye } from "react-icons/fi";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import ExcelJS from 'exceljs';

const InventoryTransactionExportFileModal = ({ warehouseId, onClose, showPopup }) => {
  const [transactions, setTransactions] = useState([]);
  const [filterType, setFilterType] = useState("month");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedStartDate, setSelectedStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedEndDate, setSelectedEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const getTransactionTypeLabel = (type) => {
    switch (type) {
      case "IMPORT": return "Nhập kho";
      case "EXPORT": return "Xuất kho";
      case "RESERVE": return "Đặt giữ hàng";
      case "RELEASE": return "Hủy giữ hàng";
      case "ADJUST": return "Điều chỉnh";
      default: return type;
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      let res;
      let start, end;
      if (filterType === "month") {
        start = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
        end = new Date(selectedYear, selectedMonth, 0).toISOString().slice(0, 10);
      } else {
        start = selectedStartDate;
        end = selectedEndDate;
      }
      res = await getInventoryTransactions(0, 10000, "COMPLETED", null, start, end, null, null, null, warehouseId);
      if (res?.error) {
        showPopup(res.error || "Lỗi khi lấy dữ liệu giao dịch!");
        setTransactions([]);
      } else {
        setTransactions(res.data?.content || []);
      }
      console.log(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [filterType, selectedMonth, selectedYear, selectedStartDate,selectedEndDate]);

  const exportFile = async (transactions) => {
    if (!transactions.length) {
      alert("Không có dữ liệu để xuất!");
      return;
    }
    // Tạo workbook và worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Kế toán kho', {
      pageSetup: {
        paperSize: 9,
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0
      }
    });
    // Tiêu đề chính
    worksheet.mergeCells('A1:J1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'BÁO CÁO NHẬP XUẤT KHO';
    titleCell.font = {
      name: 'Arial',
      size: 18,
      bold: true,
      color: { argb: 'FFFFFFFF' }
    };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F4E79' }
    };
    titleCell.alignment = {
      vertical: 'middle',
      horizontal: 'center'
    };
    titleCell.border = {
      bottom: { style: 'thick', color: { argb: 'FF1F4E79' } }
    };
    worksheet.getRow(1).height = 35;
    // Thời gian báo cáo
    worksheet.mergeCells('A2:J2');
    const subtitleCell = worksheet.getCell('A2');
    subtitleCell.value = `Thời gian: ${filterType === "month" ? `Tháng ${selectedMonth}/${selectedYear}` :`Từ ${new Date(selectedStartDate).toLocaleDateString('vi-VN')} đến ${new Date(selectedEndDate).toLocaleDateString('vi-VN')}`}`;
    subtitleCell.font = {
      name: 'Arial',
      size: 12,
      italic: true,
      color: { argb: 'FF1F4E79' }
    };
    subtitleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDDEBF7' }
    };
    subtitleCell.alignment = {
      vertical: 'middle',
      horizontal: 'center'
    };
    worksheet.getRow(2).height = 25;
    // Dòng trống
    worksheet.getRow(3).height = 10;
    // Header row
    const headers = [
      'Ngày tạo',
      'Mã phiếu',
      'Loại giao dịch',
      'Kho',
      'SKU',
      'Biến thể',
      'Số lượng',
      'Giá nhập/xuất',
      'Thành tiền',
      'Người tạo'
    ];
    const headerRow = worksheet.getRow(4);
    headers.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      cell.font = {
        name: 'Arial',
        size: 11,
        bold: true,
        color: { argb: 'FFFFFFFF' }
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF70AD47' }
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true
      };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'medium', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
    });
    headerRow.height = 30;
    transactions.forEach((t, index) => {
      const rowIndex = index + 5;
      const row = worksheet.getRow(rowIndex);

      // Màu nền xen kẽ
      const bgColor = index % 2 === 0 ? 'FFF2F2F2' : 'FFFFFFFF';

      // Ngày tạo
      const dateCell = row.getCell(1);
      dateCell.value = new Date(t.createdAt);
      dateCell.numFmt = 'dd/mm/yyyy';
      dateCell.alignment = { vertical: 'middle', horizontal: 'center' };

      // Mã phiếu
      const codeCell = row.getCell(2);
      codeCell.value = t.code;
      codeCell.alignment = { vertical: 'middle', horizontal: 'center' };

      // Loại giao dịch
      const typeCell = row.getCell(3);
      typeCell.value = getTransactionTypeLabel(t.transactionType);
      typeCell.alignment = { vertical: 'middle', horizontal: 'center' };
      typeCell.font = { name: 'Arial', size: 10, bold: true };

      let typeBgColor = bgColor;
      if (t.transactionType === "IMPORT") {
        typeBgColor = 'FFC6EFCE';
        typeCell.font.color = { argb: 'FF006100' };
      } else if (t.transactionType === "EXPORT") {
        typeBgColor = 'FFFFC7CE';
        typeCell.font.color = { argb: 'FF9C0006' };
      } else {
        typeBgColor = 'FFD9E1F2';
        typeCell.font.color = { argb: 'FF002060' };
      }
      typeCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: typeBgColor }
      };

      // Kho
      const warehouseCell = row.getCell(4);
      warehouseCell.value = t.warehouse?.code || '-';
      warehouseCell.alignment = { vertical: 'middle', horizontal: 'center' };

      // SKU
      const skuCell = row.getCell(5);
      skuCell.value = t.variant?.sku || '-';
      skuCell.alignment = { vertical: 'middle', horizontal: 'center' };

      // Sản phẩm
      const productCell = row.getCell(6);
      productCell.value = t.variant?.name || '-';
      productCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

      // Số lượng
      const qtyCell = row.getCell(7);
      qtyCell.value = t.quantity;
      qtyCell.numFmt = '#,##0';
      qtyCell.alignment = { vertical: 'middle', horizontal: 'center' };
      if (t.quantity < 0) {
        qtyCell.font = { name: 'Arial', size: 10, color: { argb: 'FFFF0000' }, bold: true };
      }

      // Giá nhập/xuất
      const priceCell = row.getCell(8);
      priceCell.value = t.pricePerItem || 0;
      priceCell.numFmt = '#,##0';
      priceCell.alignment = { vertical: 'middle', horizontal: 'right' };

      // Thành tiền
      const totalCell = row.getCell(9);
      totalCell.value = t.pricePerItem ? t.quantity * t.pricePerItem : 0;
      totalCell.numFmt = '#,##0" ₫"';
      totalCell.alignment = { vertical: 'middle', horizontal: 'right' };
      totalCell.font = { name: 'Arial', size: 10, bold: true };

      // Người tạo
      const creatorCell = row.getCell(10);
      creatorCell.value = t.referenceType === "ORDER" ? "SP" + t.createdBy : "NV" + t.createdBy;
      creatorCell.alignment = { vertical: 'middle', horizontal: 'center' };

      [1, 2, 4, 5, 6, 7, 8, 9, 10].forEach(colIndex => {
        const cell = row.getCell(colIndex);
        if (colIndex !== 3) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: bgColor }
          };
        }
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
          left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
          bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
          right: { style: 'thin', color: { argb: 'FFD9D9D9' } }
        };
        if (!cell.font) {
          cell.font = { name: 'Arial', size: 10 };
        }
      });

      row.height = 25;
    });
    const importTransactions = transactions.filter(t => t.transactionType === 'IMPORT');
    const exportTransactions = transactions.filter(t => t.transactionType === 'EXPORT');
    const adjustTransactions = transactions.filter(t => t.transactionType === 'ADJUST');

    const importQty = importTransactions.reduce((sum, t) => sum + t.quantity, 0);
    const importTotal = importTransactions.reduce((sum, t) => sum + (t.pricePerItem ? t.quantity * t.pricePerItem : 0), 0);

    const exportQty = exportTransactions.reduce((sum, t) => sum + t.quantity, 0);
    const exportTotal = exportTransactions.reduce((sum, t) => sum + (t.pricePerItem ? t.quantity * t.pricePerItem : 0), 0);

    const adjustQty = adjustTransactions.reduce((sum, t) => sum + t.quantity, 0);
    const adjustTotal = adjustTransactions.reduce((sum, t) => sum + (t.pricePerItem ? t.quantity * t.pricePerItem : 0), 0);
    const spacerRowIndex = transactions.length + 5;
    worksheet.getRow(spacerRowIndex).height = 15;
    const importRowIndex = spacerRowIndex + 1;
    const importRow = worksheet.getRow(importRowIndex);

    worksheet.mergeCells(`A${importRowIndex}:F${importRowIndex}`);
    const importLabelCell = importRow.getCell(1);
    importLabelCell.value = 'TỔNG NHẬP KHO';
    importLabelCell.font = {
      name: 'Arial',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' }
    };
    importLabelCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF70AD47' }
    };
    importLabelCell.alignment = {
      vertical: 'middle',
      horizontal: 'center'
    };
    importLabelCell.border = {
      top: { style: 'medium', color: { argb: 'FF000000' } },
      left: { style: 'medium', color: { argb: 'FF000000' } },
      bottom: { style: 'medium', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    };
    const importQtyCell = importRow.getCell(7);
    importQtyCell.value = importQty;
    importQtyCell.numFmt = '#,##0';
    importQtyCell.font = { name: 'Arial', size: 11, bold: true };
    importQtyCell.alignment = { vertical: 'middle', horizontal: 'right' };
    importQtyCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFC6EFCE' }
    };
    importQtyCell.border = {
      top: { style: 'medium', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'medium', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    };
    // Empty H for alignment
    const importEmptyHCell = importRow.getCell(8);
    importEmptyHCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFC6EFCE' }
    };
    importEmptyHCell.border = {
      top: { style: 'medium', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'medium', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    };
    const importTotalCell = importRow.getCell(9);
    importTotalCell.value = importTotal;
    importTotalCell.numFmt = '#,##0" ₫"';
    importTotalCell.font = {
      name: 'Arial',
      size: 11,
      bold: true
    };
    importTotalCell.alignment = { vertical: 'middle', horizontal: 'right' };
    importTotalCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFC6EFCE' }
    };
    importTotalCell.border = {
      top: { style: 'medium', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'medium', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    };
    const importEmptyJCell = importRow.getCell(10);
    importEmptyJCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFC6EFCE' }
    };
    importEmptyJCell.border = {
      top: { style: 'medium', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'medium', color: { argb: 'FF000000' } },
      right: { style: 'medium', color: { argb: 'FF000000' } }
    };
    importRow.height = 28;
    const exportRowIndex = importRowIndex + 1;
    const exportRow = worksheet.getRow(exportRowIndex);

    worksheet.mergeCells(`A${exportRowIndex}:F${exportRowIndex}`);
    const exportLabelCell = exportRow.getCell(1);
    exportLabelCell.value = 'TỔNG XUẤT KHO';
    exportLabelCell.font = {
      name: 'Arial',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' }
    };
    exportLabelCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFED7D31' }
    };
    exportLabelCell.alignment = {
      vertical: 'middle',
      horizontal: 'center'
    };
    exportLabelCell.border = {
      top: { style: 'medium', color: { argb: 'FF000000' } },
      left: { style: 'medium', color: { argb: 'FF000000' } },
      bottom: { style: 'medium', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    };
    const exportQtyCell = exportRow.getCell(7);
    exportQtyCell.value = exportQty;
    exportQtyCell.numFmt = '#,##0';
    exportQtyCell.font = { name: 'Arial', size: 11, bold: true };
    exportQtyCell.alignment = { vertical: 'middle', horizontal: 'right' };
    exportQtyCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFC7CE' }
    };
    exportQtyCell.border = {
      top: { style: 'medium', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'medium', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    };
    // Empty H for alignment
    const exportEmptyHCell = exportRow.getCell(8);
    exportEmptyHCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFC7CE' }
    };
    exportEmptyHCell.border = {
      top: { style: 'medium', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'medium', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    };
    const exportTotalCell = exportRow.getCell(9);
    exportTotalCell.value = exportTotal;
    exportTotalCell.numFmt = '#,##0" ₫"';
    exportTotalCell.font = {
      name: 'Arial',
      size: 11,
      bold: true
    };
    exportTotalCell.alignment = { vertical: 'middle', horizontal: 'right' };
    exportTotalCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFC7CE' }
    };
    exportTotalCell.border = {
      top: { style: 'medium', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'medium', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    };
    const exportEmptyJCell = exportRow.getCell(10);
    exportEmptyJCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFC7CE' }
    };
    exportEmptyJCell.border = {
      top: { style: 'medium', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'medium', color: { argb: 'FF000000' } },
      right: { style: 'medium', color: { argb: 'FF000000' } }
    };
    exportRow.height = 28;
    const adjustRowIndex = exportRowIndex + 1;
    const adjustRow = worksheet.getRow(adjustRowIndex);

    worksheet.mergeCells(`A${adjustRowIndex}:F${adjustRowIndex}`);
    const adjustLabelCell = adjustRow.getCell(1);
    adjustLabelCell.value = 'TỔNG ĐIỀU CHỈNH';
    adjustLabelCell.font = {
      name: 'Arial',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' }
    };
    adjustLabelCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF5B9BD5' }
    };
    adjustLabelCell.alignment = {
      vertical: 'middle',
      horizontal: 'center'
    };
    adjustLabelCell.border = {
      top: { style: 'medium', color: { argb: 'FF000000' } },
      left: { style: 'medium', color: { argb: 'FF000000' } },
      bottom: { style: 'medium', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    };
    const adjustQtyCell = adjustRow.getCell(7);
    adjustQtyCell.value = adjustQty;
    adjustQtyCell.numFmt = '#,##0';
    adjustQtyCell.font = { name: 'Arial', size: 11, bold: true };
    adjustQtyCell.alignment = { vertical: 'middle', horizontal: 'right' };
    adjustQtyCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9E1F2' }
    };
    adjustQtyCell.border = {
      top: { style: 'medium', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'medium', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    };
    // Empty H for alignment (removed merge H:I)
    const adjustEmptyHCell = adjustRow.getCell(8);
    adjustEmptyHCell.value = ''; // No note or merge
    adjustEmptyHCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF666666' } };
    adjustEmptyHCell.alignment = { vertical: 'middle', horizontal: 'center' };
    adjustEmptyHCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9E1F2' }
    };
    adjustEmptyHCell.border = {
      top: { style: 'medium', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'medium', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    };
    // Empty I (no total for adjust, or set to 0 if needed)
    const adjustEmptyICell = adjustRow.getCell(9);
    adjustEmptyICell.value = ''; // Or adjustTotal if you want to include
    adjustEmptyICell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9E1F2' }
    };
    adjustEmptyICell.border = {
      top: { style: 'medium', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'medium', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    };
    const adjustEmptyJCell = adjustRow.getCell(10);
    adjustEmptyJCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9E1F2' }
    };
    adjustEmptyJCell.border = {
      top: { style: 'medium', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'medium', color: { argb: 'FF000000' } },
      right: { style: 'medium', color: { argb: 'FF000000' } }
    };
    adjustRow.height = 28;
    const spacer2RowIndex = adjustRowIndex + 1;
    worksheet.getRow(spacer2RowIndex).height = 15;
    const grandTotalRowIndex = spacer2RowIndex + 1;
    const grandTotalRow = worksheet.getRow(grandTotalRowIndex);

    worksheet.mergeCells(`A${grandTotalRowIndex}:F${grandTotalRowIndex}`);
    const grandTotalLabelCell = grandTotalRow.getCell(1);
    grandTotalLabelCell.value = 'TỔNG CỘNG';
    grandTotalLabelCell.font = {
      name: 'Arial',
      size: 13,
      bold: true,
      color: { argb: 'FFFFFFFF' }
    };
    grandTotalLabelCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    grandTotalLabelCell.alignment = {
      vertical: 'middle',
      horizontal: 'center'
    };
    grandTotalLabelCell.border = {
      top: { style: 'thick', color: { argb: 'FF000000' } },
      left: { style: 'thick', color: { argb: 'FF000000' } },
      bottom: { style: 'thick', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    };
    const grandQtyCell = grandTotalRow.getCell(7);
    grandQtyCell.value = importQty + exportQty + adjustQty;
    grandQtyCell.numFmt = '#,##0';
    grandQtyCell.font = { name: 'Arial', size: 12, bold: true };
    grandQtyCell.alignment = { vertical: 'middle', horizontal: 'right' };
    grandQtyCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDCE6F1' }
    };
    grandQtyCell.border = {
      top: { style: 'thick', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thick', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    };
    // Empty H for alignment
    const grandEmptyHCell = grandTotalRow.getCell(8);
    grandEmptyHCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDCE6F1' }
    };
    grandEmptyHCell.border = {
      top: { style: 'thick', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thick', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    };
    const grandAmountCell = grandTotalRow.getCell(9);
    grandAmountCell.value = importTotal + exportTotal + adjustTotal; // Include adjustTotal for consistency
    grandAmountCell.numFmt = '#,##0" ₫"';
    grandAmountCell.font = {
      name: 'Arial',
      size: 13,
      bold: true,
      color: { argb: 'FFFF0000' }
    };
    grandAmountCell.alignment = { vertical: 'middle', horizontal: 'right' };
    grandAmountCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFFF00' }
    };
    grandAmountCell.border = {
      top: { style: 'thick', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thick', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    };
    const grandEmptyJCell = grandTotalRow.getCell(10);
    grandEmptyJCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDCE6F1' }
    };
    grandEmptyJCell.border = {
      top: { style: 'thick', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thick', color: { argb: 'FF000000' } },
      right: { style: 'thick', color: { argb: 'FF000000' } }
    };
    grandTotalRow.height = 32;
    worksheet.getColumn(1).width = 13;
    worksheet.getColumn(2).width = 20;
    worksheet.getColumn(3).width = 16;
    worksheet.getColumn(4).width = 11;
    worksheet.getColumn(7).width = 12;
    worksheet.getColumn(8).width = 15;
    worksheet.getColumn(10).width = 13;
    const autoFitColumns = [5, 6, 9];

    autoFitColumns.forEach(colIndex => {
      const column = worksheet.getColumn(colIndex);
      let maxLength = 0;

      column.eachCell({ includeEmpty: false }, (cell) => {
        let cellValue = '';

        if (cell.value) {
          if (typeof cell.value === 'object' && cell.value.richText) {
            cellValue = cell.value.richText.map(t => t.text).join('');
          } else if (typeof cell.value === 'object' && cell.value.formula) {
            cellValue = String(cell.value.result || '');
          } else {
            cellValue = String(cell.value);
          }

          const cellLength = cellValue.length;
          if (cellLength > maxLength) {
            maxLength = cellLength;
          }
        }
      });

      let minWidth, maxWidth, padding;
      if (colIndex === 5) { // SKU
        minWidth = 15;
        maxWidth = 50;
        padding = 4;
      } else if (colIndex === 6) { // Product
        minWidth = 30;
        maxWidth = 60;
        padding = 5;
      } else { // Thành tiền
        minWidth = 16;
        maxWidth = 22;
        padding = 4;
      }

      column.width = Math.min(Math.max(maxLength * 1.2 + padding, minWidth), maxWidth);
    });
    worksheet.views = [
      { state: 'frozen', xSplit: 0, ySplit: 4 }
    ];
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const fileName = `Bao_cao_nhap_xuat_${filterType === "month" ? `${selectedMonth}_${selectedYear}` : selectedStartDate.replace(/-/g, '_')+selectedEndDate.replace(/-/g, '_')}.xlsx`;
    saveAs(blob, fileName);
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex justify-center items-center z-[100] p-4">
      <div className="bg-white rounded-lg w-full max-w-[95vw] h-[95vh] shadow-2xl flex flex-col p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
          <h2 className="text-2xl font-bold text-gray-800">Danh sách phiếu nhập – xuất kho</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded transition"
          >
            ✖
          </button>
        </div>
        {/* Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          {/* Filter Controls */}
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200 flex-shrink-0">
            <div className="flex gap-6 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="month"
                  checked={filterType === "month"}
                  onChange={() => setFilterType("month")}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-gray-700 font-medium">Theo tháng</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="day"
                  checked={filterType === "day"}
                  onChange={() => setFilterType("day")}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-gray-700 font-medium">Theo ngày</span>
              </label>
            </div>
            <div className="flex gap-3 items-center">
              {filterType === "month" ? (
                <>
                  <input
                    type="number"
                    value={selectedMonth}
                    min={1}
                    max={12}
                    onChange={e => setSelectedMonth(Number(e.target.value))}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
                    placeholder="Tháng"
                  />
                  <input
                    type="number"
                    value={selectedYear}
                    min={2000}
                    max={2100}
                    onChange={e => setSelectedYear(Number(e.target.value))}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
                    placeholder="Năm"
                  />
                </>
              ) : (<>
                <input
                  type="date"
                  value={selectedStartDate}
                  onChange={e => setSelectedStartDate(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                -
                <input
                  type="date"
                  value={selectedEndDate}
                  onChange={e => setSelectedEndDate(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </>
              )}
              <button
                onClick={() => exportFile(transactions)}
                disabled={loading || !transactions.length}
                className="px-6 py-2 bg-green-600 text-white rounded font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition ml-auto"
              >
                {loading ? "Đang tải..." : "Xuất File"}
              </button>
            </div>
          </div>
          {/* Table */}
          <div className="overflow-auto shadow-md rounded-lg">
            <table className="min-w-full border-separate border-spacing-0 rounded-lg overflow-hidden text-sm">
              <thead className="bg-gray-200 text-gray-700 font-medium sticky top-0 z-10">
                <tr>
                  <th className="p-3 text-center border-b border-gray-300 whitespace-nowrap">Mã phiếu</th>
                  <th className="p-3 text-center border-b border-gray-300 whitespace-nowrap">Loại giao dịch</th>
                  <th className="p-3 text-center border-b border-gray-300 whitespace-nowrap">Mã kho</th>
                  <th className="p-3 text-center border-b border-gray-300 whitespace-nowrap">Sản phẩm</th>
                  <th className="p-3 text-center border-b border-gray-300 whitespace-nowrap">SKU</th>
                  <th className="p-3 text-center border-b border-gray-300 whitespace-nowrap">Số lượng</th>
                  <th className="p-3 text-center border-b border-gray-300 whitespace-nowrap">Giá</th>
                  <th className="p-3 text-center border-b border-gray-300 whitespace-nowrap">Tổng tiền</th>
                  <th className="p-3 text-center border-b border-gray-300 whitespace-nowrap">Người tạo</th>
                  <th className="p-3 text-center border-b border-gray-300 whitespace-nowrap">Ngày tạo</th>
                  <th className="p-3 text-center border-b border-gray-300 whitespace-nowrap">Ghi chú</th>
                  <th className="p-3 text-center border-b border-gray-300 whitespace-nowrap">Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={12} className="p-4 text-gray-500 text-center align-middle">
                      <div className="inline-flex gap-2 items-center justify-center">
                        <svg
                          className="animate-spin h-5 w-5 text-black"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                          ></path>
                        </svg>
                        Đang tải dữ liệu...
                      </div>
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="text-center p-4 text-gray-500">Không có giao dịch nào.</td>
                  </tr>
                ) : (
                  transactions.map(t => (
                    <tr key={t.id} className="hover:bg-gray-100 transition">
                      <td className="p-3 text-center border-b border-gray-200 whitespace-nowrap">{t.code}</td>
                      <td className={`p-3 text-center border-b border-gray-200 font-semibold whitespace-nowrap ${t.transactionType === "IMPORT" ? "text-green-600" :
                        t.transactionType === "EXPORT" ? "text-red-600" :
                          t.transactionType === "RESERVE" ? "text-blue-600" :
                            t.transactionType === "RELEASE" ? "text-yellow-600" :
                              "text-gray-600"
                        }`}>
                        {getTransactionTypeLabel(t.transactionType)}
                      </td>
                      <td className="p-3 text-center border-b border-gray-200 whitespace-nowrap">{t.warehouse?.code || "-"}</td>
                      <td className="p-3 text-center border-b border-gray-200 whitespace-nowrap">{t.variant?.name || "-"}</td>
                      <td className="p-3 text-center border-b border-gray-200 whitespace-nowrap">{t.variant?.sku || "-"}</td>
                      <td className="p-3 text-center border-b border-gray-200 whitespace-nowrap">{t.quantity}</td>
                      <td className="p-3 text-center border-b border-gray-200 whitespace-nowrap">{t.pricePerItem?.toLocaleString() || "-"}</td>
                      <td className="p-3 text-center border-b border-gray-200 font-semibold whitespace-nowrap">
                        {t.pricePerItem ? (t.quantity * t.pricePerItem)?.toLocaleString() : "-"}
                      </td>
                      <td className="p-3 text-center border-b border-gray-200 whitespace-nowrap">
                        {t.referenceType === "ORDER" ? "SP" + t.createdBy : "NV" + t.createdBy}
                      </td>
                      <td className="p-3 text-center border-b border-gray-200 whitespace-nowrap">
                        {new Date(t.createdAt).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="p-3 text-center border-b border-gray-200 max-w-[150px] truncate" title={t.note}>
                        {t.note || "-"}
                      </td>
                      <td className="p-4 text-center border-b border-gray-200">
                        <button
                          onClick={() => setSelectedTransaction(t)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded transition"
                        >
                          <FiEye></FiEye>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {selectedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 overflow-y-auto p-4">
          <div className="bg-white rounded shadow w-11/12 max-w-5xl p-10 relative my-10 max-h-[90vh] overflow-y-auto relative">
            {/* Header */}
            <div className="flex justify-between items-start mb-5">
              <div>
                <h3 className="text-3xl font-bold text-black mb-2">
                  Chi tiết phiếu
                </h3>
                <p className="text-xl text-gray-600 font-medium">{selectedTransaction.code}</p>
              </div>
              <button
                onClick={() => setSelectedTransaction(null)}
                className="text-gray-400 hover:text-black text-4xl font-light transition-colors leading-none absolute top-4 right-4"
              >
                ×
              </button>
            </div>
            {/* Status Badge */}
            <div className="mb-5 flex flex-wrap gap-2">
              {/** Status badge */}
              {(() => {
                const statusMap = {
                  PENDING: { label: "⏳ Đang xử lý", bg: "bg-yellow-100", text: "text-yellow-800" },
                  COMPLETED: { label: "✓ Hoàn tất", bg: "bg-green-100", text: "text-green-800" },
                  CANCELLED: { label: "✗ Đã hủy", bg: "bg-red-100", text: "text-red-800" },
                };
                const { label, bg, text } = statusMap[selectedTransaction.status] || { label: "Unknown", bg: "bg-gray-100", text: "text-gray-700" };
                return (
                  <span className={`inline-block px-4 py-1 rounded-full font-semibold ${bg} ${text} border border-gray-200`}>
                    {label}
                  </span>
                );
              })()}
              {/** Transaction type badge */}
              {(() => {
                const typeMap = {
                  IMPORT: { label: "📥 Nhập kho", bg: "bg-gray-100", text: "text-black" },
                  EXPORT: { label: "📤 Xuất kho", bg: "bg-gray-100", text: "text-black" },
                  RESERVE: { label: "🔒 Đặt giữ hàng", bg: "bg-gray-200", text: "text-gray-800" },
                  RELEASE: { label: "🔓 Hủy giữ hàng", bg: "bg-gray-200", text: "text-gray-800" },
                  ADJUST: { label: "⚙️ Điều chỉnh", bg: "bg-gray-100", text: "text-gray-700" },
                };
                const { label, bg, text } = typeMap[selectedTransaction.transactionType] || typeMap.ADJUST;
                return (
                  <span className={`inline-block px-4 py-1 rounded-full font-semibold ${bg} ${text} border border-gray-200`}>
                    {label}
                  </span>
                );
              })()}
            </div>
            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Transaction Info */}
              <div className="bg-gray-50 rounded p-6 space-y-4">
                <h4 className="text-lg font-bold text-black mb-4 pb-2 border-b-2 border-gray-300">Thông tin giao dịch</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600 font-medium">Kho</span>
                    <span className="text-black font-semibold">{selectedTransaction.warehouse?.code || "—"}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600 font-medium">SKU</span>
                    <span className="text-black font-semibold">{selectedTransaction.variant?.sku || "—"}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600 font-medium">Số lượng</span>
                    <span className="text-black font-bold text-lg">{selectedTransaction.quantity}</span>
                  </div>
                  {selectedTransaction.transactionType !== "RESERVE" && selectedTransaction.transactionType !== "RELEASE" && (
                    <>
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-gray-600 font-medium">Đơn giá</span>
                        <span className="text-black font-semibold">
                          {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(selectedTransaction.pricePerItem)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-3 mt-2">
                        <span className="text-black font-bold">Tổng tiền</span>
                        <span className="text-red-500 font-bold text-xl">
                          {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
                            selectedTransaction.pricePerItem * selectedTransaction.quantity
                          )}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
              {/* Right Column - Reference & Tracking Info */}
              <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                <h4 className="text-lg font-bold text-black mb-4 pb-2 border-b-2 border-gray-300">Thông tin theo dõi</h4>
                <div className="space-y-3">
                  {selectedTransaction.createdBy && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="text-gray-600 font-medium">Nhân viên tạo</span>
                      <span className="text-black font-semibold">{selectedTransaction.referenceType === "ORDER" ? "SP" : "NV"}{selectedTransaction.createdBy}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600 font-medium">Ngày tạo</span>
                    <span className="text-black font-semibold">{new Date(selectedTransaction.createdAt).toLocaleString("vi-VN")}</span>
                  </div>
                  {selectedTransaction.updatedBy && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="text-gray-600 font-medium">Nhân viên cập nhật</span>
                      <span className="text-black font-semibold">{selectedTransaction.referenceType === "ORDER" ? "SP" : "NV"}{selectedTransaction.updatedBy}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600 font-medium">Ngày cập nhật</span>
                    <span className="text-black font-semibold">{selectedTransaction.updatedAt ? new Date(selectedTransaction.updatedAt).toLocaleString("vi-VN") : "—"}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600 font-medium">Loại giao dịch</span>
                    <span className={`font-semibold px-4 py-2 rounded-full ${selectedTransaction.referenceType === "PURCHASE_ORDER" ? "bg-blue-500 text-white" :
                      selectedTransaction.referenceType === "ORDER" ? "bg-rose-500 text-white" :
                        "text-black"
                      }`}>
                      {selectedTransaction.referenceType === "PURCHASE_ORDER" ? "Đơn mua" :
                        selectedTransaction.referenceType === "ORDER" ? "Đơn bán" : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600 font-medium">Mã giao dịch</span>
                    <span className="text-black font-semibold">{selectedTransaction.referenceCode || "—"}</span>
                  </div>
                </div>
              </div>
            </div>
            {/* Note Section */}
            {selectedTransaction.note && (
              <div className="mt-5 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg p-6">
                <h4 className="text-sm font-bold text-yellow-800 mb-2 uppercase tracking-wide">Ghi chú</h4>
                <p className="text-gray-800 leading-relaxed">{selectedTransaction.note}</p>
              </div>
            )}
            {/* Action Button */}
            <div className="flex justify-end mt-5 pt-6 border-t-2 border-gray-200">
              <button
                onClick={() => setSelectedTransaction(null)}
                className="px-10 py-3 bg-black text-white rounded hover:bg-gray-800 transition-all font-semibold text-lg shadow-lg hover:shadow-xl"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryTransactionExportFileModal;