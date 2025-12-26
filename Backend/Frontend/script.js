/* ================================
   JOYSTICK + POINTER (MOBILE SAFE)
   ================================ */

const joystick = document.getElementById('joystick');
const stick = document.getElementById('stick');
const pointer = document.getElementById('pointer');
const clickBtn = document.getElementById('clickBtn');

/* ---------- Screen center ---------- */
let screenCenterX = window.innerWidth / 2;
let screenCenterY = window.innerHeight / 2;

function updateScreenCenter() {
  screenCenterX = window.innerWidth / 2;
  screenCenterY = window.innerHeight / 2;
}

window.addEventListener('resize', updateScreenCenter);
updateScreenCenter();

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

/* ---------- State ---------- */
let activeTouchId = null;
let currentAngle = 0;
let currentForce = 0;

/* ---------- Pointer helpers ---------- */
function centerPointer() {
  pointer.style.transition = 'transform 0.25s ease-out, opacity 0.25s ease-out';
  pointer.style.opacity = '0.85';
  pointer.style.transform = `translate(${screenCenterX}px, ${screenCenterY}px)`;
}

/* ---------- Core movement ---------- */
function moveStick(clientX, clientY) {
  const rect = joystick.getBoundingClientRect();

  let x = clientX - rect.left - centerX;
  let y = clientY - rect.top - centerY;

  const distance = Math.sqrt(x * x + y * y);
  currentForce = Math.min(distance / radius, 1);

  if (distance > radius) {
    x *= radius / distance;
    y *= radius / distance;
  }

  /* mover stick visual */
  stick.style.transform = `translate(${x}px, ${y}px)`;

  /* ángulo corregido (arriba = arriba) */
  currentAngle = Math.atan2(y, x);

  /* mover puntero */
  if (currentForce > 0.15) {
    pointer.style.opacity = '0.9';

    const pointerDistance = 80;
    const px = Math.cos(currentAngle) * pointerDistance;
    const py = Math.sin(currentAngle) * pointerDistance;

    pointer.style.transform = `translate(
      ${screenCenterX + px}px,
      ${screenCenterY + py}px
    )`;
  } else {
    pointer.style.opacity = '0';
  }

  /* debug (opcional) */
  console.log({
    x: (x / radius).toFixed(2),
    y: (y / radius).toFixed(2),
    angle: (currentAngle * 180 / Math.PI).toFixed(1),
    force: currentForce.toFixed(2)
  });
}

/* ================================
   TOUCH EVENTS (MOBILE)
   ================================ */

joystick.addEventListener('touchstart', e => {
  e.preventDefault();
  if (activeTouchId === null && e.touches.length > 0) {
    const t = e.touches[0];
    activeTouchId = t.identifier;
    moveStick(t.clientX, t.clientY);
  }
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

joystick.addEventListener('touchend', e => {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (t.identifier === activeTouchId) {
      activeTouchId = null;
      stick.style.transform = 'translate(-50%, -50%)';
      centerPointer();
      break;
    }
  }
}, { passive: false });

/* ================================
   MOUSE EVENTS (PC TESTING)
   ================================ */

joystick.addEventListener('mousedown', e => {
  if (e.button !== 0) return;

  moveStick(e.clientX, e.clientY);

  const onMove = ev => moveStick(ev.clientX, ev.clientY);
  const onUp = () => {
    stick.style.transform = 'translate(-50%, -50%)';
    centerPointer();
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  };

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
});

/* ================================
   CLICK BUTTON (TEST)
   ================================ */

clickBtn.addEventListener('click', () => {
  alert('CLICK virtual');
});

/* ---------- init ---------- */
centerPointer();
