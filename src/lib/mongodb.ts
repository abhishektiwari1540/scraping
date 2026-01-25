import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    '❌ Please define the MONGODB_URI environment variable inside .env.local\n' +
    'Example: MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname'
  );
}

// Debug output
console.log('🔍 Checking MongoDB connection...');
const maskedUri = MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
console.log('URI (masked):', maskedUri);
console.log('URI starts correctly:', 
  MONGODB_URI.startsWith('mongodb://') || MONGODB_URI.startsWith('mongodb+srv://'));

// Define types for cached connection
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseGlobal: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongooseGlobal || { conn: null, promise: null };

if (!global.mongooseGlobal) {
  global.mongooseGlobal = cached;
}

async function dbConnect(): Promise<typeof mongoose> {
  if (cached.conn) {
    console.log('✅ Using cached MongoDB connection');
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000, // Increased timeout for Atlas
      socketTimeoutMS: 45000,
      family: 4,
    };

    console.log('🔗 Attempting to connect to MongoDB Atlas...');
    
    cached.promise = mongoose.connect(MONGODB_URI, opts)
      .then((mongooseInstance) => {
        console.log('✅ MongoDB Atlas connected successfully!');
        console.log(`📊 Database: ${mongooseInstance.connection.db?.databaseName}`);
        console.log(`📈 Host: ${mongooseInstance.connection.host}`);
        console.log(`🏷️ App Name: ${mongooseInstance.connection.client?.s?.options?.appName}`);
        return mongooseInstance;
      })
      .catch((error) => {
        console.error('❌ MongoDB Atlas connection failed:', error.message);
        
        console.log('\n🔧 TROUBLESHOOTING MONGODB ATLAS:');
        console.log('1. Check if your IP is whitelisted:');
        console.log('   - Go to MongoDB Atlas Dashboard');
        console.log('   - Click "Network Access"');
        console.log('   - Click "Add IP Address"');
        console.log('   - Click "Add Current IP Address" or use 0.0.0.0/0');
        
        console.log('\n2. Verify database user:');
        console.log('   - Username: abhishektiwari1540_db_user');
        console.log('   - Check if user has read/write permissions');
        
        console.log('\n3. Check cluster status:');
        console.log('   - Make sure cluster is not paused');
        console.log('   - Cluster name: scrapbackend-cluster');
        
        console.log('\n4. Connection string format:');
        console.log('   Expected: mongodb+srv://username:password@cluster.mongodb.net/dbname');
        console.log('   Your URI starts with:', MONGODB_URI.substring(0, 30));
        
        cached.promise = null;
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}

export default dbConnect;