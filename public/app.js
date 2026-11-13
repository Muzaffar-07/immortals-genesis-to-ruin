import { Component } from './game.js';
import { mount } from './runtime.js';
import { enhance } from './experience.js';

const game = new Component();
const root = document.querySelector('#game');
const cleanup = mount(root, game);
const cleanupExperience = enhance(game, root);
function resize() {
  const toolbarHeight = document.querySelector('header').offsetHeight + (document.querySelector('#device-note').offsetHeight || 0);
  const scale = Math.min(innerWidth / 1280, Math.max(160, innerHeight - toolbarHeight) / 720);
  root.style.transform = `scale(${scale})`;
  const viewport = document.querySelector('#viewport');
  viewport.style.width = `${1280 * scale}px`;
  viewport.style.height = `${720 * scale}px`;
}
addEventListener('resize', resize);
resize();
document.querySelector('#difficulty').addEventListener('change', event => { game.props.difficulty = event.target.value; });
document.querySelector('#bloom').addEventListener('change', event => { game.props.bloom = event.target.checked; });
document.querySelector('#shake').addEventListener('change', event => { game.props.screenShake = event.target.checked; });
document.querySelector('#fullscreen').addEventListener('click', async () => {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch { /* Browser may disallow fullscreen. */ }
});
document.addEventListener('visibilitychange', () => { if (document.hidden && game.mode === 'play') game.setPause(true); });
addEventListener('pagehide', () => { cleanupExperience(); cleanup(); }, {once:true});
