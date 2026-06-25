// slide-05.js - 项目经验 1
const pptxgen = require("pptxgenjs");

const slideConfig = {
  type: 'content',
  index: 5,
  title: '项目经验'
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
  slide.addText("03", {
    x: 0.5, y: 0.3, w: 0.8, h: 0.6,
    fontSize: 32, fontFace: "Arial",
    color: theme.accent, bold: true, align: "left"
  });

  slide.addText("项目经验", {
    x: 1.3, y: 0.35, w: 3, h: 0.5,
    fontSize: 28, fontFace: "Microsoft YaHei",
    color: theme.primary, bold: true, align: "left"
  });

  // 项目1卡片
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 1.1, w: 4.3, h: 2.5,
    fill: { color: theme.primary }
  });

  // 项目序号
  slide.addShape(pres.shapes.OVAL, {
    x: 0.7, y: 1.3, w: 0.6, h: 0.6,
    fill: { color: theme.accent }
  });

  slide.addText("01", {
    x: 0.7, y: 1.3, w: 0.6, h: 0.6,
    fontSize: 16, fontFace: "Arial",
    color: "FFFFFF", bold: true,
    align: "center", valign: "middle"
  });

  slide.addText("校园二手交易平台", {
    x: 1.5, y: 1.35, w: 3, h: 0.5,
    fontSize: 18, fontFace: "Microsoft YaHei",
    color: "FFFFFF", bold: true, align: "left"
  });

  slide.addText("全栈开发项目", {
    x: 1.5, y: 1.8, w: 3, h: 0.35,
    fontSize: 11, fontFace: "Microsoft YaHei",
    color: theme.light, bold: false, align: "left"
  });

  // 项目描述
  slide.addText([
    { text: "项目描述：", options: { bold: true, breakLine: true } },
    { text: "一个面向校园的二手物品交易平台，支持用户发布、浏览、搜索和管理二手商品。", options: { breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "技术栈：Vue3 + Node.js + MySQL", options: { breakLine: true } },
    { text: "担任角色：全栈开发", options: { breakLine: false } }
  ], {
    x: 0.7, y: 2.3, w: 3.9, h: 1.2,
    fontSize: 10, fontFace: "Microsoft YaHei",
    color: theme.light, bold: false, align: "left", valign: "top"
  });

  // 项目2卡片
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 5.2, y: 1.1, w: 4.3, h: 2.5,
    fill: { color: theme.secondary }
  });

  // 项目序号
  slide.addShape(pres.shapes.OVAL, {
    x: 5.4, y: 1.3, w: 0.6, h: 0.6,
    fill: { color: theme.accent }
  });

  slide.addText("02", {
    x: 5.4, y: 1.3, w: 0.6, h: 0.6,
    fontSize: 16, fontFace: "Arial",
    color: "FFFFFF", bold: true,
    align: "center", valign: "middle"
  });

  slide.addText("在线学习管理系统", {
    x: 6.2, y: 1.35, w: 3, h: 0.5,
    fontSize: 18, fontFace: "Microsoft YaHei",
    color: "FFFFFF", bold: true, align: "left"
  });

  slide.addText("Web 应用开发", {
    x: 6.2, y: 1.8, w: 3, h: 0.35,
    fontSize: 11, fontFace: "Microsoft YaHei",
    color: "FFFFFF", bold: false, align: "left"
  });

  // 项目描述
  slide.addText([
    { text: "项目描述：", options: { bold: true, breakLine: true } },
    { text: "为学校课程设计的在线学习管理系统，包含课程管理、作业提交、成绩查询等功能。", options: { breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "技术栈：React + Spring Boot + MongoDB", options: { breakLine: true } },
    { text: "担任角色：前端开发", options: { breakLine: false } }
  ], {
    x: 5.4, y: 2.3, w: 3.9, h: 1.2,
    fontSize: 10, fontFace: "Microsoft YaHei",
    color: "FFFFFF", bold: false, align: "left", valign: "top"
  });

  // 项目3卡片
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 3.8, w: 4.3, h: 1.4,
    fill: { color: theme.light, transparency: 50 }
  });

  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 3.8, w: 0.08, h: 1.4,
    fill: { color: theme.accent }
  });

  slide.addText("03  个人博客系统", {
    x: 0.75, y: 3.95, w: 3.8, h: 0.4,
    fontSize: 15, fontFace: "Microsoft YaHei",
    color: theme.primary, bold: true, align: "left"
  });

  slide.addText("技术栈：Next.js + MDX + Vercel | 展示个人技术文章与项目作品", {
    x: 0.75, y: 4.4, w: 3.8, h: 0.6,
    fontSize: 10, fontFace: "Microsoft YaHei",
    color: theme.secondary, bold: false, align: "left"
  });

  // 项目4卡片
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 5.2, y: 3.8, w: 4.3, h: 1.4,
    fill: { color: theme.light, transparency: 50 }
  });

  slide.addShape(pres.shapes.RECTANGLE, {
    x: 5.2, y: 3.8, w: 0.08, h: 1.4,
    fill: { color: theme.accent }
  });

  slide.addText("04  天气数据可视化", {
    x: 5.45, y: 3.95, w: 3.8, h: 0.4,
    fontSize: 15, fontFace: "Microsoft YaHei",
    color: theme.primary, bold: true, align: "left"
  });

  slide.addText("技术栈：Python + ECharts + Flask | 数据采集、清洗与可视化展示", {
    x: 5.45, y: 4.4, w: 3.8, h: 0.6,
    fontSize: 10, fontFace: "Microsoft YaHei",
    color: theme.secondary, bold: false, align: "left"
  });

  // 页码
  slide.addShape(pres.shapes.OVAL, {
    x: 9.3, y: 5.1, w: 0.4, h: 0.4,
    fill: { color: theme.accent }
  });
  slide.addText("5", {
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
  pres.writeFile({ fileName: "slide-05-preview.pptx" });
}

module.exports = { createSlide, slideConfig };
