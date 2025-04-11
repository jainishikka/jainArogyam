import dotenv from "dotenv";
import express from "express";
import cors from "cors";
// import { createClient } from "redis";
import redisClient from './redisClient.js'
import { Client, Databases } from "node-appwrite";
import envt_imports from './envt_imports/envt_imports.js'; 

// Load environment variables
dotenv.config();

const app = express();
const PORT = 5001;

console.log('Environment Variables:', process.env.APPWRITE_URL);


// Appwrite Configuration
const appwriteClient = new Client();
appwriteClient
    .setEndpoint(envt_imports.appwriteUrl) // Appwrite endpoint
    .setProject(envt_imports.appwriteProjectId) // Project ID
    .setKey(envt_imports.appwriteApiKey); // API key

const databases = new Databases(appwriteClient);

// Redis Client Configuration
// const redisClient = createClient({
//     url: `redis://${envt_imports.redisHost}:${envt_imports.redisPort || 6379}`,
// });
redisClient.on("error", (err) => console.error("Redis Client Error", err));
// redisClient.connect().then(() => console.log("Redis connected"));

// Middleware
app.use(cors({ origin: 'http://localhost:5173' })); // Allow cross-origin requests
app.use(express.json()); // Parse JSON request bodies

// Cache Middleware
const cache = async (req, res, next) => {
    const key = req.originalUrl;

    try {
        const cachedData = await redisClient.get(key);
        if (cachedData) {
            console.log("Cache hit for:", key);
            return res.json(JSON.parse(cachedData)); // Return cached data
        }
        console.log("Cache miss for:", key);
        next(); // Proceed to fetch fresh data if not cached
    } catch (error) {
        console.error("Redis error:", error.message);
        next(); // Continue even if Redis fails
    }
};

app.get('/test', (req, res) => {
    res.send('Backend is working!');
});



app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
