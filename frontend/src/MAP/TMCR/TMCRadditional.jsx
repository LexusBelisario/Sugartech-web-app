import React from "react";

const formatWithUnderline = (text, extraSpace = 10) => {
  const minWidth = text.length * 10 + extraSpace;
  return (
    <span
      style={{
        display: "inline-block",
        borderBottom: "1px solid black",
        lineHeight: "1.5em",
        minWidth: `${minWidth}px`,
      }}
    >
      {text}
    </span>
  );
};

const openPrintWindow = ({ barangay, section, province, municipal, tableRows }) => {
  const printWindow = window.open("", "_blank");

  const generateTableRows = () => {
    return tableRows
      .map(
        (row) => `
      <tr> 
        <td>${row.parcel || ""}</td>
        <td>${row.survey_lot_no || ""}</td>
        <td>${row.title_no || ""}</td>
        <td>${row.area || ""}</td>
        <td>${row.class_code || ""}</td>
        <td>${row.owner_name || ""}</td>
        <td>${row.arp_no || ""}</td>
        <td>${row.tdno || ""}</td>
        <td>${row.bldg || ""}</td>
        <td>${row.elevmap || ""}</td>
        <td>${row.province || ""}</td>
        <td>${row.pin || ""}</td>
      </tr>`
      )
      .join("");
  };

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>TMCR Table Preview</title>
      <style>
        body {
          font-family: "Times New Roman", Times, serif;
          margin: 0;
          padding: 0;
          font-weight: bold;
         
        }
        .container { padding: 20px; position: relative; }
        .print-button {
          position: absolute; top: 20px; right: 20px;
          padding: 10px 15px; background-color: #4CAF50;
          color: white; border: none; cursor: pointer; font-size: 16px; font-weight: bold;
        }
        .print-button:hover { background-color: #45a049; }
        table {
          width: 100%; border-collapse: collapse; margin-top: 30px;
        }
        th, td {
          border: 1px solid #ddd; padding: 8px; text-align: center;
          font-size: 14px; font-family: "Times New Roman"; font-weight: bold;
        }
        th { background-color: #f2f2f2; }
        @media print { .print-button { display: none; } }
        .additional-info { margin-top: 10px; text-align: center; }
        .additional-info div { margin-bottom: 0px; font-size: 20px; font-weight: normal; }
        .left-right { display: flex; justify-content: space-between; margin-bottom: 10px; }
        .left-right div { width: 48%; }
      </style>
    </head>
    <body>
      <div class="container">
        <button class="print-button" onclick="window.print()">PRINT</button>
        <div class="header">
          <h1 style="text-align: center;">TAX MAP CONTROL ROLL</h1>
        </div>
        <div class="additional-info">
          <div><span>Prov./City: ${province}</span></div>
          <div><span>Mun./District: ${municipal}</span></div>
          <br>
          <div class="left-right">
            <div><span>Barangay: ${barangay}</span></div>
            <div><span>Section Index No.: ${section}</span></div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th rowspan="2">Parcel / LOT NO.</th>
              <th rowspan="2">SURVEY LOT NO.</th>
              <th colspan="3">LAND</th>
              <th rowspan="2">NAME OF OWNER</th>
              <th rowspan="2">ARP NO.</th>
              <th rowspan="2">TD NO.</th>
              <th rowspan="2">BLDG. / <br> STRUCTURE</th>
              <th rowspan="2">MACHINERY</th>
              <th rowspan="2">OTHER (Identity)</th>
              <th rowspan="2">REMARKS</th>
            </tr>
            <tr>
              <th>TITLE NO.</th>
              <th>AREA</th> 
              <th>CLASS CODE</th>
            </tr>
          </thead>
          <tbody>
            ${generateTableRows()}
          </tbody>
        </table>
      </div>
    </body>
    </html>
  `);

  printWindow.document.close();
};

// ✅ Main TMCR Report Component
const TMCRReport = ({ tableRows = [] }) => {
  const first = tableRows[0] || {};
  const province = first.province || "";
  const municipal = first.municipal || "";
  const barangay = first.barangay || "";
  const section = first.section || "";

  return (
    <div
      style={{
        padding: "20px",
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
      }}
    >
      {/* Header Info (Auto from first row) */}
      <div style={{ marginBottom: "20px" }}>
        <div>Prov./City: {formatWithUnderline(province, 90)}</div>
        <div>Mun./District: {formatWithUnderline(municipal, 80)}</div>
        <div>Barangay: {formatWithUnderline(barangay, 150)}</div>
        <div>Section Index No.: {formatWithUnderline(section, 50)}</div>
      </div>

      {/* Print Button */}
      <button
        onClick={() =>
          openPrintWindow({ barangay, section, province, municipal, tableRows })
        }
        style={{
          marginBottom: "20px",
          padding: "10px 15px",
          backgroundColor: "black",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
          fontWeight: "bold",
        }}
      >
      Print Preview
      </button>

      {/* Data Table Preview */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "12px",
           backgroundColor: "#f9f9f9",
        }}
      >
        <thead>
          <tr>
            <th>PIN</th>
            <th>Province</th>
            <th>Parcel</th>
            <th>Building Area</th>
            <th>Extent</th>
            <th>Basic Integer</th>
            <th>Value</th>
            <th>Payment Type</th>
            <th>Land ARPN</th>
            <th>OR Date</th>
            <th>Class</th>
            <th>Pay Period</th>
            
          </tr>
        </thead>
        <tbody>
          {tableRows.length > 0 ? (
            tableRows.map((row, index) => (
              <tr key={index}>
                <td style={{ border: "1px solid #ccc", padding: "4px" }}>{row.pin}</td>
                <td style={{ border: "1px solid #ccc", padding: "4px" }}>{row.province}</td>
                <td style={{ border: "1px solid #ccc", padding: "4px" }}>{row.parcel}</td>
                <td style={{ border: "1px solid #ccc", padding: "4px" }}>{row.bldg_area}</td>
                <td style={{ border: "1px solid #ccc", padding: "4px" }}>{row.extent}</td>
                <td style={{ border: "1px solid #ccc", padding: "4px" }}>{row.basic_int}</td>
                <td style={{ border: "1px solid #ccc", padding: "4px" }}>{row.value}</td>
                <td style={{ border: "1px solid #ccc", padding: "4px" }}>{row.paymt_type}</td>
                <td style={{ border: "1px solid #ccc", padding: "4px" }}>{row.land_arpn}</td>
                <td style={{ border: "1px solid #ccc", padding: "4px" }}>{row.or_date}</td>
                <td style={{ border: "1px solid #ccc", padding: "4px" }}>{row.class_bir}</td>
                <td style={{ border: "1px solid #ccc", padding: "4px" }}>{row.pay_period}</td>
                
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="12" style={{ textAlign: "center", padding: "10px" }}>
                No data available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TMCRReport;
