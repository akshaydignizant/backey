export const generateLowStockEmailHtml = (workspaceId: number, totalLowStock: number, variants: any[]) => {
  const itemsList = variants.map(item => {
    return `
            <tr>
                <td>${item.product.name}</td>
                <td>${item.title}</td>
                <td>${item.sku}</td>
                <td>${item.stock}</td>
                <td>${item.price}</td>
                <td>${item.size || 'N/A'}</td>
            </tr>
        `;
  }).join('');

  return `
        <html>
        <body>
            <h2>Low Stock Alert</h2>
            <p><strong>Workspace:</strong> ${workspaceId}</p>
            <p><strong>Total Items with Low Stock:</strong> ${totalLowStock}</p>
            <table border="1">
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>Variant</th>
                        <th>SKU</th>
                        <th>Stock</th>
                        <th>Price</th>
                        <th>Size</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsList}
                </tbody>
            </table>
        </body>
        </html>
    `;
};
