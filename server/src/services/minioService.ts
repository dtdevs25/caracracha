import * as Minio from 'minio';
import dotenv from 'dotenv';
import * as https from 'https';

dotenv.config();

const minioClient = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT || '',
    port: parseInt(process.env.MINIO_PORT || '443'),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || '',
    secretKey: process.env.MINIO_SECRET_KEY || '',
    transport: {
        request: (options: any, callback: any) => {
            options.agent = new https.Agent({ rejectUnauthorized: false });
            return https.request(options, callback);
        }
    }
} as any);

const bucketName = process.env.MINIO_BUCKET_NAME || 'caracracha-desing';

export const initializeMinio = async () => {
    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
        await minioClient.makeBucket(bucketName, 'us-east-1');
        console.log(`Bucket ${bucketName} created.`);
    }
};

export const uploadFile = async (fileName: string, buffer: Buffer, contentType: string) => {
    await minioClient.putObject(bucketName, fileName, buffer, buffer.length, {
        'Content-Type': contentType
    });
    return fileName;
};

export const getFileUrl = async (fileName: string) => {
    if (!fileName) return null;
    return await minioClient.presignedGetObject(bucketName, fileName, 24 * 60 * 60); // 24h
};

export default minioClient;
