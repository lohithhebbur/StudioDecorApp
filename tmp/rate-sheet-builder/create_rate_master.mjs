import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const workspace = process.argv[2];
const outputPath = path.join(workspace, "Painting System Rate Master.xlsx");
const previewPath = path.join(workspace, "tmp", "rate-sheet-builder", "rate-master-preview.png");

const workbook = Workbook.create();
const sheet = workbook.worksheets.add("Rate Master");
sheet.showGridLines = false;
sheet.freezePanes.freezeRows(5);

sheet.getRange("A1:G1").merge();
sheet.getRange("A1").values = [["Decor My Nest - Painting System Rate Master"]];
sheet.getRange("A1:G1").format = {
  fill: "#1D4A35",
  font: { bold: true, color: "#FFFFFF", size: 17 },
  verticalAlignment: "center",
};
sheet.getRange("A1:G1").format.rowHeight = 34;

sheet.getRange("A2:G2").merge();
sheet.getRange("A2").values = [["Enter and maintain your own products, painting types, systems, and rates. Save the live CSV sheet to update the app automatically."]];
sheet.getRange("A2:G2").format = {
  fill: "#EAF1EB",
  font: { color: "#365341", italic: true, size: 10 },
  wrapText: true,
  verticalAlignment: "center",
};
sheet.getRange("A2:G2").format.rowHeight = 32;

sheet.getRange("A4:G4").values = [[
  "Product",
  "Painting Type",
  "Painting System",
  "Surface / Substrate",
  "Rate per Sq Ft",
  "Active",
  "Last Updated",
]];
sheet.getRange("A4:G4").format = {
  fill: "#C8EC78",
  font: { bold: true, color: "#1B3325" },
  borders: { preset: "outside", style: "thin", color: "#91A685" },
  verticalAlignment: "center",
  wrapText: true,
};
sheet.getRange("A4:G4").format.rowHeight = 29;

const blankRows = Array.from({ length: 100 }, () => ["", "", "", "", null, "Yes", null]);
sheet.getRange("A5:G104").values = blankRows;
sheet.getRange("A5:G104").format = {
  borders: { insideHorizontal: { style: "thin", color: "#E3E7E2" } },
  verticalAlignment: "center",
};
sheet.getRange("E5:E104").format.numberFormat = '₹#,##0.00';
sheet.getRange("G5:G104").format.numberFormat = "yyyy-mm-dd";
sheet.getRange("B5:B104").dataValidation = {
  rule: { type: "list", values: ["Fresh / Full Painting", "Repainting", "Special Finish"] },
};
sheet.getRange("F5:F104").dataValidation = {
  rule: { type: "list", values: ["Yes", "No"] },
};

sheet.getRange("A:A").format.columnWidth = 24;
sheet.getRange("B:B").format.columnWidth = 22;
sheet.getRange("C:C").format.columnWidth = 34;
sheet.getRange("D:D").format.columnWidth = 25;
sheet.getRange("E:E").format.columnWidth = 16;
sheet.getRange("F:F").format.columnWidth = 11;
sheet.getRange("G:G").format.columnWidth = 16;

const table = sheet.tables.add("A4:G104", true, "PaintingSystemRateMaster");
table.style = "TableStyleMedium4";
table.showBandedRows = true;
table.showFilterButton = true;

const inspect = await workbook.inspect({
  kind: "table",
  range: "'Rate Master'!A1:G10",
  include: "values,formulas",
  tableMaxRows: 10,
  tableMaxCols: 7,
});
console.log(inspect.ndjson);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "final formula error scan",
});
console.log(errors.ndjson);

const preview = await workbook.render({ sheetName: "Rate Master", range: "A1:G14", scale: 1.5, format: "png" });
await fs.writeFile(previewPath, new Uint8Array(await preview.arrayBuffer()));

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(outputPath);
