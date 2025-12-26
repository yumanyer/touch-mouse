
const mockJoystickEvent = {
    type: "control",
    event: {
        type: "joystickMove",
        dx: 0.5,
        dy: -0.5
    }
};

let joystickInterval = null;
let currentDX = 0;
let currentDY = 0;
const SENSITIVITY = 10;

function handleControlEvent(event) {
  if (event.type === "joystickMove") {
    currentDX = event.dx;
    currentDY = event.dy;
    
    if (currentDX !== 0 || currentDY !== 0) {
      if (!joystickInterval) {
        joystickInterval = setInterval(() => {
          console.log(`[SIMULACIÓN] Moviendo cursor: dx=${(currentDX * SENSITIVITY).toFixed(2)}, dy=${(currentDY * SENSITIVITY).toFixed(2)}`);
        }, 100); // Más lento para el log
      }
    } else {
      if (joystickInterval) {
        clearInterval(joystickInterval);
        joystickInterval = null;
        console.log("[SIMULACIÓN] Joystick detenido");
      }
    }
  }
}

console.log("Iniciando prueba de joystick...");
handleControlEvent(mockJoystickEvent.event);

setTimeout(() => {
    console.log("Deteniendo joystick...");
    handleControlEvent({ type: "joystickMove", dx: 0, dy: 0 });
    setTimeout(() => process.exit(0), 500);
}, 1000);
