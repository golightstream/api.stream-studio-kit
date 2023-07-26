/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
module.exports = function parseCommandLineArgsToJSON() {
  const args = process.argv.slice(2);
  const jsonArgs = { sdkversion : null };

  args.forEach(arg => {
    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (match) {
      const key = match[1];
      const value = match[2];
      jsonArgs[key] = value;
    }
  });

  return jsonArgs
}