const envt_imports={
    appwriteUrl: String(import.meta.env.VITE_APPWRITE_URL),
    appwriteProjectId: String(import.meta.env.VITE_APPWRITE_PROJECT_ID),
    appwriteDatabaseId: String(import.meta.env.VITE_APPWRITE_DATABASE_ID),
    appwriteCollectionId: String(import.meta.env.VITE_APPWRITE_COLLECTION_ID),
    appwriteCollection2Id: String(import.meta.env.VITE_APPWRITE_COLLECTION2_ID),
    appwriteAdminId: String(import.meta.env.VITE_APPWRITE_ADMIN_ID),
    appwriteDoctorId: String(import.meta.env.VITE_APPWRITE_DOCTOR_ID),
    appriteApiKey: String(import.meta.env.VITE_APPWRITE_API_KEY),
    appwriteFinalDataCollectionId:String(import.meta.env.VITE_APPWRITE_FINAL_DATA_COLLECTION_ID),
    downloadPassword:String(import.meta.env.VITE_DOWNLOADPASSWORD),
    adminPassword:String(import.meta.env.VITE_ADMIN_PASSWORD),

}

export default envt_imports
