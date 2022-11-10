/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { Compositor, SDK } from '@api.stream/studio-kit'
import {
  createClient,
  LiveList,
  LiveMap,
  LiveObject,
  Room,
} from '@liveblocks/client'
import config from '../config'
import { generateId } from './host/host'

const client = createClient({
  publicApiKey: config.liveblocksKey,
})

type LiveNode = LiveObject<{
  id: string
  props: LiveObject<{
    // componentChildren?: LiveList<Compositor.SceneNode>
    [prop: string]: any
  }>
  children: LiveList<LiveNode>
}>
type Root = LiveObject<{
  nodes: LiveMap<string, LiveNode>
  node: LiveNode
}>

const nodeIndex = {} as {
  [id: string]: LiveNode
}
const parentIdIndex = {} as {
  [id: string]: string
}
let room: ReturnType<typeof client.enter>
let root: Root

export const dbAdapter: Compositor.DBAdapter = {
  db: (project) => {
    return {
      async insert(props = {}, parentId, index) {
        // Create the node
        const id = generateId()
        let node = new LiveObject({
          id,
          props: new LiveObject(props),
          children: new LiveList(),
        }) as LiveNode

        // Index the node
        nodeIndex[id] = node
        parentIdIndex[id] = parentId

        // TODO: Subscribe to node

        // Add the node to its parent
        if (!parentId) {
          root.set('node', node)
        } else {
          const parent = nodeIndex[parentId]
          parent.get('children').insert(node, index)
        }

        return id
      },
      async update(id, props = {}, replaceAll = false) {
        const node = nodeIndex[id]
        node.get('props').update(props)
      },
      async remove(id) {
        const parent = nodeIndex[parentIdIndex[id]]
        parent
          .get('children')
          .delete(parent.get('children').findIndex((x) => x.get('id') === id))
      },
      // @ts-ignore
      async reorder(id, childIds) {},
      // @ts-ignore
      async move(id, newParentId, index) {},
    }
  },
  createProject: () => {
    const id = generateId()
    return id
  },
  loadProject: async (id) => {
    // @ts-ignore
    room = window.room = client.enter(id, {
      initialPresence: {},
      initialStorage: {
        nodes: new LiveMap(),
      },
    })
    const storage = await room.getStorage()
    root = storage.root as Root

    const indexDataTree = (node: LiveNode, parentId?: string) => {
      // Index all nodes as LiveObject
      nodeIndex[node.get('id')] = node
      parentIdIndex[node.get('id')] = parentId
      node.get('children').forEach((x) => indexDataTree(x, node.get('id')))

      room.subscribe(node.get('props'), () => {
        // TODO: Receive actual project reference
        window.project.local.update(node.get('id'), node.get('props').toObject())
      })
    }

    const toSceneTree = (root: LiveNode): Compositor.SceneNode => {
      if (!root) return null

      const obj = root.toObject()

      return {
        id: obj.id,
        props: obj.props.toObject(),
        children: root
          .get('children')
          .toArray()
          .map((x) => toSceneTree(x))
          .filter(Boolean),
      }
    }

    if (!root.get('node')) return null

    indexDataTree(root.get('node'))
    const tree = toSceneTree(root.get('node'))
    console.log('Loaded project tree', tree)
    return tree
  },
}
