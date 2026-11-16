import json
import pandas as pd

df = pd.read_excel("Master_Item_Selling-23_Cleaned.xlsx", dtype={"SKU": str})

products = {
    row["SKU"].strip(): {
        "sku": row["SKU"].strip(),
        "item_description": str(row["Item Description"]).strip(),
        "unit_price": round(float(row["Unit Price"]), 2),
    }
    for _, row in df.iterrows()
}

with open("products.json", "w", encoding="utf-8") as f:
    json.dump({"products": products}, f, indent=2, ensure_ascii=False)

print(f"Ready: {len(products)} items saved to products.json")
