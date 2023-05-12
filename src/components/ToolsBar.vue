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

import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";
const ffmpeg = createFFmpeg({ log: false });

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
    const firstAndLastFrame: FormState[] = [];

    // 合成视频
    const imgs = ref([]);
    const videoUrl = ref(""); //视频链接
    const loggerText = ref(""); //合成日志
    const isFinish = ref(true); // 是否合成完成
    const frameNumber = ref(""); // 帧数

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

    // 绘制火柴人
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
        ctx.beginPath();
        ctx.arc(x, y, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = "black";
        ctx.fill();
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
      // ctx.fillRect(0, 0, 500, 500);
      ctx.fillStyle = "fff";
      ctx.strokeStyle = "fff";
      head(250, 100);
      body(250, 100);
      arm(
        250,
        100,
        (formState?.leftArm / 360) * Math.PI * 2,
        (formState?.rightArm / 360) * Math.PI * 2
      );
      leg(
        250,
        100,
        (formState?.leftLeg / 360) * Math.PI * 2,
        (formState?.rightLeg / 360) * Math.PI * 2
      );
      ctx.fill();
      ctx.stroke();
    };

    const imgToVideo = async () => {
      if (!ffmpeg.isLoaded()) {
        await ffmpeg.load();
      }
      for (let i in imgs.value) {
        ffmpeg.FS("writeFile", `${i}.png`, await fetchFile(imgs.value[i]));
      }
      console.log("writeFile done!");

      // 读取进度
      ffmpeg.setProgress(({ ratio }) => {
        isFinish.value = ratio == 1 ? true : false;
      });
      // 读取消息日志
      ffmpeg.setLogger((res) => {
        loggerText.value = res.message;
      });

      // const count = frameNumber.value.toString() || "1"; //FPS
      // const time = (imgs.value.length / count).toString(); //视频时长,不刻意设置也能符合预期，只是重新合成视频会是之前的时长
      const count = "60";
      const time = "2";

      await ffmpeg.run(
        "-r",
        count,
        "-f",
        "image2",
        "-i",
        "%d.png",
        "-t",
        time,
        "video.mp4"
      );

      const data = ffmpeg.FS("readFile", "video.mp4");
      videoUrl.value = URL.createObjectURL(
        new Blob([data.buffer], { type: "video/mp4" })
      );
      console.log(videoUrl);
      setTimeout(() => {
        downloadVideo();
      }, 500);
    };
    const downloadVideo = () => {
      const request = new XMLHttpRequest();
      request.open("GET", videoUrl.value);
      request.responseType = "blob";
      request.onload = (res) => {
        if (res.target.status == 200) {
          const url = window.URL.createObjectURL(res.currentTarget.response);
          const link = document.createElement("a");
          link.href = url;
          link.setAttribute("download", `${new Date().getTime()}.mp4`);
          link.click();
        }
      };
      request.send();
    };

    const creat = () => {
      if (firstAndLastFrame.length < 2) return;
      const [firstFrame, lastFrame] = firstAndLastFrame;
      const numOfInter = 60;
      const interData: FormState[] = [];
      for (let i = 0; i <= numOfInter; i++) {
        interData.push({
          leftArm:
            (1 - i / numOfInter) * firstFrame?.leftArm +
            (i / numOfInter) * lastFrame?.leftArm,
          rightArm:
            (1 - i / numOfInter) * firstFrame?.rightArm +
            (i / numOfInter) * lastFrame?.rightArm,
          leftLeg:
            (1 - i / numOfInter) * firstFrame?.leftLeg +
            (i / numOfInter) * lastFrame?.leftLeg,
          rightLeg:
            (1 - i / numOfInter) * firstFrame?.rightLeg +
            (i / numOfInter) * lastFrame?.rightLeg,
        });
      }

      const canvas = document.createElement("canvas");
      canvas.width = 500;
      canvas.height = 500;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        ctx.fillStyle = "#fff";
        ctx.lineWidth = 10;
        for (let i of interData) {
          ctx.clearRect(0, 0, 500, 500);
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, 500, 500);
          drawPeople(i, ctx);
          ctx.drawImage(canvas, 0, 0);
          const href = canvas.toDataURL(`image/png`, 1);
          imgs.value.push(href);
        }
        imgToVideo();
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
