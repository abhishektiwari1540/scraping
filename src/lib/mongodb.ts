import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    '❌ Please define the MONGODB_URI environment variable inside .env.local\n' +
    'Example: MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname'
  );
}

// Since we've already thrown an error if MONGODB_URI is undefined,
// we can safely assert it's a string here
const mongoUri: string = MONGODB_URI;

// Debug output
console.log('🔍 Checking MongoDB connection...');
const maskedUri = mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
console.log('URI (masked):', maskedUri);
console.log('URI starts correctly:', 
  mongoUri.startsWith('mongodb://') || mongoUri.startsWith('mongodb+srv://'));

// Define types for cached connection
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseGlobal: MongooseCache | undefined;
}

// Use const since it's never reassigned
const cached: MongooseCache = global.mongooseGlobal || { conn: null, promise: null };

if (!global.mongooseGlobal) {
  global.mongooseGlobal = cached;
}

async function dbConnect(): Promise<typeof mongoose> {
  if (cached.conn) {
    console.log('✅ Using cached MongoDB connection');
    return cached.conn;
  }

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000, // Increased timeout for Atlas
      socketTimeoutMS: 45000,
      family: 4,
    };

    console.log('🔗 Attempting to connect to MongoDB Atlas...');
    
    cached.promise = mongoose.connect(mongoUri, opts)
      .then((mongooseInstance) => {
        console.log('✅ MongoDB Atlas connected successfully!');
        console.log(`📊 Database: ${mongooseInstance.connection.db?.databaseName}`);
        console.log(`📈 Host: ${mongooseInstance.connection.host}`);
        
        // Safely access the appName with proper type checking
        try {
          // Create a type-safe interface for the internal connection object
          interface InternalConnection {
            client?: {
              s?: {
                options?: {
                  appName?: string;
                };
              };
            };
          }
          
          const conn = mongooseInstance.connection as unknown as InternalConnection;
          if (conn.client?.s?.options?.appName) {
            console.log(`🏷️ App Name: ${conn.client.s.options.appName}`);
          } else {
            console.log('🏷️ App Name: (not available)');
          }
        } catch {
          // Silently ignore if we can't access appName
          console.log('🏷️ App Name: (not available)');
        }
        
        return mongooseInstance;
      })
      .catch((error: unknown) => {
        // Create a helper function to get error message safely
        const getErrorMessage = (err: unknown): string => {
          if (err instanceof Error) {
            return err.message;
          } else if (typeof err === 'string') {
            return err;
          } else {
            return 'Unknown error occurred';
          }
        };
        
        const errorMessage = getErrorMessage(error);
        console.error('❌ MongoDB Atlas connection failed:', errorMessage);
        
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
        console.log('   Your URI starts with:', mongoUri.substring(0, 30));
        
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