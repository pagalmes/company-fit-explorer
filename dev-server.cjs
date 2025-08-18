/**
 * Development File Server
 * 
 * Simple Express server that provides endpoints for writing to companies.ts
 * during development. This enables automatic persistence of exploration state.
 * 
 * Usage: node dev-server.js
 */

const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Configuration
const ENABLE_BACKUPS = process.env.DEV_ENABLE_BACKUPS === 'true' || false;

// Enable CORS for development
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// Debug root endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Development file server is running', status: 'ok' });
});

// Health check endpoint
app.get('/api/dev/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Development file server is running',
    timestamp: new Date().toISOString()
  });
});

// Backup companies.ts file
app.post('/api/dev/backup-companies', async (req, res) => {
  try {
    const companiesPath = path.join(__dirname, 'src', 'data', 'companies.ts');
    const backupPath = path.join(__dirname, 'src', 'data', `companies.backup.${Date.now()}.ts`);
    
    // Read current file and create backup
    const currentContent = await fs.readFile(companiesPath, 'utf8');
    await fs.writeFile(backupPath, currentContent, 'utf8');
    
    console.log(`📁 Created backup: ${path.basename(backupPath)}`);
    
    res.json({
      success: true,
      message: `Backup created: ${path.basename(backupPath)}`
    });
  } catch (error) {
    console.error('Backup failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create backup',
      error: error.message
    });
  }
});

// Write updated state to companies.ts
app.post('/api/dev/write-companies', async (req, res) => {
  try {
    const { profileName, state } = req.body;
    
    if (!profileName || !state) {
      return res.status(400).json({
        success: false,
        message: 'Missing profileName or state in request body'
      });
    }

    const companiesPath = path.join(__dirname, 'src', 'data', 'companies.ts');
    
    // Generate new file content
    const fileContent = generateCompaniesFileContent(profileName, state);
    
    let backupInfo = null;
    
    // Create backup only if enabled
    if (ENABLE_BACKUPS) {
      const backupPath = path.join(__dirname, 'src', 'data', `companies.backup.${Date.now()}.ts`);
      const currentContent = await fs.readFile(companiesPath, 'utf8');
      await fs.writeFile(backupPath, currentContent, 'utf8');
      backupInfo = path.basename(backupPath);
      console.log(`📁 Backup created: ${backupInfo}`);
    }
    
    // Write new content
    await fs.writeFile(companiesPath, fileContent, 'utf8');
    
    console.log(`✅ Updated companies.ts for profile: ${profileName}`);
    console.log(`📊 State: ${state.addedCompanies.length} added, ${state.removedCompanyIds.length} removed, ${state.watchlistCompanyIds.length} watchlisted`);
    
    const response = {
      success: true,
      message: `Successfully updated companies.ts for profile ${profileName}`
    };
    
    if (backupInfo) {
      response.backup = backupInfo;
    }
    
    res.json(response);
    
  } catch (error) {
    console.error('Write failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to write to companies.ts',
      error: error.message
    });
  }
});

// Generate companies.ts file content
function generateCompaniesFileContent(profileName, state) {
  const { baseCompanies, addedCompanies, removedCompanyIds, watchlistCompanyIds, lastSelectedCompanyId, viewMode, cmf } = state;

  return `import { Company, UserExplorationState } from '../types';

// Base company dataset - original data without user modifications
const baseCompanies: Company[] = ${JSON.stringify(baseCompanies, null, 2)};

// User profiles with complete exploration state
const ${profileName}: UserExplorationState = {
  id: "${state.id}",
  name: "${state.name}",
  cmf: ${JSON.stringify(cmf, null, 2)},
  baseCompanies: baseCompanies,
  addedCompanies: ${JSON.stringify(addedCompanies, null, 2)},
  removedCompanyIds: ${JSON.stringify(removedCompanyIds, null, 2)},
  watchlistCompanyIds: ${JSON.stringify(watchlistCompanyIds, null, 2)},
  lastSelectedCompanyId: ${lastSelectedCompanyId || 'undefined'},
  viewMode: '${viewMode}'
};

// Export the current active user (manually switch by changing this line)
export const activeUserProfile = ${profileName};

// Legacy exports for compatibility
export const sampleUserCMF = activeUserProfile.cmf;
export const sampleCompanies = activeUserProfile.baseCompanies;
`;
}

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Development file server running on http://localhost:${PORT}`);
  console.log(`📁 Ready to write to companies.ts`);
  console.log(`🔧 Make sure your React app is running on localhost:5173-5175`);
  console.log(`📋 Backups: ${ENABLE_BACKUPS ? 'ENABLED' : 'DISABLED'} (set DEV_ENABLE_BACKUPS=true to enable)`);
  
  // Test that routes are working
  console.log('📡 Available endpoints:');
  console.log('  - GET  /api/dev/health');
  console.log('  - POST /api/dev/backup-companies');
  console.log('  - POST /api/dev/write-companies');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n📁 Development file server shutting down...');
  process.exit(0);
});