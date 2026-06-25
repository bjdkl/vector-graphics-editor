// slide-09.js - 感谢页
const pptxgen = require("pptxgenjs");

const slideConfig = {
  type: 'summary',
  index: 9,
  title: '感谢观看'
};

function createSlide(pres, theme) {
  const slide = pres.addSlide();
  slide.background = { color: theme.primary };

  // 装饰性几何图形 - 右上角
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 7, y: 0, w: 3, h: 2,
    fill: { color: theme.secondary, transparency: 30 }
  });

  // 装饰性几何图形 - 左下角
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 4, w: 2.5, h: 1.625,
    fill: { color: theme.accent, transparency: 40 }
  });

  // 装饰圆形
  slide.addShape(pres.shapes.OVAL, {
    x: 8.5, y: 3.5, w: 1.2, h: 1.2,
    fill: { color: theme.light, transparency: 50 }
  });

  // 感谢文字
  slide.addText("感谢观看", {
    x: 0, y: 1.8, w: 10, h: 1,
    fontSize: 56, fontFace: "Microsoft YaHei",
    color: "FFFFFF", bold: true, align: "center"
  });

  slide.addText("THANK YOU", {
    x: 0, y: 2.7, w: 10, h: 0.6,
    fontSize: 20, fontFace: "Arial",
    color: theme.light, bold: false, align: "center", charSpacing: 8
  });

  // 分隔线
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 4, y: 3.5, w: 2, h: 0.04,
    fill: { color: theme.accent }
  });

  // 联系方式
  slide.addText("欢迎交流学习", {
    x: 0, y: 3.8, w: 10, h: 0.5,
    fontSize: 16, fontFace: "Microsoft YaHei",
    color: theme.light, bold: false, align: "center"
  });

  // 姓名
  slide.addText("Lb", {
    x: 0, y: 4.4, w: 10, h: 0.5,
    fontSize: 24, fontFace: "Microsoft YaHei",
    color: theme.accent, bold: true, align: "center"
  });

  // 页码
  slide.addShape(pres.shapes.OVAL, {
    x: 9.3, y: 5.1, w: 0.4, h: 0.4,
    fill: { color: theme.accent }
  });
  slide.addText("9", {
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
  pres.writeFile({ fileName: "slide-09-preview.pptx" });
}

module.exports = { createSlide, slideConfig };
