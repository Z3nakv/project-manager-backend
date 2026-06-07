import mongoose from "mongoose"
import dns from 'node:dns';

dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const connectDB = async () => {
    try {
        const { connection } = await mongoose.connect(process.env.DATABASE_URL!);
        const url = `${connection.host}:${connection.port}`
        console.log(`Base de datos connectada en ${url}`);
        
    } catch (error) {
        console.log(error);
    }
}

export default connectDB;