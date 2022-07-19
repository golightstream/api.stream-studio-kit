/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
export const Animations = {
  'fade-in':
    '.fade-in{-webkit-animation:fade-in;animation:fade-in}@-webkit-keyframes fade-in{0%{opacity:0}100%{opacity:1}}@keyframes fade-in{0%{opacity:0}100%{opacity:1}}',
  'fade-out':
    '.fade-out{-webkit-animation:fade-out;animation:fade-out}@-webkit-keyframes fade-out{0%{opacity:1}100%{opacity:0}}@keyframes fade-out{0%{opacity:1}100%{opacity:0}}',
  'slide-in-blurred-top':
    '.slide-in-blurred-top{-webkit-animation:slide-in-blurred-top .6s cubic-bezier(.23,1.000,.32,1.000) both;animation:slide-in-blurred-top .6s cubic-bezier(.23,1.000,.32,1.000) both}@-webkit-keyframes slide-in-blurred-top{0%{-webkit-transform:translateY(-1000px) scaleY(2.5) scaleX(.2);transform:translateY(-1000px) scaleY(2.5) scaleX(.2);-webkit-transform-origin:50% 0;transform-origin:50% 0;-webkit-filter:blur(40px);filter:blur(40px);opacity:0}100%{-webkit-transform:translateY(0) scaleY(1) scaleX(1);transform:translateY(0) scaleY(1) scaleX(1);-webkit-transform-origin:50% 50%;transform-origin:50% 50%;-webkit-filter:blur(0);filter:blur(0);opacity:1}}@keyframes slide-in-blurred-top{0%{-webkit-transform:translateY(-1000px) scaleY(2.5) scaleX(.2);transform:translateY(-1000px) scaleY(2.5) scaleX(.2);-webkit-transform-origin:50% 0;transform-origin:50% 0;-webkit-filter:blur(40px);filter:blur(40px);opacity:0}100%{-webkit-transform:translateY(0) scaleY(1) scaleX(1);transform:translateY(0) scaleY(1) scaleX(1);-webkit-transform-origin:50% 50%;transform-origin:50% 50%;-webkit-filter:blur(0);filter:blur(0);opacity:1}}',
}