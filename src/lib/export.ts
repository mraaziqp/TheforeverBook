export async function exportToPDF(pages: any[]) {
  const [{ default: jsPDF }, fabric] = await Promise.all([
    import('jspdf'),
    import('fabric')
  ]);
  // Constants for 300 DPI Print
  const DPI = 300;
  const PAGE_WIDTH_IN = 11;
  const PAGE_HEIGHT_IN = 8.5;
  const SPREAD_WIDTH_IN = PAGE_WIDTH_IN * 2;
  
  const WIDTH_PX_300 = SPREAD_WIDTH_IN * DPI;
  const HEIGHT_PX_300 = PAGE_HEIGHT_IN * DPI;

  // Scale factor from screen (72 DPI) to Print (300 DPI)
  const SCALE_FACTOR = DPI / 72;

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'in',
    format: [SPREAD_WIDTH_IN, PAGE_HEIGHT_IN]
  });

  const tempCanvasElement = document.createElement('canvas');
  tempCanvasElement.width = WIDTH_PX_300;
  tempCanvasElement.height = HEIGHT_PX_300;
  
  const tempCanvas = new fabric.StaticCanvas(tempCanvasElement, {
    width: WIDTH_PX_300,
    height: HEIGHT_PX_300,
    backgroundColor: '#ffffff'
  });

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const rawPageData = page.canvasData;
    let pageData;
    
    try {
      if (!rawPageData || (typeof rawPageData === 'string' && rawPageData.includes('[object Object]'))) {
        pageData = { objects: [] };
      } else if (typeof rawPageData === 'string') {
        pageData = JSON.parse(rawPageData);
      } else {
        pageData = rawPageData;
      }
    } catch (err) {
      console.error("Failed to parse page data during export:", err);
      pageData = { objects: [] };
    }
    
    // Calculate dimensions for this specific sheet
    const isCover = page.type === 'cover';
    const spineWidthIn = isCover ? 0.5 : 0;
    const currentSpreadWidthIn = (PAGE_WIDTH_IN * 2) + spineWidthIn;
    const currentWidthPx = currentSpreadWidthIn * DPI;
    const currentHeightPx = PAGE_HEIGHT_IN * DPI;

    tempCanvas.setDimensions({ width: currentWidthPx, height: currentHeightPx });
    
    // Filter out guides for clean print
    const cleanObjects = pageData.objects.filter((obj: any) => !obj.isGuide);
    
    await tempCanvas.loadFromJSON({ ...pageData, objects: cleanObjects });
    
    // Scale all objects to 300 DPI resolution
    tempCanvas.getObjects().forEach(obj => {
      obj.scaleX = (obj.scaleX || 1) * SCALE_FACTOR;
      obj.scaleY = (obj.scaleY || 1) * SCALE_FACTOR;
      obj.left = (obj.left || 0) * SCALE_FACTOR;
      obj.top = (obj.top || 0) * SCALE_FACTOR;
      obj.setCoords();
    });

    tempCanvas.renderAll();

    const imgData = tempCanvas.toDataURL({
      format: 'jpeg',
      quality: 1,
      multiplier: 1 
    });

    if (i > 0) {
      pdf.addPage([currentSpreadWidthIn, PAGE_HEIGHT_IN], 'landscape');
    }
    pdf.addImage(imgData, 'JPEG', 0, 0, currentSpreadWidthIn, PAGE_HEIGHT_IN);
    
    tempCanvas.clear();
  }

  pdf.save('the-forever-book-300dpi.pdf');
  tempCanvas.dispose();
}
