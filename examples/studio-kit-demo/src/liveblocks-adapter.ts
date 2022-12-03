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
      async insert(props = {}, parentId, index, id = generateId()) {
        // Create the node
        let node = new LiveObject({
          id,
          props: new LiveObject(props),
          children: new LiveList(),
        }) as LiveNode

        // Index the node
        nodeIndex[id] = node
        parentIdIndex[id] = parentId

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
      async reorder(id, childIds) {
        const parent = nodeIndex[parentIdIndex[id]]
        const children = parent.get('children')
        const childArray = children.toArray()

        childIds.forEach((id, i) => {
          children.set(
            i,
            childArray.find((x) => x.get('id') === id),
          )
        })
      },
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

    const getChildrenDifference = (
      previous: string[] = [],
      next: string[] = [],
    ) => {
      return {
        added: next.filter((item) => !previous.some((x) => item === x)),
        removed: previous.filter((item) => !next.some((x) => item === x)),
      }
    }

    const indexDataTree = (node: LiveNode, parentId?: string) => {
      // Index all nodes as LiveObject
      nodeIndex[node.get('id')] = node
      parentIdIndex[node.get('id')] = parentId

      // TODO: Receive actual project reference
      const project = window.project as Compositor.Project

      node.get('children').forEach((x) => indexDataTree(x, node.get('id')))

      // const subscribeToNode = (subscribeNode: LiveNode) => {
      //   room.subscribe(subscribeNode.get('props'), () => {
      //     project.local.update(
      //       subscribeNode.get('id'),
      //       subscribeNode.get('props').toObject(),
      //     )
      //   })
      //   room.subscribe(subscribeNode.get('children'), (next) => {
      //     const { added, removed } = getChildrenDifference(
      //       project.get(subscribeNode.get('id')).children.map((x) => x.id),
      //       next.map((x) => x.get('id')),
      //     )
      //     added.forEach((id) => {
      //       const node = next.find((x) => x.get('id') === id)
      //       indexDataTree(node, subscribeNode.get('id'))
      //       // NOTE: In theory, only one node will be inserted at once.
      //       //  If multiple nodes are inserted at once, we'll run into problems
      //       //  inserting nodes at the correct index within parent.
      //       project.local.insert(
      //         {
      //           id: node.get('id'),
      //           props: node.get('props').toObject(),
      //           // @ts-ignore TODO: Resolve readonly issues
      //           //  TODO: Create custom function to map all children toObject()
      //           children: node.get('children').toImmutable(),
      //         },
      //         parentId,
      //         next.indexOf(node),
      //       )
      //     })
      //     removed.forEach((x) => {})
      //   })
      // }

      // subscribeToNode(node)
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

    room.subscribe(root.get('node').get('props'), () => {
      // TODO: Receive actual project reference
      window.setTimeout(() => {
        window.project.local.update(
          root.get('node').get('id'),
          root.get('node').get('props').toObject(),
        )
      })
    })
    room.subscribe(root.get('node').get('children'), () => {
      // TODO: Receive actual project reference
      window.setTimeout(() => {
        window.project.local.update(
          root.get('node').get('id'),
          root.get('node').get('props').toObject(),
          root
            .get('node')
            .get('children')
            .toArray()
            .map((x) => x.toObject()),
        )
      })
    })

    indexDataTree(root.get('node'))
    const tree = toSceneTree(root.get('node'))
    console.log('Loaded project tree', tree)
    return tree
  },
}
