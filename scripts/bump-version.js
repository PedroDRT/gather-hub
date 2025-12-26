const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const manifestPath = path.join(__dirname, '..', 'manifest.json');

function incrementVersion(version, type) {
  const [major, minor, patch] = version.split('.').map(Number);
  
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      return version;
  }
}

function getVersionType(commitMessage) {
  const msg = commitMessage.toLowerCase().trim();
  
  // Breaking changes (major)
  if (msg.includes('breaking') || msg.startsWith('feat!')) {
    return 'major';
  }
  
  // Features (minor)
  if (msg.startsWith('feat')) {
    return 'minor';
  }
  
  // Fixes, bugs, chores, improvements (patch)
  if (
    msg.startsWith('fix') ||
    msg.startsWith('bug') ||
    msg.startsWith('chore') ||
    msg.startsWith('improvement') ||
    msg.startsWith('refactor') ||
    msg.startsWith('perf') ||
    msg.startsWith('style') ||
    msg.startsWith('docs')
  ) {
    return 'patch';
  }
  
  return 'patch';
}

function bumpVersion() {
  try {
    // Obter última mensagem de commit
    const commitMessage = execSync('git log -1 --pretty=%B', { encoding: 'utf8' }).trim();
    
    if (!commitMessage) {
      console.log('⚠️  Nenhum commit encontrado. Mantendo versão atual.');
      return;
    }
    
    const versionType = getVersionType(commitMessage);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const currentVersion = manifest.version;
    const newVersion = incrementVersion(currentVersion, versionType);
    
    if (currentVersion === newVersion) {
      console.log(`✓ Versão já está atualizada: ${currentVersion}`);
      return;
    }
    
    // Atualizar manifest
    manifest.version = newVersion;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    
    console.log(`\n🚀 Versão atualizada!`);
    console.log(`   ${currentVersion} → ${newVersion}`);
    console.log(`   Commit: ${commitMessage.split('\n')[0]}`);
    console.log(`   Tipo: ${versionType}\n`);
    
  } catch (error) {
    console.error('❌ Erro ao atualizar versão:', error.message);
    process.exit(1);
  }
}

bumpVersion();