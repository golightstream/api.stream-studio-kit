/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
const { exec } = require('child_process');
const parseCommandLineArgsToJSON  = require('../args');

const args = parseCommandLineArgsToJSON()
// Define the commands as an array
const version = args.sdkversion || process.env.npm_package_version;
// Define the commands as an array
const commands = [
  'npm install',
  `vite --config ./renderer.vite.config.ts build --emptyOutDir --outDir ./renderer/dist/ --base=/studiokit/renderer/${version}/ ${args.sdkversion ? `-- --sdkversion=${args.sdkversion}` : ''}`
];


// Function to execute the commands in sequence
function executeCommands(commands) {
  if (commands.length === 0) {
    console.log('All commands executed successfully!');
    return;
  }

  const command = commands.shift();
  console.log(`Executing: ${command}`);

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing: ${command}`);
      console.error(stderr);
    } else {
      console.log(stdout);
      // Call the next command recursively
      executeCommands(commands);
    }
  });
}


// Call the function to start executing the commands
executeCommands(commands);