import axios from "axios";
import sharp from "sharp";

const base64Prefix = "data:image/webp;base64,";

export const overlayImage = async (base64Image: string, overlayUrl: string): Promise<string> => {
  if (!base64Image.startsWith(base64Prefix)) base64Image = `${base64Prefix}${base64Image}`;

  // Convert base64 images to buffers
  const imageBuffer = Buffer.from(base64Image.split(",")[1], "base64");
  const overlayBuffer = Buffer.from(overlayUrl.split(",")[1], "base64");

  // Use sharp to overlay the watermark image onto the base image
  const outputBuffer = await sharp(imageBuffer)
    .composite([{ input: overlayBuffer, gravity: "centre" }]) // Position the watermark image at the center
    .toBuffer();

  // Convert the output buffer back to a base64 string
  const outputBase64Image = `data:image/webp;base64,${outputBuffer.toString("base64")}`;

  return outputBase64Image;
};

export const overlayImageAdvanced = async (
  background: Buffer,
  splice: Buffer,
  x: number,
  y: number,
): Promise<Buffer> => {
  // Use sharp to overlay the splice image onto the background image
  const outputBuffer = await sharp(background)
    .composite([{ input: splice, top: y, left: x }])
    .toBuffer();

  return outputBuffer;
};

export const resizeImageFromUrl = async (
  image_url: string,
  width = 1200,
  height = 630,
  borderRadius = 0, // Optional border radius
  blurSigma = 0.3, // Optional blur sigma
) => {
  // Fetch the image
  const response = await axios.get(image_url, { responseType: "arraybuffer" });
  const buffer = Buffer.from(response.data, "binary");

  // Check the Content-Type
  if (!response.headers["content-type"].startsWith("image/")) {
    throw new Error("URL does not point to an image");
  }

  // Resize, crop and blur the image
  let outputBuffer = await sharp(buffer)
    .resize(width, height, {
      fit: "cover",
      position: "center",
    })
    .blur(blurSigma)
    .toBuffer();

  if (borderRadius > 0) {
    // Create a square mask
    const roundedCorners = Buffer.from(
      `<svg><rect x="0" y="0" width="${width}" height="${height}" rx="${borderRadius}" ry="${borderRadius}"/></svg>`,
    );

    // Apply the mask to the original image
    outputBuffer = await sharp(outputBuffer)
      .png()
      .composite([{ input: roundedCorners, blend: "dest-in" }])
      .toBuffer();
  }

  // Now outputBuffer contains your cropped and blurred image
  return outputBuffer;
};

export const withBlackSquare = async (
  image: Buffer,
  width: number,
  height: number,
  x: number,
  y: number,
  borderRadius: number,
  opacity = 1,
) => {
  // Create a rectangle
  const shape = Buffer.from(
    `<svg><rect x="0" y="0" width="${width}" height="${height}" rx="${borderRadius}" ry="${borderRadius}" fill-opacity="${opacity}"/></svg>`,
  );

  // Apply the rectangle to the original image
  const output = await sharp(image)
    .composite([{ input: shape, top: y, left: x }])
    .toBuffer();

  return output;
};

export const withWhiteCircle = async (
  image: Buffer,
  width: number,
  height: number,
  x: number,
  y: number,
  opacity = 1,
) => {
  // Create a circle
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) / 2;
  const circleSvg = `<svg><circle cx="${cx}" cy="${cy}" r="${r}" fill="white" fill-opacity="${opacity}"/></svg>`;
  const shape = Buffer.from(circleSvg);

  // Apply the rectangle to the original image
  const output = await sharp(image)
    .composite([{ input: shape, top: y, left: x }])
    .toBuffer();

  return output;
};

export const bufferToPng = async (buffer: Buffer) => {
  return await sharp(buffer).png();
};

export const saveToFile = async (buffer: Buffer, filename: string) => {
  await sharp(buffer).toFile(filename);
};

export const resizeImage = async (image: Buffer, width: number, height: number): Promise<Buffer> => {
  const outputBuffer = await sharp(image).resize(width, height).toBuffer();
  return outputBuffer;
};
