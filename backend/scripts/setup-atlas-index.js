// scripts/setup-atlas-index.js
/**
 * Run this ONCE after connecting to MongoDB Atlas to create the vector search index.
 * Usage: node scripts/setup-atlas-index.js
 *
 * Prerequisites:
 *   - MongoDB Atlas M10+ cluster (Vector Search requires M10+)
 *   - Atlas Data API or mongosh access
 *   - MONGODB_URI set in .env
 */
import 'dotenv/config';
import mongoose from 'mongoose';

async function createVectorIndex() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB Atlas');

  const db = mongoose.connection.db;

  // Vector Search index definition
  const vectorIndexDef = {
    name: 'repo_chunks_vector_index',
    type: 'vectorSearch',
    definition: {
      fields: [
        {
          type: 'vector',
          path: 'embedding',
          numDimensions: 1536, // text-embedding-3-small dimensions
          similarity: 'cosine'
        },
        {
          type: 'filter',
          path: 'repositoryId'
        }
      ]
    }
  };

  // Regular text search index
  const textIndexDef = {
    name: 'repo_chunks_text_index',
    definition: {
      mappings: {
        dynamic: false,
        fields: {
          content: { type: 'string', analyzer: 'lucene.standard' },
          filePath: { type: 'string', analyzer: 'lucene.keyword' },
          language: { type: 'string', analyzer: 'lucene.keyword' }
        }
      }
    }
  };

  try {
    // Create vector search index via Atlas Search API
    // Note: This requires Atlas Search to be enabled on your cluster
    const collection = db.collection('repochunks');

    await collection.createSearchIndex(vectorIndexDef);
    console.log('✅ Vector search index created: repo_chunks_vector_index');

    await collection.createSearchIndex(textIndexDef);
    console.log('✅ Text search index created: repo_chunks_text_index');

  } catch (err) {
    if (err.message?.includes('already exists')) {
      console.log('ℹ️  Index already exists, skipping creation');
    } else {
      console.error('❌ Index creation error:', err.message);
      console.log('\n📋 Manual setup instructions:');
      console.log('1. Go to MongoDB Atlas UI → your cluster → Search');
      console.log('2. Click "Create Search Index"');
      console.log('3. Select "Atlas Vector Search"');
      console.log('4. Use collection: repomind.repochunks');
      console.log('5. Paste this JSON definition:');
      console.log(JSON.stringify(vectorIndexDef.definition, null, 2));
    }
  }

  // Create regular MongoDB indexes for performance
  const RepoChunk = db.collection('repochunks');
  await RepoChunk.createIndex({ repositoryId: 1, filePath: 1 });
  await RepoChunk.createIndex({ repositoryId: 1 });
  console.log('✅ MongoDB compound indexes created');

  const Repository = db.collection('repositories');
  await Repository.createIndex({ url: 1 }, { unique: true });
  await Repository.createIndex({ status: 1 });
  console.log('✅ Repository indexes created');

  const ChatSession = db.collection('chatsessions');
  await ChatSession.createIndex({ repositoryId: 1 });
  console.log('✅ ChatSession indexes created');

  const AnalysisReport = db.collection('analysisreports');
  await AnalysisReport.createIndex({ repositoryId: 1, type: 1 });
  console.log('✅ AnalysisReport indexes created');

  console.log('\n🎉 All indexes set up successfully!');
  await mongoose.disconnect();
}

createVectorIndex().catch(err => {
  console.error(err);
  process.exit(1);
});
