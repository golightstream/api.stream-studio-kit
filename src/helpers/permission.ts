/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import {Role} from '../core/types'

type PermissionMap = {
  [key in Role]: Permission[]
}

/**
 * A contextual repurposing of API.stream roles
 * https://www.api.stream/docs/api/auth/#permission-roles
 */

export enum Permission {
  ReadProject, // LiveAPI / LayoutAPI Read
  UpdateProject, // LiveAPI / LayoutAPI Write
  JoinRoom, // Join WebRTC
  InviteGuests, // Invite Guests
  ManageGuests, // (Non-API.stream?) Kick / rename guests
  ManageBroadcast, // Manage Broadcast
  ManageSelf,
}

export const permissions = {
  [Role.ROLE_HOST]: [
    Permission.ReadProject,
    Permission.UpdateProject,
    Permission.JoinRoom,
    Permission.InviteGuests,
    Permission.ManageGuests,
    Permission.ManageBroadcast,
  ],
  [Role.ROLE_COHOST]: [
    Permission.ReadProject,
    Permission.UpdateProject,
    Permission.JoinRoom,
    Permission.InviteGuests,
    Permission.ManageGuests,
    Permission.ManageBroadcast,
  ],
  [Role.ROLE_CONTRIBUTOR]: [
    Permission.ReadProject,
    Permission.UpdateProject,
    Permission.JoinRoom,
    Permission.InviteGuests,
  ],
  [Role.ROLE_GUEST]: [
    Permission.ReadProject,
    Permission.JoinRoom,
    Permission.ManageSelf,
  ],
  [Role.ROLE_VIEWER]: [Permission.ReadProject, Permission.JoinRoom],
  [Role.ROLE_IMPERSONATE]: [
    Permission.ReadProject,
    Permission.UpdateProject,
    Permission.InviteGuests,
    Permission.ManageGuests,
    Permission.ManageBroadcast,
  ],
} as PermissionMap

/**
 * It returns true if the role has the permission, otherwise it returns false
 * @param {Role} role - The role of the user.
 * @param {Permission} permission - The permission we want to check for.
 * @returns A function that takes in a role and permission and returns a boolean
 */
export const hasPermission = (role: Role, permission: Permission) => {
  return role
    ? Boolean(permissions[role]?.find((x) => x === permission))
    : false
}
