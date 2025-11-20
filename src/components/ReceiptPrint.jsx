import React from "react";

export const printReceipt = (order) => {
  const win = window.open("", "PRINT", "height=600,width=800");

  win.document.write(`
    <html>
    <head>
      <title>Order Receipt</title>
      <style>
        body { font-family: Arial; padding: 20px; }
        h2 { text-align: center; }
        .row { margin-bottom: 8px; }
        .label { font-weight: bold; }
      </style>
    </head>
    <body>
      <h2>Order Receipt</h2>
      ${Object.entries(order)
        .map(
          ([k, v]) =>
            `<div class="row"><span class="label">${k}:</span> ${String(
              v
            )}</div>`
        )
        .join("")}
    </body>
    </html>
  `);

  win.document.close();
  win.focus();
  win.print();
  win.close();
};
