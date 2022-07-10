/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import React from 'react'
const useUnload = (fn: any) => {
  const cb = React.useRef(fn)
  React.useEffect(() => {
    const onUnload = cb.current
    window.addEventListener('beforeunload', onUnload)
    return () => {
      window.removeEventListener('beforeunload', onUnload)
    }
  }, [cb])
}

export default useUnload;
