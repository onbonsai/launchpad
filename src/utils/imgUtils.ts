export const overlayImage = async (base64Image: string, overlayUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");

    const img = new Image();
    img.onload = () => {
      ctx?.drawImage(img, 0, 0);

      const overlayImg = new Image();
      overlayImg.onload = () => {
        ctx?.drawImage(overlayImg, 0, 0);
        const overlaidImage = canvas.toDataURL("image/png");
        resolve(overlaidImage);
      };
      overlayImg.onerror = reject;
      overlayImg.src = overlayUrl;
    };
    img.onerror = reject;
    img.src = base64Image;
  });
};
