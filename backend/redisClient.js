import { createClient } from "redis";  
import envt_imports from './envt_imports/envt_imports.js';  
import {redisConfig} from  './envt_imports/envt_imports.js';

const redisClient = createClient({
    socket: {
        host: redisConfig.host, 
        port: redisConfig.port, 
    },
   
});

// Handling the "connect" event
redisClient.on("connect", () => {   
    console.log("Connected to Redis successfully!");
});

// Handling the "error" event
redisClient.on("error", (err) => {
    console.error("Redis Client Error:", err);  // Logging any errors from the Redis client
});

// Asynchronous function to connect to Redis
const connectRedis = async () => {
    try {
        // Wait for Redis connection
        await redisClient.connect();
        console.log("Redis client connected.");
    } catch (error) {
        console.error("Error while connecting to Redis:", error.message);
        process.exit(1);  // Exit if Redis connection fails, can be adjusted based on your needs
    }
};

// Call the connectRedis function when this module is imported
connectRedis();

// Export the Redis client for use in other files
export default redisClient;
