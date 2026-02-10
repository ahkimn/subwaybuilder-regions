import { spawn, execFileSync } from 'child_process';
import { loadDevConfig } from './utils/dev-config';

function closeRunningGame() {
  if (process.platform !== 'win32') {
    console.log('Close game: TODO for non-Windows platforms.');
    return;
  }

  try {
    execFileSync('taskkill', ['/IM', 'Subway Builder.exe', '/F'], {
      stdio: 'ignore',
    });
    console.log('Closed running game instance.');
  } catch {
    console.log('No running game instance found.');
  }
}

function launchGame(gamePath: string) {
  const child = spawn(gamePath, [], {
    env: { ...process.env, DEBUG_PROD: 'true' },
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  console.log('Launched game with DEBUG_PROD=true.');
}

const config = loadDevConfig();
const { gamePath, baseModsDir, modDirName } = config;

console.log('Platform:', process.platform);
console.log('Game path:', gamePath);
console.log('Base mods dir:', baseModsDir);
console.log('Mod dir name:', modDirName);

closeRunningGame();
launchGame(gamePath);
