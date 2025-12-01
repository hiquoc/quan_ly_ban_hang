import React, { useState, useEffect } from "react";
import { getInventoryQuantityChangesForReport } from "../../../apis/inventoryApi";
import html2pdf from 'html2pdf.js';

const InventoryExportFileModal = ({ warehouseId, onClose, showPopup }) => {
  const [data, setData] = useState([]);
  const [filterType, setFilterType] = useState("month");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedStartDate, setSelectedStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedEndDate, setSelectedEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);

  const handleLoadData = async () => {
    setLoading(true);
    try {
      let start, end;
      if (filterType === "month") {
        start = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
        end = new Date(selectedYear, selectedMonth, 0).toISOString().slice(0, 10);
      } else {
        start = selectedStartDate;
        end = selectedEndDate;
      }
      const res = await getInventoryQuantityChangesForReport(start, end, warehouseId);
      if (res?.error) {
        showPopup(res.error || "Lỗi khi lấy dữ liệu!");
        setData([]);
      } else {
        setData(res.data || []);
      }
      console.log(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleLoadData();
  }, [filterType, selectedMonth, selectedYear, selectedStartDate, selectedEndDate, warehouseId]);

  const exportFile = async (inventoryData) => {
    if (!inventoryData || !inventoryData.length) {
      alert("Không có dữ liệu để xuất!");
      return;
    }

    // Tính top imports/exports
    const topImports = [...inventoryData]
      .filter(item => item.totalImport > 0)
      .sort((a, b) => b.totalImport - a.totalImport)
      .slice(0, 5);

    const topExports = [...inventoryData]
      .filter(item => item.totalExport > 0)
      .sort((a, b) => b.totalExport - a.totalExport)
      .slice(0, 5);

    const timeText = `Thời gian: ${filterType === "month" ? `Tháng ${selectedMonth}/${selectedYear}` : `Từ ${new Date(selectedStartDate).toLocaleDateString('vi-VN')} đến ${new Date(selectedEndDate).toLocaleDateString('vi-VN')}`}`;

    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
    overlay.style.zIndex = '99999';
    overlay.style.overflow = 'auto';
    overlay.style.padding = '20px';

    const container = document.createElement('div');
    container.style.width = '1000px';
    container.style.maxWidth = '1000px';
    container.style.margin = '0 auto';
    container.style.background = 'white';
    container.style.padding = '20px';
    container.style.fontFamily = 'Arial, sans-serif';
    container.style.minHeight = '100px';

    container.id = 'pdf-container';

    container.innerHTML = `
  <style>
    /* target only this container to avoid affecting other page styles */
    #pdf-container table { width: 100%; border-collapse: collapse; }
    #pdf-container table th,
    #pdf-container table td {
      padding: 8px;
      border: 1px solid #DDD;
      text-align: center !important;  /* horizontal centering */
      vertical-align: middle !important;  /* vertical centering - ADD THIS */
      word-wrap: break-word;  /* allow wrapping - ADD THIS */
    }
    /* Remove all the flex/div rules - they cause the issue */
    /* keep header colors as before (example) */
    #pdf-container thead tr { background-color: #70AD47; color: white; }
    /* ensure table header repeats on page breaks in html2pdf */
    #pdf-container thead { display: table-header-group; }
    #pdf-container tbody { display: table-row-group; }
  </style>

  <h1 style="text-align: center; font-size: 24px; margin: 0 0 10px 0; color: #1F4E79;">BÁO CÁO TỒN KHO</h1>
  <p style="text-align: center; font-size: 14px; font-style: italic; margin: 0 0 30px 0; color: #1F4E79;">${timeText}</p>

  <table style="margin-bottom: 30px; font-size: 10px; page-break-inside: auto;">
    <thead>
      <tr style="background-color: #70AD47; color: white;">
        <th><div>Kho</div></th>
        <th><div>SKU</div></th>
        <th><div>Tên sản phẩm</div></th>
        <th><div>Tồn đầu kỳ</div></th>
        <th><div>Tồn cuối kỳ</div></th>
        <th><div>Tổng nhập</div></th>
        <th><div>Tổng xuất</div></th>
        <th><div>Tổng điều chỉnh</div></th>
      </tr>
    </thead>
    <tbody>
      ${inventoryData.map((item, index) => `
    <tr style="background-color: ${index % 2 === 0 ? '#F2F2F2' : 'white'}; page-break-inside: avoid;">
      <td>${item.warehouseCode || '-'}</td>  <!-- Remove <div> -->
      <td>${item.sku || '-'}</td>  <!-- Remove <div> -->
      <td style="max-width:200px;">${item.name || '-'}</td>  <!-- Remove <div>, keep max-width on td -->
      <td>${item.from ?? 0}</td>  <!-- Remove <div> -->
      <td>${item.to ?? 0}</td>  <!-- Remove <div> -->
      <td>${item.totalImport ?? 0}</td>  <!-- Remove <div> -->
      <td>${item.totalExport ?? 0}</td>  <!-- Remove <div> -->
      <td>${item.totalAdjust ?? 0}</td>  <!-- Remove <div> -->
    </tr>
  `).join('')}
    </tbody>
  </table>

  ${topImports.length > 0 ? `
    <h2 style="font-size: 16px; font-weight: bold; margin: 20px 0 10px 0; color: #006100;">Sản phẩm nhập kho nhiều nhất (Top 5)</h2>
    <table style="margin-bottom: 20px; font-size: 10px; page-break-inside: auto;">
      <thead>
        <tr style="background-color: #C6EFCE; color: #006100;">
          <th><div>Tên sản phẩm</div></th>
          <th><div>SKU</div></th>
          <th><div>Số lượng nhập</div></th>
        </tr>
      </thead>
      <tbody>
        ${topImports.map((item, idx) => `
          <tr style="background-color: ${idx % 2 === 0 ? '#F2F2F2' : 'white'}; page-break-inside: avoid;">
            <td style="max-width:200px;">${item.name || '-'}</td>  <!-- Remove <div> -->
            <td>${item.sku}</td>  <!-- Remove <div> -->
            <td>${item.totalImport}</td>  <!-- Remove <div> -->
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : ''}

  ${topExports.length > 0 ? `
    <h2 style="font-size: 16px; font-weight: bold; margin: 20px 0 10px 0; color: #9C0006;">Sản phẩm xuất kho nhiều nhất (Top 5)</h2>
    <table style="margin-bottom: 20px; font-size: 10px; page-break-inside: auto;">
      <thead>
        <tr style="background-color: #FFC7CE; color: #9C0006;">
          <th><div>Tên sản phẩm</div></th>
          <th><div>SKU</div></th>
          <th><div>Số lượng xuất</div></th>
        </tr>
      </thead>
      <tbody>
        ${topExports.map((item, idx) => `
          <tr style="background-color: ${idx % 2 === 0 ? '#F2F2F2' : 'white'}; page-break-inside: avoid;">
            <td style="max-width:200px;">${item.name || '-'}</td>  <!-- Remove <div> -->
            <td>${item.sku}</td>  <!-- Remove <div> -->
            <td>${item.totalExport}</td>  <!-- Remove <div> -->
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : ''}
`;


    overlay.appendChild(container);
    document.body.appendChild(overlay);

    await new Promise(resolve => setTimeout(resolve, 300));

    // console.log('Container height:', container.offsetHeight, container.scrollHeight);

    const fileName = `Bao_cao_ton_kho_${filterType === "month" ? `${selectedMonth}_${selectedYear}` : selectedStartDate?.replace(/-/g, '_') + '_' + selectedEndDate?.replace(/-/g, '_')}.pdf`;

    const opt = {
      margin: 10,
      filename: fileName,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        logging: true,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'landscape'
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    try {
      await html2pdf().set(opt).from(container).save();
      // console.log('PDF exported successfully');
    } catch (err) {
      console.error('Export PDF error:', err);
      alert('Lỗi xuất PDF: ' + (err.message || 'Thử lại!'));
    } finally {
      if (document.body.contains(overlay)) {
        document.body.removeChild(overlay);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex justify-center items-center z-[100] p-4">
      <div className="bg-white rounded-lg w-full max-w-[95vw] h-[95vh] shadow-2xl flex flex-col p-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
          <h2 className="text-2xl font-bold text-gray-800">Báo cáo tồn kho</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded transition"
          >
            ✖
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
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
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="year"
                  checked={filterType === "year"}
                  onChange={() => setFilterType("year")}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-gray-700 font-medium">Theo năm</span>
              </label>
            </div>

            <div className="flex gap-3 items-center">
              {filterType === "month" && (
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
              )}

              {filterType === "day" && (
                <>
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

              {filterType === "year" && (
                <input
                  type="number"
                  value={new Date(selectedStartDate).getFullYear()}
                  min={2000}
                  max={2100}
                  onChange={e => {
                    const year = Number(e.target.value);
                    setSelectedStartDate(`${year}-01-01`);
                    setSelectedEndDate(`${year}-12-31`);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
                  placeholder="Năm"
                />
              )}

              <button
                onClick={() => exportFile(data)}
                disabled={loading || !data.length}
                className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition ml-auto"
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
                  <th className="p-3 text-center border-b border-gray-300 whitespace-nowrap">Mã kho</th>
                  <th className="p-3 text-center border-b border-gray-300 whitespace-nowrap">Mã SKU</th>
                  <th className="p-3 text-center border-b border-gray-300 whitespace-nowrap">Tên biến thể</th>
                  <th className="p-3 text-center border-b border-gray-300 whitespace-nowrap">Tồn đầu kỳ</th>
                  <th className="p-3 text-center border-b border-gray-300 whitespace-nowrap">Nhập trong kỳ</th>
                  <th className="p-3 text-center border-b border-gray-300 whitespace-nowrap">Xuất trong kỳ</th>
                  <th className="p-3 text-center border-b border-gray-300 whitespace-nowrap">Điều chỉnh trong kỳ</th>
                  <th className="p-3 text-center border-b border-gray-300 whitespace-nowrap">Tồn cuối kỳ</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-4 text-gray-500 text-center align-middle">
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
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center p-4 text-gray-500">Không có giao dịch nào.</td>
                  </tr>
                ) : (
                  data.map(d => (
                    <tr key={d.sku} className="hover:bg-gray-100 transition">
                      <td className="p-3 text-center border-b border-gray-200 whitespace-nowrap">{d.warehouseCode || '-'}</td>
                      <td className="p-3 text-center border-b border-gray-200 whitespace-nowrap">{d.sku}</td>
                      <td className="p-3 text-center border-b border-gray-200 whitespace-nowrap">{d.name || "-"}</td>
                      <td className="p-3 text-center border-b border-gray-200 whitespace-nowrap">{d.from || 0}</td>
                      <td className="p-3 text-center border-b border-gray-200 whitespace-nowrap">{d.totalImport || 0}</td>
                      <td className="p-3 text-center border-b border-gray-200 whitespace-nowrap">{d.totalExport || 0}</td>
                      <td className="p-3 text-center border-b border-gray-200 whitespace-nowrap">{d.totalAdjust || 0}</td>
                      <td className="p-3 text-center border-b border-gray-200 whitespace-nowrap">{d.to || 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryExportFileModal;