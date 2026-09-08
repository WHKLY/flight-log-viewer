(() => {
  "use strict";

  const MAGENTA = "#ff4dff";
  const NAV_BLUE = "#4db6ff";
  const OWN_SHIP = "#f2c36b";
  const SKY = "#408ec4";
  const GROUND = "#7a5430";

  function finite(value) {
    return Number.isFinite(Number(value));
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function hudNumber(value, digits = 0) {
    return finite(value) ? Number(value).toFixed(digits) : "---";
  }

  function cssVar(name, fallback) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
  }

  function canvasFont(px, weight = 600) {
    const scale = Number(cssVar("--font-scale", "1")) || 1;
    return `${weight} ${Math.round(px * scale)}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
  }

  function setupCanvas(canvas) {
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width || 320);
    const height = Math.max(1, rect.height || 430);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    const scale = Math.min(1, width / 320);
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    ctx.clearRect(0, 0, width / scale, height / scale);
    return { ctx, width: width / scale, height: height / scale };
  }

  function roundRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawPanel(ctx, width, height) {
    ctx.save();
    ctx.fillStyle = "rgba(7, 15, 14, 0.62)";
    ctx.strokeStyle = "rgba(232, 255, 247, 0.42)";
    ctx.lineWidth = 1;
    roundRect(ctx, 0.5, 0.5, width - 1, height - 1, 16);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawTape(ctx, x, y, width, height, value, label, unit, align, targetValue) {
    ctx.save();
    ctx.fillStyle = "rgba(10, 23, 20, 0.74)";
    ctx.strokeStyle = "rgba(239, 255, 250, 0.56)";
    ctx.lineWidth = 1;
    roundRect(ctx, x, y, width, height, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#eefbf6";
    ctx.textAlign = "center";
    ctx.font = canvasFont(10);
    ctx.fillText(label, x + width / 2, y + 15);
    ctx.font = canvasFont(18, 700);
    ctx.fillText(hudNumber(value, 1), x + width / 2, y + height / 2 + 6);
    ctx.font = canvasFont(9);
    ctx.fillText(unit, x + width / 2, y + height - 10);

    if (finite(value)) {
      const step = unit === "m" ? 10 : 2;
      ctx.strokeStyle = "rgba(238, 251, 246, 0.44)";
      ctx.fillStyle = "rgba(238, 251, 246, 0.82)";
      ctx.font = canvasFont(9);
      for (let offset = -2; offset <= 2; offset++) {
        if (!offset) continue;
        const tickY = y + height / 2 - offset * 22;
        if (tickY < y + 24 || tickY > y + height - 24) continue;
        const tickValue = Number(value) + offset * step;
        ctx.beginPath();
        if (align === "left") {
          ctx.moveTo(x + width - 14, tickY);
          ctx.lineTo(x + width - 4, tickY);
          ctx.textAlign = "right";
          ctx.fillText(hudNumber(tickValue, 0), x + width - 17, tickY + 3);
        } else {
          ctx.moveTo(x + 4, tickY);
          ctx.lineTo(x + 14, tickY);
          ctx.textAlign = "left";
          ctx.fillText(hudNumber(tickValue, 0), x + 17, tickY + 3);
        }
        ctx.stroke();
      }
    }

    if (finite(value) && finite(targetValue)) {
      const step = unit === "m" ? 10 : 2;
      const targetY = clamp(y + height / 2 - ((Number(targetValue) - Number(value)) / step) * 22, y + 25, y + height - 25);
      ctx.fillStyle = MAGENTA;
      ctx.beginPath();
      if (align === "left") {
        ctx.moveTo(x + width - 4, targetY);
        ctx.lineTo(x + width - 18, targetY - 7);
        ctx.lineTo(x + width - 18, targetY + 7);
      } else {
        ctx.moveTo(x + 4, targetY);
        ctx.lineTo(x + 18, targetY - 7);
        ctx.lineTo(x + 18, targetY + 7);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawHeading(ctx, x, y, width, height, heading, targetHeading, navHeading) {
    ctx.save();
    ctx.fillStyle = "rgba(10, 23, 20, 0.74)";
    ctx.strokeStyle = "rgba(239, 255, 250, 0.56)";
    roundRect(ctx, x, y, width, height, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#eefbf6";
    ctx.textAlign = "center";
    ctx.font = canvasFont(10);
    ctx.fillText("HDG", x + width / 2, y + 14);
    ctx.font = canvasFont(17, 700);
    ctx.fillText(finite(heading) ? String(Math.round((Number(heading) + 360) % 360)).padStart(3, "0") : "---", x + width / 2, y + height - 10);

    if (finite(heading)) {
      const center = x + width / 2;
      ctx.strokeStyle = "rgba(238, 251, 246, 0.44)";
      ctx.fillStyle = "rgba(238, 251, 246, 0.82)";
      ctx.font = canvasFont(9);
      for (let offset = -30; offset <= 30; offset += 10) {
        const tx = center + offset * (width / 86);
        const h = (Math.round(Number(heading) / 10) * 10 + offset + 360) % 360;
        ctx.beginPath();
        ctx.moveTo(tx, y + 18);
        ctx.lineTo(tx, y + (offset % 30 === 0 ? 32 : 26));
        ctx.stroke();
        if (offset % 30 === 0) ctx.fillText(String(h).padStart(3, "0"), tx, y + 45);
      }
      const bugX = (target) => {
        let delta = ((Number(target) - Number(heading) + 540) % 360) - 180;
        delta = clamp(delta, -43, 43);
        return center + delta * (width / 86);
      };
      if (finite(navHeading)) drawHeadingBug(ctx, bugX(navHeading), y + 20, NAV_BLUE, "down");
      if (finite(targetHeading)) drawHeadingBug(ctx, bugX(targetHeading), y + height - 11, MAGENTA, "up");
      drawHeadingBug(ctx, center, y + 18, OWN_SHIP, "down");
    }
    ctx.restore();
  }

  function drawHeadingBug(ctx, x, y, color, direction) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    if (direction === "up") {
      ctx.moveTo(x, y);
      ctx.lineTo(x - 7, y - 12);
      ctx.lineTo(x + 7, y - 12);
    } else {
      ctx.moveTo(x, y);
      ctx.lineTo(x - 7, y + 12);
      ctx.lineTo(x + 7, y + 12);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawAttitude(ctx, x, y, width, height, values) {
    const cx = x + width / 2;
    const cy = y + height / 2;
    const radius = Math.min(width, height) * 0.43;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();

    if (!finite(values.roll) || !finite(values.pitch)) {
      ctx.fillStyle = "rgba(28, 42, 36, 0.96)";
      ctx.fillRect(x, y, width, height);
      ctx.fillStyle = "#c9d8d1";
      ctx.textAlign = "center";
      ctx.font = canvasFont(13);
      ctx.fillText("ATT missing", cx, cy);
      ctx.restore();
      drawAttitudeFrame(ctx, cx, cy, radius, null);
      return;
    }

    const roll = (Number(values.roll) * Math.PI) / 180;
    const pitchOffset = clamp(Number(values.pitch), -45, 45) * (radius / 25);
    ctx.translate(cx, cy);
    ctx.rotate(-roll);
    ctx.translate(0, pitchOffset);
    ctx.fillStyle = SKY;
    ctx.fillRect(-width, -height * 2, width * 2, height * 2);
    ctx.fillStyle = GROUND;
    ctx.fillRect(-width, 0, width * 2, height * 2);
    ctx.strokeStyle = "#f7fff9";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-width, 0);
    ctx.lineTo(width, 0);
    ctx.stroke();
    ctx.strokeStyle = "rgba(247, 255, 249, 0.72)";
    ctx.lineWidth = 1;
    for (let pitch = -30; pitch <= 30; pitch += 10) {
      if (pitch === 0) continue;
      const py = -pitch * (radius / 25);
      const half = pitch % 20 === 0 ? radius * 0.38 : radius * 0.24;
      ctx.beginPath();
      ctx.moveTo(-half, py);
      ctx.lineTo(half, py);
      ctx.stroke();
    }
    ctx.restore();

    drawDemandCue(ctx, cx, cy, radius, values.navRoll, values.navPitch, values.roll, values.pitch, NAV_BLUE);
    drawDemandCue(ctx, cx, cy, radius, values.desRoll, values.desPitch, values.roll, values.pitch, MAGENTA);
    drawAttitudeFrame(ctx, cx, cy, radius, roll);
  }

  function drawDemandCue(ctx, cx, cy, radius, rollValue, pitchValue, fallbackRoll, fallbackPitch, color) {
    if (!finite(rollValue) && !finite(pitchValue)) return;
    const roll = ((finite(rollValue) ? Number(rollValue) : Number(fallbackRoll)) * Math.PI) / 180;
    const pitch = finite(pitchValue) ? Number(pitchValue) : Number(fallbackPitch);
    const pitchOffset = -clamp(pitch, -45, 45) * (radius / 25);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(roll);
    ctx.translate(0, pitchOffset);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-radius * 0.3, 0);
    ctx.lineTo(-radius * 0.09, 0);
    ctx.moveTo(radius * 0.09, 0);
    ctx.lineTo(radius * 0.3, 0);
    ctx.moveTo(0, -radius * 0.12);
    ctx.lineTo(0, radius * 0.12);
    ctx.stroke();
    ctx.restore();
  }

  function drawAttitudeFrame(ctx, cx, cy, radius, roll) {
    ctx.save();
    ctx.strokeStyle = "rgba(239, 255, 250, 0.72)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = OWN_SHIP;
    ctx.fillStyle = OWN_SHIP;
    ctx.beginPath();
    ctx.moveTo(cx - radius * 0.5, cy);
    ctx.lineTo(cx - radius * 0.15, cy);
    ctx.moveTo(cx + radius * 0.15, cy);
    ctx.lineTo(cx + radius * 0.5, cy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx - 11, cy + 20);
    ctx.lineTo(cx + 11, cy + 20);
    ctx.closePath();
    ctx.fill();
    if (finite(roll)) {
      ctx.translate(cx, cy);
      ctx.rotate(Number(roll));
      ctx.fillStyle = "#ff9387";
      ctx.beginPath();
      ctx.moveTo(0, -radius - 8);
      ctx.lineTo(-7, -radius + 8);
      ctx.lineTo(7, -radius + 8);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawLabels(ctx, width, values) {
    const mission = values.mission || {};
    ctx.save();
    ctx.fillStyle = "#eefbf6";
    ctx.font = canvasFont(11);
    ctx.textAlign = "left";
    const leftWidth = (width - 36) * 0.56;
    const rightWidth = (width - 36) * 0.44;
    ctx.fillText(`${values.modeName || "MODE ?"} | ${mission.label || "mission missing"}`, 14, 22, leftWidth);
    ctx.fillStyle = mission.override ? MAGENTA : "rgba(238, 251, 246, 0.82)";
    ctx.fillText(mission.route || mission.source || "source missing", 14, 40, leftWidth);
    ctx.textAlign = "right";
    ctx.fillStyle = MAGENTA;
    ctx.fillText(`T SPD ${hudNumber(values.targetSpeed, 1)}  ALT ${hudNumber(values.targetAltitude, 0)}`, width - 14, 22, rightWidth);
    ctx.fillStyle = NAV_BLUE;
    ctx.fillText(`NAV R ${hudNumber(values.navRoll, 1)}  P ${hudNumber(values.navPitch, 1)}`, width - 14, 40, rightWidth);
    ctx.restore();
  }

  function draw(canvas, values = {}) {
    if (!canvas) return;
    const { ctx, width, height } = setupCanvas(canvas);
    drawPanel(ctx, width, height);
    drawLabels(ctx, width, values);

    const margin = 14;
    const tapeWidth = clamp(width * 0.2, 56, 76);
    const headingHeight = clamp(height * 0.14, 54, 70);
    const top = 54;
    const bottom = height - headingHeight - 12;
    const centerLeft = margin + tapeWidth + 8;
    const centerWidth = width - (margin + tapeWidth + 8) * 2;
    const attitudeHeight = Math.max(120, bottom - top);
    const speed = finite(values.airSpeed) ? values.airSpeed : values.groundSpeed;
    const speedLabel = finite(values.airSpeed) ? "IAS" : "GS";
    drawTape(ctx, margin, top, tapeWidth, attitudeHeight, speed, speedLabel, "m/s", "left", values.targetSpeed);
    if (finite(values.airSpeed) && finite(values.groundSpeed)) {
      ctx.fillStyle = "#d5e5df";
      ctx.font = canvasFont(10);
      ctx.textAlign = "center";
      ctx.fillText(`GS ${hudNumber(values.groundSpeed, 1)}`, margin + tapeWidth / 2, bottom + 13);
    }
    drawTape(ctx, width - margin - tapeWidth, top, tapeWidth, attitudeHeight, values.altitude, "ALT", "m", "right", values.targetAltitude);
    drawAttitude(ctx, centerLeft, top, centerWidth, attitudeHeight, values);
    drawHeading(ctx, centerLeft, height - headingHeight - 8, centerWidth, headingHeight, values.heading, values.targetHeading, values.navHeading);
  }

  window.TrackHud = { draw };
})();
