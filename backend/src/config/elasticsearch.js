const { Client } = require('@opensearch-project/opensearch');

let esClient = null;
let isConnected = false;

// Create OpenSearch client
const createESClient = () => {
  if (esClient) return esClient;

  esClient = new Client({
    node: process.env.OPENSEARCH_NODE,
    auth: {
      username: process.env.OPENSEARCH_USERNAME,
      password: process.env.OPENSEARCH_PASSWORD,
    },
    ssl: { rejectUnauthorized: false },
  });

  return esClient;
};

// Connect and verify
const connectElasticsearch = async () => {
  try {
    const client = createESClient();
    const info = await client.info();
    isConnected = true;
    console.log('OpenSearch: Connected successfully');
    console.log(`OpenSearch: ${info.body.cluster_name} - v${info.body.version.number}`);
    return client;
  } catch (error) {
    isConnected = false;
    console.error('OpenSearch connection error:', error.message);
    console.log('Server will continue without OpenSearch');
    return null;
  }
};

// Get client
const getESClient = () => esClient || createESClient();

// Check connection
const isESConnected = () => isConnected;

// Disconnect
const disconnectElasticsearch = async () => {
  if (esClient) {
    await esClient.close();
    esClient = null;
    isConnected = false;
    console.log('OpenSearch: Disconnected');
  }
};

module.exports = {
  connectElasticsearch,
  getESClient,
  isESConnected,
  disconnectElasticsearch,
};