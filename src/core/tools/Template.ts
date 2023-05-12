import BaseDrawTools from "../base/BaseDrawTools";
import HistoryRecord from "../base/HistoryRecord";

interface TinderParams {
  leftArm: number;
  rightArm: number;
  leftLeg: number;
  rightLeg: number;
}
export default class Template extends BaseDrawTools {
  tinderParams: TinderParams;
  constructor(
    canvas: HTMLCanvasElement,
    canvasBackup: HTMLCanvasElement,
    historyRecord: HistoryRecord,
    tinderParams: TinderParams,
    key?: string
  ) {
    super(
      "模板",
      "panorama_fish_eye",
      canvas,
      canvasBackup,
      historyRecord,
      "crosshair",
      key
    );
    this.tinderParams = tinderParams;
  }
  // head size
  hearRadii = 30;
  // body size
  bodyWidth = 80;
  bodyHeight = 120;
  // arm size
  armLength = 80;
  armRough = 20;
  // leg size
  legLength = 90;
  legRough = 18;
  // Polar coordinates
  // 以Y轴正方向为极坐标

  head(startX: number, startY: number) {
    const x = startX;
    const y = startY - this.hearRadii;
    const radius = this.hearRadii;
    const startAngle = 0;
    const endAngle = Math.PI * 2;
    this.ctxBackup.arc(x, y, radius, startAngle, endAngle);
  }
  body(startX: number, startY: number) {
    const x = startX - this.bodyWidth / 2;
    const y = startY;
    const width = this.bodyWidth;
    const height = this.bodyHeight;
    this.ctxBackup.fillRect(x, y, width, height);
  }
  arm(
    startX: number,
    startY: number,
    leftRadius: number = 45,
    rightRadius: number = 45
  ) {
    // left
    const leftStartX = startX - this.bodyWidth / 2 - 15;
    const leftStartY = startY;
    const leftEndX = leftStartX - this.armLength * Math.sin(leftRadius);
    const leftEndY = leftStartY + this.armLength * Math.cos(leftRadius);
    this.ctxBackup.lineWidth = this.armRough;
    this.ctxBackup.moveTo(leftStartX, leftStartY);
    this.ctxBackup.lineTo(leftEndX, leftEndY);
    // right
    const rightStartX = startX + this.bodyWidth / 2 + 15;
    const rightStartY = startY;
    const rightEndX = rightStartX + this.armLength * Math.sin(rightRadius);
    const rightEndY = rightStartY + this.armLength * Math.cos(rightRadius);
    this.ctxBackup.moveTo(rightStartX, rightStartY);
    this.ctxBackup.lineTo(rightEndX, rightEndY);
  }
  leg(
    startX: number,
    startY: number,
    leftRadius: number = 45,
    rightRadius: number = 45
  ) {
    // left
    const leftStartX = startX - this.bodyWidth / 2 + this.legRough;
    const leftStartY = startY + this.bodyHeight;
    const leftEndX = leftStartX - this.legLength * Math.sin(leftRadius);
    const leftEndY = leftStartY + this.legLength * Math.cos(leftRadius);
    this.ctxBackup.lineWidth = this.legRough;
    this.ctxBackup.moveTo(leftStartX, leftStartY);
    this.ctxBackup.lineTo(leftEndX, leftEndY);
    // right
    const rightStartX = startX + this.bodyWidth / 2 - this.legRough;
    const rightStartY = startY + this.bodyHeight;
    const rightEndX = rightStartX + this.legLength * Math.sin(rightRadius);
    const rightEndY = rightStartY + this.legLength * Math.cos(rightRadius);
    this.ctxBackup.moveTo(rightStartX, rightStartY);
    this.ctxBackup.lineTo(rightEndX, rightEndY);
  }
  draw() {
    const noop = () => {};
    return {
      onmousedown: (e: MouseEvent) => {
        console.log("***", this.tinderParams);
        const { clientX: x, clientY: y } = this.getClientPostion(e);
        this.clearContext();
        if (this.canDraw) {
          this.ctxBackup.beginPath();
          this.ctxBackup.strokeStyle = this.color;
          this.ctxBackup.fillStyle = this.color;
          this.head(x, y);
          this.body(x, y);
          this.arm(
            x,
            y,
            (this.tinderParams?.leftArm / 360) * Math.PI * 2,
            (this.tinderParams?.rightArm / 360) * Math.PI * 2
          );
          this.leg(
            x,
            y,
            (this.tinderParams?.leftLeg / 360) * Math.PI * 2,
            (this.tinderParams?.rightLeg / 360) * Math.PI * 2
          );
          this.ctxBackup.fill();
          this.ctxBackup.stroke();
        }
      },
      onmousemove: (
        e: MouseEvent,
        options?: { startX: number; startY: number }
      ) => {
        this.clearContext();
        const { clientX: x, clientY: y } = this.getClientPostion(e);
        if (this.canDraw && options) {
          const { startX, startY } = options;
          this.ctxBackup.beginPath();
          let radii = Math.sqrt(
            (startX - x) * (startX - x) + (startY - y) * (startY - y)
          );
          this.ctxBackup.arc(startX, startY, radii, 0, Math.PI * 2, false);
          this.ctxBackup.stroke();
        } else {
          this.ctxBackup.beginPath();
          this.ctxBackup.arc(x, y, 20, 0, Math.PI * 2, false);
          this.ctxBackup.stroke();
        }
      },
      onmouseup: noop,
      onmouseout: (_: MouseEvent) => {
        this.clearContext();
      },
    };
  }
}
