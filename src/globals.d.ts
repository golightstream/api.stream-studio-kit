/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
declare const SDK_VERSION = string

// Debug helpers tied to the main window
declare interface Window {
  __StudioKit?: any
}

declare module 'react-transition-group'
declare module 'unist-util-visit'