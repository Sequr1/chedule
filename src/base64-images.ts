// Base64 encoded background images for reliable html2canvas capture
// These are compressed versions optimized for embedding

// Vertical background (9:16) - compressed
export const BG_VERTICAL_BASE64 = `/images/luxury-background.jpg`;

// Horizontal background (16:9) - compressed  
export const BG_HORIZONTAL_BASE64 = `/images/bg-horizontal.jpg`;

// Helper to get image as data URL
export const getImageDataUrl = async (imagePath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } else {
        reject(new Error('Could not get canvas context'));
      }
    };
    img.onerror = reject;
    img.src = imagePath;
  });
};
