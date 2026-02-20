declare module "exceljs" {
  export class Workbook {
    constructor();
    addWorksheet(name: string, options?: { headerFooter?: { firstHeader?: string; firstFooter?: string } }): Worksheet;
    xlsx: { writeBuffer(): Promise<ArrayBuffer> };
  }
  export interface Worksheet {
    addRow(data: readonly (string | number)[]): unknown;
    getColumn(index: number): Column;
  }
  export interface Column {
    width: number;
  }
}
