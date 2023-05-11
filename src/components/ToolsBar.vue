<template>
  <div class="tools-bar">
    <Tools
      v-for="tool in state.tools"
      :key="tool.name"
      :tools="tool"
      @click="onEnable(tool)"
    />
  </div>
  <RightBar
    v-if="state.currentTools"
    :historyRecord="historyRecord"
    :currentTools="state.currentTools"
    :canvas="canvas"
    :canvasBackup="canvasBackup"
  />
  <a-modal v-model:visible="visible" title="模板参数设置" @ok="handleOk">
    <a-form
      :model="formState"
      name="basic"
      :label-col="{ span: 8 }"
      :wrapper-col="{ span: 16 }"
      autocomplete="off"
    >
      <a-form-item
        label="leftArm"
        name="leftArm"
        :rules="[{ required: true, message: '请输入左胳膊偏移角度' }]"
      >
        <a-input type="number" v-model:value="formState.leftArm" />
      </a-form-item>
      <a-form-item
        label="rightArm"
        name="rightArm"
        :rules="[{ required: true, message: '请输入右胳膊偏移角度' }]"
      >
        <a-input type="number" v-model:value="formState.rightArm" />
      </a-form-item>
      <a-form-item
        label="leftLeg"
        name="leftLeg"
        :rules="[{ required: true, message: '请输入左腿偏移角度' }]"
      >
        <a-input type="number" v-model:value="formState.leftLeg" />
      </a-form-item>
      <a-form-item
        label="rightLeg"
        name="rightLeg"
        :rules="[{ required: true, message: '请输入右腿偏移角度' }]"
      >
        <a-input type="number" v-model:value="formState.rightLeg" />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script lang="ts">
import { onMounted, reactive, defineComponent, ref } from "vue";
import bindkey from "@w-xuefeng/bindkey";
import HistoryRecord from "../core/base/HistoryRecord";

import Pencil from "../core/tools/Pencil";
import Rubber from "../core/tools/Rubber";
import Line from "../core/tools/Line";
import Circle from "../core/tools/Circle";
import Square from "../core/tools/Square";
import Graffiti from "../core/tools/Graffiti";
import Template from "../core/tools/Template";
import CreateAnimation from "../core/tools/CreatAnimation";
import DND from "../core/utils/DND";

import BaseDrawTools from "../core/base/BaseDrawTools";
import Tools from "./Tools.vue";
import RightBar from "./RightBar.vue";
import type { IDarwToolsBarState } from "../typing";

interface FormState {
  leftArm: number;
  rightArm: number;
  leftLeg: number;
  rightLeg: number;
}

export default defineComponent({
  name: "ToolsBar",
  emits: ["onStyleChange"],
  props: {
    canvas: {
      type: HTMLCanvasElement,
      required: true,
    },
    canvasBackup: {
      type: HTMLCanvasElement,
      required: true,
    },
    historyRecord: {
      type: HistoryRecord,
      required: true,
    },
  },
  components: { Tools, RightBar },
  setup(props, vueCTX) {
    const state = reactive<IDarwToolsBarState>({
      currentTools: null,
      tools: [],
    });
    // 火柴人参数设置弹窗
    const visible = ref(false);
    // 火柴人参数
    const formState = reactive<FormState>({
      leftArm: 0,
      rightArm: 0,
      leftLeg: 0,
      rightLeg: 0,
    });
    // 首尾帧参数
    const firstAndLastFrame: unknown[] = [];

    const showModal = () => {
      visible.value = true;
    };
    const handleOk = (e: unknown) => {
      visible.value = false;
      firstAndLastFrame.push({
        leftArm:
          typeof formState?.leftArm === "string"
            ? parseFloat(formState?.leftArm)
            : formState?.leftArm,
        rightArm:
          typeof formState?.rightArm === "string"
            ? parseFloat(formState?.rightArm)
            : formState?.rightArm,
        leftLeg:
          typeof formState?.leftLeg === "string"
            ? parseFloat(formState?.leftLeg)
            : formState?.leftLeg,
        rightLeg:
          typeof formState?.rightLeg === "string"
            ? parseFloat(formState?.rightLeg)
            : formState?.rightLeg,
      });
      if (firstAndLastFrame.length > 2) {
        firstAndLastFrame.shift();
      }
    };

    const bindKeyToTools = (tool: BaseDrawTools) => {
      tool.key && bindkey.add(tool.key, () => onEnable(tool));
      return tool;
    };

    const drawPeople = (
      formState: FormState,
      ctx: CanvasRenderingContext2D
    ) => {
      // head size
      const hearRadii = 30;
      // body size
      const bodyWidth = 80;
      const bodyHeight = 120;
      // arm size
      const armLength = 80;
      const armRough = 20;
      // leg size
      const legLength = 90;
      const legRough = 18;
      // Polar coordinates
      // 以Y轴正方向为极坐标

      const head = (startX: number, startY: number) => {
        const x = startX;
        const y = startY - hearRadii;
        const radius = hearRadii;
        const startAngle = 0;
        const endAngle = Math.PI * 2;
        ctx.arc(x, y, radius, startAngle, endAngle);
      };

      const body = (startX: number, startY: number) => {
        const x = startX - bodyWidth / 2;
        const y = startY;
        const width = bodyWidth;
        const height = bodyHeight;
        ctx.fillRect(x, y, width, height);
      };

      const arm = (
        startX: number,
        startY: number,
        leftRadius: number = 45,
        rightRadius: number = 45
      ) => {
        // left
        const leftStartX = startX - bodyWidth / 2 - 15;
        const leftStartY = startY;
        const leftEndX = leftStartX - armLength * Math.sin(leftRadius);
        const leftEndY = leftStartY + armLength * Math.cos(leftRadius);
        ctx.lineWidth = armRough;
        ctx.moveTo(leftStartX, leftStartY);
        ctx.lineTo(leftEndX, leftEndY);
        // right
        const rightStartX = startX + bodyWidth / 2 + 15;
        const rightStartY = startY;
        const rightEndX = rightStartX + armLength * Math.sin(rightRadius);
        const rightEndY = rightStartY + armLength * Math.cos(rightRadius);
        ctx.moveTo(rightStartX, rightStartY);
        ctx.lineTo(rightEndX, rightEndY);
      };

      const leg = (
        startX: number,
        startY: number,
        leftRadius: number = 45,
        rightRadius: number = 45
      ) => {
        // left
        const leftStartX = startX - bodyWidth / 2 + legRough;
        const leftStartY = startY + bodyHeight;
        const leftEndX = leftStartX - legLength * Math.sin(leftRadius);
        const leftEndY = leftStartY + legLength * Math.cos(leftRadius);
        ctx.lineWidth = legRough;
        ctx.moveTo(leftStartX, leftStartY);
        ctx.lineTo(leftEndX, leftEndY);
        // right
        const rightStartX = startX + bodyWidth / 2 - legRough;
        const rightStartY = startY + bodyHeight;
        const rightEndX = rightStartX + legLength * Math.sin(rightRadius);
        const rightEndY = rightStartY + legLength * Math.cos(rightRadius);
        ctx.moveTo(rightStartX, rightStartY);
        ctx.lineTo(rightEndX, rightEndY);
      };
    };

    const creat = () => {
      console.log(firstAndLastFrame);
      const a = document.createElement("a");
      const canvas = document.createElement("canvas");
      canvas.width = 500;
      canvas.height = 500;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#fff";
        ctx.lineWidth = 10;
        ctx.fillRect(0, 0, 500, 500);
        ctx.arc(250, 250, 245, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.drawImage(canvas, 0, 0);
        a.href = canvas.toDataURL(`image/png`, 1);
        a.download = `drawing.png`;
        a.click();
      }
    };

    const onEnable = (currentTool: BaseDrawTools) => {
      state.tools
        .filter((tool) => currentTool !== tool)
        .forEach((tool) => tool.disable());
      state.currentTools = currentTool;
      if (currentTool.key === "T") {
        showModal();
      }
      if (currentTool.key === "A") {
        creat();
      }
      state.currentTools.enable();
      vueCTX.emit("onStyleChange", {
        cursor: state.currentTools.cursor || "auto",
      });
    };

    const initTools = () => {
      const pencil = new Pencil(
        props.canvas,
        props.canvasBackup,
        props.historyRecord,
        "B"
      );

      const rubber = new Rubber(
        props.canvas,
        props.canvasBackup,
        props.historyRecord,
        "E"
      );

      const line = new Line(
        props.canvas,
        props.canvasBackup,
        props.historyRecord,
        "L"
      );
      const circle = new Circle(
        props.canvas,
        props.canvasBackup,
        props.historyRecord,
        "C"
      );

      const square = new Square(
        props.canvas,
        props.canvasBackup,
        props.historyRecord,
        "S"
      );
      const graffiti = new Graffiti(
        props.canvas,
        props.canvasBackup,
        props.historyRecord,
        "G"
      );

      const template = new Template(
        props.canvas,
        props.canvasBackup,
        props.historyRecord,
        formState,
        "T"
      );
      const creatAnimation = new CreateAnimation(
        props.canvas,
        props.canvasBackup,
        props.historyRecord,
        formState,
        "A"
      );

      new DND(props.canvas, props.canvasBackup, props.historyRecord);

      const tools = [
        pencil,
        rubber,
        line,
        circle,
        square,
        graffiti,
        template,
        creatAnimation,
      ];

      return tools.map(bindKeyToTools);
    };

    const initFunctionShortKey = () => {
      bindkey.add("Ctrl+L", () => state.currentTools?.clearContext(true, true));
      bindkey.add("Ctrl+Z", () => state.currentTools?.undo());
      bindkey.add("Ctrl+Y", () => state.currentTools?.redo());
    };

    const init = () => {
      state.tools = initTools();
      initFunctionShortKey();
      onEnable(state.tools[0]);
      state.currentTools?.clearContext(true, true, "初始化画板");
    };

    onMounted(init);

    return { state, onEnable, visible, showModal, handleOk, formState };
  },
});
</script>

<style scoped>
.tools-bar {
  width: 90%;
  height: 60px;
  min-width: 300px;
  position: fixed;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--theme-tools-bar-background-color);
  border-radius: 30px;
  z-index: 2;
  display: flex;
  align-items: center;
  padding: 0 20px;
}
</style>
