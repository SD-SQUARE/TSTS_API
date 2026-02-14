export const downloadAvatarImage = async (
  imageUrl: string,
): Promise<Express.Multer.File> => {
  const response = await fetch(imageUrl); // Fetch the image from the URL
  const blob = await response.blob(); // Convert the response to a blob
  const buffer = await blob.arrayBuffer(); // Convert blob to ArrayBuffer

  // Create a custom object that mimics the Express.Multer.File interface
  const file: Express.Multer.File = {
    fieldname: "avatar", // Field name for the avatar
    originalname: "avatar.png", // Original file name
    encoding: "7bit", // Example encoding
    mimetype: blob.type, // MIME type from the blob
    buffer: Buffer.from(buffer), // Buffer from ArrayBuffer
    size: buffer.byteLength, // File size in bytes
    stream: null, // Since we're not using a stream, set it to null
    destination: null, // Destination folder (if necessary, provide a path)
    filename: "avatar.png", // Set the filename
    path: null, // Path where the file would be stored (you can set a path if needed)
  };

  return file; // Return the file object
};
