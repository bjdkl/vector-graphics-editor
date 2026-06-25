// slide-01.js - 封面页
const pptxgen = require("pptxgenjs");

const slideConfig = {
  type: 'cover',
  index: 1,
  title: '软件工程学生能力展示'
};

function createSlide(pres, theme) {
  const slide = pres.addSlide();
  slide.background = { color: theme.primary };

  // 装饰性几何图形 - 左上角
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 2.5, h: 2.5,
    fill: { color: theme.secondary, transparency: 30 }
  });

  // 装饰性几何图形 - 右下角
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 7.5, y: 3.5, w: 2.5, h: 2.125,
    fill: { color: theme.accent, transparency: 40 }
  });

  // 装饰圆形
  slide.addShape(pres.shapes.OVAL, {
    x: 8.5, y: 0.3, w: 1.2, h: 1.2,
    fill: { color: theme.light, transparency: 50 }
  });

  // 主标题
  slide.addText("软件工程学生", {
    x: 0.8, y: 1.8, w: 8.4, h: 0.9,
    fontSize: 48, fontFace: "Microsoft YaHei",
    color: "FFFFFF", bold: true, align: "left"
  });

  slide.addText("能力展示", {
    x: 0.8, y: 2.6, w: 8.4, h: 0.8,
    fontSize: 44, fontFace: "Microsoft YaHei",
    color: theme.accent, bold: true, align: "left"
  });

  // 分隔线
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.8, y: 3.5, w: 3, h: 0.06,
    fill: { color: theme.light }
  });

  // 个人信息
  slide.addText("Lb", {
    x: 0.8, y: 3.8, w: 4, h: 0.5,
    fontSize: 24, fontFace: "Microsoft YaHei",
    color: "FFFFFF", bold: false, align: "left"
  });

  slide.addText("全栈开发 · 大三", {
    x: 0.8, y: 4.25, w: 4, h: 0.4,
    fontSize: 16, fontFace: "Microsoft YaHei",
    color: theme.light, bold: false, align: "left"
  });

  slide.addText("课程汇报", {
    x: 0.8, y: 4.7, w: 4, h: 0.4,
    fontSize: 14, fontFace: "Microsoft YaHei",
    color: theme.light, bold: false, align: "left"
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
  pres.writeFile({ fileName: "slide-01-preview.pptx" });
}

module.exports = { createSlide, slideConfig };
