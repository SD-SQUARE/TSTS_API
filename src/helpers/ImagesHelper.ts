import { getRandomId } from "../utils/secrets.js";
import { uploadFile } from "../utils/storage.js";

export const uploadFilesWithUniqueKey = async (folderPath, uniqueId, file) => {
  const imageId = getRandomId();
  const safeKey = `${folderPath}/${imageId}_${uniqueId}_${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")}`;

  return await uploadFile(
    process.env.MINIO_BUCKET,
    safeKey,
    file.buffer,
    file.mimetype
  );
};
