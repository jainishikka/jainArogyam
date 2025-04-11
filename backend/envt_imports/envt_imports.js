import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('../frontend/.env') })
console.log("REDIS_HOST:", process.env.REDIS_HOST);
console.log("REDIS_PORT:", process.env.REDIS_PORT);

export const redisConfig = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
};

const envt_imports = {
    appwriteUrl: process.env.APPWRITE_URL,
    appwriteProjectId: process.env.APPWRITE_PROJECT_ID,
    appwriteDatabaseId: process.env.APPWRITE_DATABASE_ID,
    appwriteCollectionId: process.env.APPWRITE_COLLECTION_ID,
    appwriteCollection2Id: process.env.APPWRITE_COLLECTION2_ID,
    appwriteAdminId: process.env.APPWRITE_ADMIN_ID,
    // appwriteDoctorId: process.env.APPWRITE_DOCTOR_ID,
    appwriteApiKey: process.env.APPWRITE_API_KEY,
    redisHost: process.env.REDIS_HOST,
    redisPort: process.env.REDIS_PORT,
};

export default envt_imports;