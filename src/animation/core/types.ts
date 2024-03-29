/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
export enum APIKitAnimationTypes {
  /* SCALE_UP */
  FADE_IN = 'fade-in',
  FADE_OUT = 'fade-out',
  SLIDE_IN_BLURRED_TOP = 'slide-in-blurred-top',
  //   SCALE_UP_BOTTOM = 'scale-up-bottom',
  //   SCALE_UP_BR = 'scale-up-br',
  //   SCALE_UP_CENTER = 'scale-up-center',
  //   SCALE_UP_HOR_CENTER = 'scale-up-hor-center',
  //   SCALE_UP_HOR_LEFT = 'scale-up-hor-left',
  //   SCALE_UP_HOR_RIGHT = 'scale-up-hor-right',
  //   SCALE_UP_LEFT = 'scale-up-left',
  //   SCALE_UP_RIGHT = 'scale-up-right',
  //   SCALE_UP_TL = 'scale-up-tl',
  //   SCALE_UP_TOP = 'scale-up-top',
  //   SCALE_UP_TR = 'scale-up-tr',
  //   SCALE_UP_VER_BOTTOM = 'scale-up-ver-bottom',
  //   SCALE_UP_VER_CENTER = 'scale-up-ver-center',
  //   SCALE_UP_VER_TOP = 'scale-up-ver-top',

  //   /* SCALE_DOWN */
  //   SCALE_DOWN_BL = 'scale-down-bl',
  //   SCALE_DOWN_BOTTOM = 'scale-down-bottom',
  //   SCALE_DOWN_BR = 'scale-down-br',
  //   SCALE_DOWN_CENTER = 'scale-down-center',
  //   SCALE_DOWN_HOR_CENTER = 'scale-down-hor-center',
  //   SCALE_DOWN_HOR_LEFT = 'scale-down-hor-left',
  //   SCALE_DOWN_HOR_RIGHT = 'scale-down-hor-right',
  //   SCALE_DOWN_LEFT = 'scale-down-left',
  //   SCALE_DOWN_RIGHT = 'scale-down-right',
  //   SCALE_DOWN_TL = 'scale-down-tl',
  //   SCALE_DOWN_TOP = 'scale-down-top',
  //   SCALE_DOWN_TR = 'scale-down-tr',
  //   SCALE_DOWN_VER_BOTTOM = 'scale-down-ver-bottom',
  //   SCALE_DOWN_VER_CENTER = 'scale-down-ver-center',
  //   SCALE_DOWN_VER_TOP = 'scale-down-ver-top',

  //   /* ROTATE */
  //   ROTATE_BL = 'rotate-bl',
  //   ROTATE_BOTTOM = 'rotate-bottom',
  //   ROTATE_BR = 'rotate-br',
  //   ROTATE_CENTER = 'rotate-center',
  //   ROTATE_DIAGONAL_1 = 'rotate-diagonal-1',
  //   ROTATE_DIAGONAL_2 = 'rotate-diagonal-2',
  //   ROTATE_DIAGONAL_BL = 'rotate-diagonal-bl',
  //   ROTATE_DIAGONAL_BR = 'rotate-diagonal-br',
  //   ROTATE_DIAGONAL_TL = 'rotate-diagonal-tl',
  //   ROTATE_DIAGONAL_TR = 'rotate-diagonal-tr',
  //   ROTATE_HOR_BOTTOM = 'rotate-hor-bottom',
  //   ROTATE_HOR_CENTER = 'rotate-hor-center',
  //   ROTATE_HOR_TOP = 'rotate-hor-top',
  //   ROTATE_LEFT = 'rotate-left',
  //   ROTATE_RIGHT = 'rotate-right',
  //   ROTATE_TL = 'rotate-tl',
  //   ROTATE_TOP = 'rotate-top',
  //   ROTATE_TR = 'rotate-tr',
  //   ROTATE_VERT_CENTER = 'rotate-vert-center',
  //   ROTATE_VERT_LEFT = 'rotate-vert-left',
  //   ROTATE_VERT_RIGHT = 'rotate-vert-right',

  //   /* ROTATE_SCALE */
  //   ROTATE_SCALE_DOWN = 'rotate-scale-down',
  //   ROTATE_SCALE_DOWN_DIAG_1 = 'rotate-scale-down-diag-1',
  //   ROTATE_SCALE_DOWN_DIAG_2 = 'rotate-scale-down-diag-2',
  //   ROTATE_SCALE_DOWN_HOR = 'rotate-scale-down-hor',
  //   ROTATE_SCALE_DOWN_VER = 'rotate-scale-down-ver',
  //   ROTATE_SCALE_UP = 'rotate-scale-up',
  //   ROTATE_SCALE_UP_DIAG_1 = 'rotate-scale-up-diag-1',
  //   ROTATE_SCALE_UP_DIAG_2 = 'rotate-scale-up-diag-2',
  //   ROTATE_SCALE_UP_HOR = 'rotate-scale-up-hor',
  //   ROTATE_SCALE_UP_VER = 'rotate-scale-up-ver',

  //   /* ROTATE_90 */
  //   ROTATE_90_BL_CCW = 'rotate-90-bl-ccw',
  //   ROTATE_90_BL_CW = 'rotate-90-bl-cw',
  //   ROTATE_90_BOTTOM_CCW = 'rotate-90-bottom-ccw',
  //   ROTATE_90_BOTTOM_CW = 'rotate-90-bottom-cw',
  //   ROTATE_90_BR_CCW = 'rotate-90-br-ccw',
  //   ROTATE_90_BR_CW = 'rotate-90-br-cw',
  //   ROTATE_90_CCW = 'rotate-90-ccw',
  //   ROTATE_90_CW = 'rotate-90-cw',
  //   ROTATE_90_HORIZONTAL_BCK = 'rotate-90-horizontal-bck',
  //   ROTATE_90_HORIZONTAL_FWD = 'rotate-90-horizontal-fwd',
  //   ROTATE_90_LEFT_CCW = 'rotate-90-left-ccw',
  //   ROTATE_90_LEFT_CW = 'rotate-90-left-cw',
  //   ROTATE_90_RIGHT_CCW = 'rotate-90-right-ccw',
  //   ROTATE_90_RIGHT_CW = 'rotate-90-right-cw',
  //   ROTATE_90_TL_CCW = 'rotate-90-tl-ccw',
  //   ROTATE_90_TL_CW = 'rotate-90-tl-cw',
  //   ROTATE_90_TOP_CCW = 'rotate-90-top-ccw',
  //   ROTATE_90_TOP_CW = 'rotate-90-top-cw',
  //   ROTATE_90_TR_CCW = 'rotate-90-tr-ccw',
  //   ROTATE_90_TR_CW = 'rotate-90-tr-cw',
  //   ROTATE_90_VERTICAL_BCK = 'rotate-90-vertical-bck',
  //   ROTATE_90_VERTICAL_FWD = 'rotate-90-vertical-fwd',

  //   /* FLIP */
  //   FLIP_DIAGONAL_1_BCK = 'flip-diagonal-1-bck',
  //   FLIP_DIAGONAL_1_BL = 'flip-diagonal-1-bl',
  //   FLIP_DIAGONAL_1_FWD = 'flip-diagonal-1-fwd',
  //   FLIP_DIAGONAL_1_TR = 'flip-diagonal-1-tr',
  //   FLIP_DIAGONAL_2_BCK = 'flip-diagonal-2-bck',
  //   FLIP_DIAGONAL_2_BR = 'flip-diagonal-2-br',
  //   FLIP_DIAGONAL_2_FWD = 'flip-diagonal-2-fwd',
  //   FLIP_DIAGONAL_2_TL = 'flip-diagonal-2-tl',
  //   FLIP_HORIZONTAL_BCK = 'flip-horizontal-bck',
  //   FLIP_HORIZONTAL_BOTTOM = 'flip-horizontal-bottom',
  //   FLIP_HORIZONTAL_FWD = 'flip-horizontal-fwd',
  //   FLIP_HORIZONTAL_TOP = 'flip-horizontal-top',
  //   FLIP_VERTICAL_BCK = 'flip-vertical-bck',
  //   FLIP_VERTICAL_FWD = 'flip-vertical-fwd',
  //   FLIP_VERTICAL_LEFT = 'flip-vertical-left',
  //   FLIP_VERTICAL_RIGHT = 'flip-vertical-right',

  //   /* FLIP_2 */
  //   FLIP_2_HOR_BOTTOM_1 = 'flip-2-hor-bottom-1',
  //   FLIP_2_HOR_BOTTOM_2 = 'flip-2-hor-bottom-2',
  //   FLIP_2_HOR_BOTTOM_BCK = 'flip-2-hor-bottom-bck',
  //   FLIP_2_HOR_BOTTOM_FWD = 'flip-2-hor-bottom-fwd',
  //   FLIP_2_HOR_TOP_1 = 'flip-2-hor-top-1',
  //   FLIP_2_HOR_TOP_2 = 'flip-2-hor-top-2',
  //   FLIP_2_HOR_TOP_BCK = 'flip-2-hor-top-bck',
  //   FLIP_2_HOR_TOP_FWD = 'flip-2-hor-top-fwd',
  //   FLIP_2_VER_LEFT_1 = 'flip-2-ver-left-1',
  //   FLIP_2_VER_LEFT_2 = 'flip-2-ver-left-2',
  //   FLIP_2_VER_LEFT_BCK = 'flip-2-ver-left-bck',
  //   FLIP_2_VER_LEFT_FWD = 'flip-2-ver-left-fwd',
  //   FLIP_2_VER_RIGHT_1 = 'flip-2-ver-right-1',
  //   FLIP_2_VER_RIGHT_2 = 'flip-2-ver-right-2',
  //   FLIP_2_VER_RIGHT_BCK = 'flip-2-ver-right-bck',
  //   FLIP_2_VER_RIGHT_FWD = 'flip-2-ver-right-fwd',

  //   /* FLIP_SCALE */
  //   FLIP_SCALE_DOWN_DIAG_1 = 'flip-scale-down-diag-1',
  //   FLIP_SCALE_DOWN_DIAG_2 = 'flip-scale-down-diag-2',
  //   FLIP_SCALE_DOWN_HOR = 'flip-scale-down-hor',
  //   FLIP_SCALE_DOWN_VER = 'flip-scale-down-ver',
  //   FLIP_SCALE_UP_DIAG_1 = 'flip-scale-up-diag-1',
  //   FLIP_SCALE_UP_DIAG_2 = 'flip-scale-up-diag-2',
  //   FLIP_SCALE_UP_HOR = 'flip-scale-up-hor',
  //   FLIP_SCALE_UP_VER = 'flip-scale-up-ver',

  //   /* FLIP_SCALE_2 */
  //   FLIP_SCALE_2_HOR_BOTTOM = 'flip-scale-2-hor-bottom',
  //   FLIP_SCALE_2_HOR_TOP = 'flip-scale-2-hor-top',
  //   FLIP_SCALE_2_VER_LEFT = 'flip-scale-2-ver-left',
  //   FLIP_SCALE_2_VER_RIGHT = 'flip-scale-2-ver-right',

  //   /* SWING */
  //   SWING_BOTTOM_BCK = 'swing-bottom-bck',
  //   SWING_BOTTOM_FWD = 'swing-bottom-fwd',
  //   SWING_BOTTOM_LEFT_BCK = 'swing-bottom-left-bck',
  //   SWING_BOTTOM_LEFT_FWD = 'swing-bottom-left-fwd',
  //   SWING_BOTTOM_RIGHT_BCK = 'swing-bottom-right-bck',
  //   SWING_BOTTOM_RIGHT_FWD = 'swing-bottom-right-fwd',
  //   SWING_LEFT_BCK = 'swing-left-bck',
  //   SWING_LEFT_FWD = 'swing-left-fwd',
  //   SWING_RIGHT_BCK = 'swing-right-bck',
  //   SWING_RIGHT_FWD = 'swing-right-fwd',
  //   SWING_TOP_BCK = 'swing-top-bck',
  //   SWING_TOP_FWD = 'swing-top-fwd',
  //   SWING_TOP_LEFT_BCK = 'swing-top-left-bck',
  //   SWING_TOP_LEFT_FWD = 'swing-top-left-fwd',
  //   SWING_TOP_RIGHT_BCK = 'swing-top-right-bck',
  //   SWING_TOP_RIGHT_FWD = 'swing-top-right-fwd',

  //   /* SLIDE */
  //   SLIDE_BL = 'slide-bl',
  //   SLIDE_BOTTOM = 'slide-bottom',
  //   SLIDE_BR = 'slide-br',
       SLIDE_IN_LEFT = 'slide-in-left',
  //   SLIDE_RIGHT = 'slide-right',
  //   SLIDE_TL = 'slide-tl',
  //   SLIDE_TOP = 'slide-top',
  //   SLIDE_TR = 'slide-tr',

  //   /* SLIDE_BCK */
  //   SLIDE_BCK_BL = 'slide-bck-bl',
  //   SLIDE_BCK_BOTTOM = 'slide-bck-bottom',
  //   SLIDE_BCK_BR = 'slide-bck-br',
  //   SLIDE_BCK_CENTER = 'slide-bck-center',
       SLIDE_OUT_LEFT = 'slide-out-left',
  //   SLIDE_BCK_RIGHT = 'slide-bck-right',
  //   SLIDE_BCK_TL = 'slide-bck-tl',
  //   SLIDE_BCK_TOP = 'slide-bck-top',
  //   SLIDE_BCK_TR = 'slide-bck-tr',

  //   /* SLIDE_FWD */
  //   SLIDE_FWD_BL = 'slide-fwd-bl',
  //   SLIDE_FWD_BOTTOM = 'slide-fwd-bottom',
  //   SLIDE_FWD_BR = 'slide-fwd-br',
  //   SLIDE_FWD_CENTER = 'slide-fwd-center',
  //   SLIDE_FWD_LEFT = 'slide-fwd-left',
  //   SLIDE_FWD_RIGHT = 'slide-fwd-right',
  //   SLIDE_FWD_TL = 'slide-fwd-tl',
  //   SLIDE_FWD_TOP = 'slide-fwd-top',
  //   SLIDE_FWD_TR = 'slide-fwd-tr',

  //   /* SLIDE_ROTATE */
  //   SLIDE_ROTATE_HOR_B_BCK = 'slide-rotate-hor-b-bck',
  //   SLIDE_ROTATE_HOR_B_FWD = 'slide-rotate-hor-b-fwd',
  //   SLIDE_ROTATE_HOR_BOTTOM = 'slide-rotate-hor-bottom',
  //   SLIDE_ROTATE_HOR_T_BCK = 'slide-rotate-hor-t-bck',
  //   SLIDE_ROTATE_HOR_T_FWD = 'slide-rotate-hor-t-fwd',
  //   SLIDE_ROTATE_HOR_TOP = 'slide-rotate-hor-top',
  //   SLIDE_ROTATE_VER_L_BCK = 'slide-rotate-ver-l-bck',
  //   SLIDE_ROTATE_VER_L_FWD = 'slide-rotate-ver-l-fwd',
  //   SLIDE_ROTATE_VER_LEFT = 'slide-rotate-ver-left',
  //   SLIDE_ROTATE_VER_R_BCK = 'slide-rotate-ver-r-bck',
  //   SLIDE_ROTATE_VER_R_FWD = 'slide-rotate-ver-r-fwd',
  //   SLIDE_ROTATE_VER_RIGHT = 'slide-rotate-ver-right',

  //   /* SHADOW_DROP */
  //   SHADOW_DROP_BL = 'shadow-drop-bl',
  //   SHADOW_DROP_BOTTOM = 'shadow-drop-bottom',
  //   SHADOW_DROP_BR = 'shadow-drop-br',
  //   SHADOW_DROP_CENTER = 'shadow-drop-center',
  //   SHADOW_DROP_LEFT = 'shadow-drop-left',
  //   SHADOW_DROP_LR = 'shadow-drop-lr',
  //   SHADOW_DROP_RIGHT = 'shadow-drop-right',
  //   SHADOW_DROP_TB = 'shadow-drop-tb',
  //   SHADOW_DROP_TL = 'shadow-drop-tl',
  //   SHADOW_DROP_TOP = 'shadow-drop-top',
  //   SHADOW_DROP_TR = 'shadow-drop-tr',

  //   /* SHADOW_DROP_2 */
  //   SHADOW_DROP_2_BL = 'shadow-drop-2-bl',
  //   SHADOW_DROP_2_BOTTOM = 'shadow-drop-2-bottom',
  //   SHADOW_DROP_2_BR = 'shadow-drop-2-br',
  //   SHADOW_DROP_2_CENTER = 'shadow-drop-2-center',
  //   SHADOW_DROP_2_LEFT = 'shadow-drop-2-left',
  //   SHADOW_DROP_2_LR = 'shadow-drop-2-lr',
  //   SHADOW_DROP_2_RIGHT = 'shadow-drop-2-right',
  //   SHADOW_DROP_2_TB = 'shadow-drop-2-tb',
  //   SHADOW_DROP_2_TL = 'shadow-drop-2-tl',
  //   SHADOW_DROP_2_TOP = 'shadow-drop-2-top',
  //   SHADOW_DROP_2_TR = 'shadow-drop-2-tr',

  //   /* SHADOW_POP */
  //   SHADOW_POP_BL = 'shadow-pop-bl',
  //   SHADOW_POP_BR = 'shadow-pop-br',
  //   SHADOW_POP_TL = 'shadow-pop-tl',
  //   SHADOW_POP_TR = 'shadow-pop-tr',

  //   /* SHADOW_INSET */
  //   SHADOW_INSET_BL = 'shadow-inset-bl',
  //   SHADOW_INSET_BOTTOM = 'shadow-inset-bottom',
  //   SHADOW_INSET_BR = 'shadow-inset-br',
  //   SHADOW_INSET_CENTER = 'shadow-inset-center',
  //   SHADOW_INSET_LEFT = 'shadow-inset-left',
  //   SHADOW_INSET_LR = 'shadow-inset-lr',
  //   SHADOW_INSET_RIGHT = 'shadow-inset-right',
  //   SHADOW_INSET_TB = 'shadow-inset-tb',
  //   SHADOW_INSET_TL = 'shadow-inset-tl',
  //   SHADOW_INSET_TOP = 'shadow-inset-top',
  //   SHADOW_INSET_TR = 'shadow-inset-tr',
}

