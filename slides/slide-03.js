// slide-03.js - 个人简介
const pptxgen = require("pptxgenjs");

const slideConfig = {
  type: 'content',
  index: 3,
  title: '个人简介'
};

function createSlide(pres, theme) {
  const slide = pres.addSlide();
  slide.background = { color: theme.bg };

  // 顶部装饰条
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.08,
    fill: { color: theme.accent }
  });

  // 页面标题
  slide.addText("01", {
    x: 0.5, y: 0.3, w: 0.8, h: 0.6,
    fontSize: 32, fontFace: "Arial",
    color: theme.accent, bold: true, align: "left"
  });

  slide.addText("个人简介", {
    x: 1.3, y: 0.35, w: 3, h: 0.5,
    fontSize: 28, fontFace: "Microsoft YaHei",
    color: theme.primary, bold: true, align: "left"
  });

  // 左侧 - 基本信息卡片
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 1.2, w: 4.2, h: 3.8,
    fill: { color: theme.primary }
  });

  // 头像占位（圆形）
  slide.addShape(pres.shapes.OVAL, {
    x: 1.9, y: 1.5, w: 1.4, h: 1.4,
    fill: { color: theme.secondary }
  });

  slide.addText("Lb", {
    x: 1.9, y: 1.5, w: 1.4, h: 1.4,
    fontSize: 28, fontFace: "Microsoft YaHei",
    color: "FFFFFF", bold: true,
    align: "center", valign: "middle"
  });

  // 姓名和身份
  slide.addText("Lb", {
    x: 0.5, y: 3.0, w: 4.2, h: 0.5,
    fontSize: 22, fontFace: "Microsoft YaHei",
    color: "FFFFFF", bold: true, align: "center"
  });

  slide.addText("全栈开发工程师", {
    x: 0.5, y: 3.45, w: 4.2, h: 0.4,
    fontSize: 14, fontFace: "Microsoft YaHei",
    color: theme.light, bold: false, align: "center"
  });

  // 基本信息列表
  const infoItems = [
    { label: "年级", value: "大三" },
    { label: "专业", value: "软件工程" },
    { label: "方向", value: "全栈开发" }
  ];

  infoItems.forEach((item, index) => {
    const y = 4.0 + index * 0.32;
    slide.addText(item.label + "：" + item.value, {
      x: 0.8, y: y, w: 3.6, h: 0.3,
      fontSize: 12, fontFace: "Microsoft YaHei",
      color: theme.light, bold: false, align: "center"
    });
  });

  // 右侧 - 教育背景
  slide.addText("教育背景", {
    x: 5.0, y: 1.2, w: 4.5, h: 0.5,
    fontSize: 18, fontFace: "Microsoft YaHei",
    color: theme.primary, bold: true, align: "left"
  });

  // 学校信息卡片
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 5.0, y: 1.8, w: 4.5, h: 1.2,
    fill: { color: theme.light, transparency: 50 }
  });

  slide.addShape(pres.shapes.RECTANGLE, {
    x: 5.0, y: 1.8, w: 0.08, h: 1.2,
    fill: { color: theme.accent }
  });

  slide.addText("软件工程专业", {
    x: 5.3, y: 1.95, w: 4, h: 0.4,
    fontSize: 16, fontFace: "Microsoft YaHei",
    color: theme.primary, bold: true, align: "left"
  });

  slide.addText("计算机学院 · 本科三年级", {
    x: 5.3, y: 2.4, w: 4, h: 0.35,
    fontSize: 12, fontFace: "Microsoft YaHei",
    color: theme.secondary, bold: false, align: "left"
  });

  slide.addText("2023 - 至今", {
    x: 5.3, y: 2.7, w: 4, h: 0.3,
    fontSize: 11, fontFace: "Arial",
    color: theme.secondary, bold: false, align: "left"
  });

  // 核心优势
  slide.addText("核心优势", {
    x: 5.0, y: 3.2, w: 4.5, h: 0.5,
    fontSize: 18, fontFace: "Microsoft YaHei",
    color: theme.primary, bold: true, align: "left"
  });

  const strengths = [
    "扎实的编程基础与算法功底",
    "熟悉前后端完整技术栈",
    "良好的代码风格与文档能力",
    "较强的学习能力与问题解决能力"
  ];

  strengths.forEach((item, index) => {
    const y = 3.7 + index * 0.4;

    // 圆点
    slide.addShape(pres.shapes.OVAL, {
      x: 5.0, y: y + 0.1, w: 0.12, h: 0.12,
      fill: { color: theme.accent }
    });

    slide.addText(item, {
      x: 5.25, y: y, w: 4.2, h: 0.35,
      fontSize: 13, fontFace: "Microsoft YaHei",
      color: theme.primary, bold: false, align: "left"
    });
  });

  // 页码
  slide.addShape(pres.shapes.OVAL, {
    x: 9.3, y: 5.1, w: 0.4, h: 0.4,
    fill: { color: theme.accent }
  });
  slide.addText("3", {
    x: 9.3, y: 5.1, w: 0.4, h: 0.4,
    fontSize: 12, fontFace: "Arial",
    color: "FFFFFF", bold: true,
    align: "center", valign: "middle"
  });

  return slide;
}

if (require.main === module) {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_16x9';
  const theme = {
    primary: "023047",
    secondary: "219ebc",
    accent: "ffb703",
    light: "8ecae6",
    bg: "ffffff"
  };
  createSlide(pres, theme);
  pres.writeFile({ fileName: "slide-03-preview.pptx" });
}

module.exports = { createSlide, slideConfig };
