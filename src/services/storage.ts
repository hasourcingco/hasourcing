import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { env } from "@/lib/env";
export interface StorageProvider {
  get(key: string): Promise<Buffer>;
  put(key: string, data: Buffer, mime: string): Promise<void>;
}
const safe = (key: string) => {
  if (!/^[a-zA-Z0-9_.-]+$/.test(key)) throw new Error("잘못된 저장소 키");
  return key;
};
export class LocalStorage implements StorageProvider {
  async get(key: string) {
    return readFile(path.join(path.resolve(env.STORAGE_PATH), safe(key)));
  }
  async put(key: string, data: Buffer) {
    await mkdir(path.resolve(env.STORAGE_PATH), { recursive: true });
    await writeFile(path.join(path.resolve(env.STORAGE_PATH), safe(key)), data);
  }
}
export class S3Storage implements StorageProvider {
  private client = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION ?? "auto",
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
    },
  });
  async get(key: string) {
    const r = await this.client.send(
      new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: safe(key) }),
    );
    return Buffer.from(await r.Body!.transformToByteArray());
  }
  async put(key: string, data: Buffer, mime: string) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: safe(key),
        Body: data,
        ContentType: mime,
      }),
    );
  }
}
export const storage: StorageProvider =
  env.STORAGE_PROVIDER === "s3" ? new S3Storage() : new LocalStorage();
export function validateUpload(name: string, mime: string, b: Buffer) {
  if (b.length > 10 * 1024 * 1024 || !b.length)
    throw new Error("파일은 10MB 이하로 업로드해주세요.");
  const ext = path.extname(name).toLowerCase();
  const valid =
    (ext === ".pdf" &&
      mime === "application/pdf" &&
      b.subarray(0, 5).toString() === "%PDF-") ||
    ([".jpg", ".jpeg"].includes(ext) &&
      mime === "image/jpeg" &&
      b[0] === 255 &&
      b[1] === 216 &&
      b[2] === 255) ||
    (ext === ".png" &&
      mime === "image/png" &&
      b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])));
  if (!valid) throw new Error("실제 PNG/JPEG/PDF 파일만 허용합니다.");
  return ext;
}
