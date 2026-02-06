export interface ReceiptItem {
  id: string;
  name: string;
  price: number;
}

export interface Receipt {
  store: string | null;
  date: string | null;
  items: ReceiptItem[];
  tax: number;
  total: number;
}
