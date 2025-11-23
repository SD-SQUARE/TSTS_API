import { getRandomId } from "../utils/secrets.js";
import { uploadFile } from "../utils/storage.js";

export const uploadFilesWithUniqueKey = async (folderPath, ssn, image) => {
  const imageId = getRandomId();
  const safeKey = `${folderPath}/${imageId}_${ssn}_${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")}`;

  return await uploadFile(
    process.env.MINIO_BUCKET,
    safeKey,
    image.buffer,
    image.mimetype
  );
};
