/* =========================================
   JOYSTICK + POINTER (CONTINUOUS MOVEMENT)
   ========================================= */

const joystick = document.getElementById('joystick');
const stick = document.getElementById('stick');
const pointer = document.getElementById('pointer');
const clickBtn = document.getElementById('clickBtn');

/* ---------- Screen ---------- */
let screenW = window.innerWidth;
let screenH = window.innerHeight;

window.addEventListener('resize', () => {
  screenW = window.innerWidth;
  screenH = window.innerHeight;
});

/* ---------- Pointer state ---------- */
let pointerX = screenW / 2;
let pointerY = screenH / 2;

/* ---------- Joystick geometry ---------- */
let centerX = 0;
let centerY = 0;
let radius = 0;

function updateJoystickDimensions() {
  const rect = joystick.getBoundingClientRect();
  centerX = rect.width / 2;
  centerY = rect.height / 2;
  radius = rect.width * 0.45;
}

window.addEventListener('resize', updateJoystickDimensions);
updateJoystickDimensions();

/* ---------- Input state ---------- */
let activeTouchId = null;
let inputX = 0;
let inputY = 0;

/* ---------- RESET ---------- */
function resetJoystick() {
  activeTouchId = null;
  inputX = 0;
  inputY = 0;

  stick.style.transition = 'transform 0.15s ease-out';
  stick.style.transform = 'translate(-50%, -50%)';
}

/* ---------- Core movement ---------- */
function moveStick(clientX, clientY) {
  const rect = joystick.getBoundingClientRect();

  let x = clientX - rect.left - centerX;
  let y = clientY - rect.top - centerY;

  const distance = Math.hypot(x, y);
  const clamped = Math.min(distance, radius);
  const angle = Math.atan2(y, x);

  const dx = Math.cos(angle) * clamped;
  const dy = Math.sin(angle) * clamped;

  /* input normalizado (-1 a 1) */
  inputX = dx / radius;
  inputY = dy / radius;

  stick.style.transition = 'none';
  stick.style.transform = `translate(${dx}px, ${dy}px)`;
}

/* ---------- Pointer update loop ---------- */
const SPEED = 14; // sensibilidad base (ajustable)

function updatePointer() {
  pointerX += inputX * SPEED;
  pointerY += inputY * SPEED;

  /* límites de pantalla */
  pointerX = Math.max(0, Math.min(screenW, pointerX));
  pointerY = Math.max(0, Math.min(screenH, pointerY));

  pointer.style.transform = `translate(${pointerX}px, ${pointerY}px)`;

  requestAnimationFrame(updatePointer);
}

updatePointer();

/* =========================================
   TOUCH EVENTS (MOBILE)
   ========================================= */

joystick.addEventListener('touchstart', e => {
  e.preventDefault();
  if (activeTouchId !== null) return;

  const t = e.changedTouches[0];
  activeTouchId = t.identifier;
  moveStick(t.clientX, t.clientY);
}, { passive: false });

joystick.addEventListener('touchmove', e => {
  e.preventDefault();
  for (const t of e.touches) {
    if (t.identifier === activeTouchId) {
      moveStick(t.clientX, t.clientY);
      break;
    }
  }
}, { passive: false });

joystick.addEventListener('touchend', resetJoystick, { passive: false });
joystick.addEventListener('touchcancel', resetJoystick, { passive: false });

/* =========================================
   MOUSE EVENTS (PC TESTING)
   ========================================= */

joystick.addEventListener('mousedown', e => {
  if (e.button !== 0) return;

  moveStick(e.clientX, e.clientY);

  const onMove = ev => moveStick(ev.clientX, ev.clientY);
  const onUp = () => {
    resetJoystick();
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  };

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
});

/* =========================================
   CLICK BUTTON (TEST)
   ========================================= */

clickBtn.addEventListener('click', () => {
  console.log('CLICK virtual');
});

/* ---------- init ---------- */
pointer.style.transform = `translate(${pointerX}px, ${pointerY}px)`;
