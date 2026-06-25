$content = Get-Content Viewseller.tsx -Raw

# Add state variables
$stateVars = @"

  const [productsCsvContent, setProductsCsvContent] = useState<string>('');
  const [ordersCsvContent, setOrdersCsvContent] = useState<string>('');
  const [csvLoading, setCsvLoading] = useState(false);
"@
$content = $content -replace '(const \[ordersExportModal, setOrdersExportModal\] = useState\(false\);)', "`$1$stateVars"

# Add handler functions
$handlers = @"

  const handleExportProductsCsv = async () => {
    const sellerId = Number(params.sellerId);
    if (!sellerId || Number.isNaN(sellerId)) return;
    try {
      setCsvLoading(true);
      const csv = await exportSellerProductsCsv(sellerId);
      setProductsCsvContent(csv);
      setProductsExportModal(true);
    } catch (e) {
      alert(getApiErrorMessage(e));
    } finally {
      setCsvLoading(false);
    }
  };

  const handleExportOrdersCsv = async () => {
    const sellerId = Number(params.sellerId);
    if (!sellerId || Number.isNaN(sellerId)) return;
    try {
      setCsvLoading(true);
      const csv = await exportSellerOrdersCsv(sellerId);
      setOrdersCsvContent(csv);
      setOrdersExportModal(true);
    } catch (e) {
      alert(getApiErrorMessage(e));
    } finally {
      setCsvLoading(false);
    }
  };
"@
$content = $content -replace '(  const openDoc = \(name: string, url\?: string, path\?: string\) => \{[\s\S]*?setDocModalVisible\(true\);\s*\};)', "`$1$handlers"

# Update button handlers
$content = $content -replace 'onPress=\(\(\) => setProductsExportModal\(true\)\)', 'onPress={handleExportProductsCsv} disabled={csvLoading}'
$content = $content -replace 'onPress=\(\(\) => setOrdersExportModal\(true\)\)', 'onPress={handleExportOrdersCsv} disabled={csvLoading}'

# Update modal content
$content = $content -replace "content='263,.*?'\)", 'content={productsCsvContent}'
$content = $content -replace "content='\"Order Status.*?'\)", 'content={ordersCsvContent}'

Set-Content Viewseller.tsx $content
