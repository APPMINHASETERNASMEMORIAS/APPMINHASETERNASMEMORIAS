export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => {
      console.error('Error loading image for cropping:', error);
      reject(new Error('Falha ao carregar imagem para recorte'));
    });
    if (!url.startsWith('blob:')) {
      image.setAttribute('crossOrigin', 'anonymous');
    }
    image.src = url;
  });

export function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180;
}

/**
 * Returns the new bounding area of a rotated rectangle.
 */
export function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = getRadianAngle(rotation);

  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

/**
 * This function was adapted from the one in the react-easy-crop introduction example
 */
export default async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  rotation = 0,
  flip = { horizontal: false, vertical: false }
): Promise<Blob | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Não foi possível obter o contexto do canvas');
  }

  const rotRad = getRadianAngle(rotation);

  // calculate bounding box of the rotated image
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    image.width,
    image.height,
    rotation
  );

  // set canvas size to match the desired crop size
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // Validate pixelCrop dimensions
  if (pixelCrop.width <= 0 || pixelCrop.height <= 0) {
    throw new Error('Dimensões de recorte inválidas');
  }

  // Draw the image directly into the canvas with the correct transforms
  // This avoids creating a large intermediate canvas and using getImageData/putImageData
  // which can cause memory issues on mobile devices.

  // 1. Move the crop origin to (0,0)
  ctx.translate(-pixelCrop.x, -pixelCrop.y);

  // 2. Move to the center of the rotated image (which is the center of the bounding box)
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);

  // 3. Rotate the image
  ctx.rotate(rotRad);

  // 4. Scale/Flip if needed
  ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);

  // 5. Draw the image centered
  ctx.translate(-image.width / 2, -image.height / 2);
  ctx.drawImage(image, 0, 0);

  // As a blob
  return new Promise((resolve, reject) => {
    canvas.toBlob((file) => {
      if (file) {
        resolve(file);
      } else {
        reject(new Error('Falha ao gerar o arquivo de imagem (Blob)'));
      }
    }, 'image/jpeg', 0.95);
  });
}
