// slide-02.js - 目录页
const pptxgen = require("pptxgenjs");

const slideConfig = {
  type: 'toc',
  index: 2,
  title: '目录'
};

function createSlide(pres, theme) {
  const slide = pres.addSlide();
  slide.background = { color: theme.bg };

  // 左侧色块
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.15, h: 5.625,
    fill: { color: theme.primary }
  });

  // 页面标题
  slide.addText("目录", {
    x: 0.6, y: 0.4, w: 3, h: 0.7,
    fontSize: 36, fontFace: "Microsoft YaHei",
    color: theme.primary, bold: true, align: "left"
  });

  slide.addText("CONTENTS", {
    x: 0.6, y: 1.0, w: 3, h: 0.4,
    fontSize: 14, fontFace: "Arial",
    color: theme.secondary, bold: false, align: "left", charSpacing: 4
  });

  // 目录项
  const tocItems = [
    { num: "01", title: "个人简介", desc: "教育背景与基本信息" },
    { num: "02", title: "技术栈", desc: "全栈开发技能展示" },
    { num: "03", title: "项目经验", desc: "实战项目案例分享" },
    { num: "04", title: "软技能", desc: "综合素质与能力" },
    { num: "05", title: "荣誉奖项", desc: "学业成就与证书" },
    { num: "06", title: "未来规划", desc: "职业目标与发展方向" }
  ];

  const startY = 1.7;
  const itemHeight = 0.6;

  tocItems.forEach((item, index) => {
    const y = startY + index * itemHeight;

    // 序号
    slide.addText(item.num, {
      x: 0.6, y: y, w: 0.6, h: 0.5,
      fontSize: 24, fontFace: "Arial",
      color: theme.accent, bold: true, align: "left"
    });

    // 标题
    slide.addText(item.title, {
      x: 1.3, y: y, w: 2, h: 0.5,
      fontSize: 18, fontFace: "Microsoft YaHei",
      color: theme.primary, bold: true, align: "left"
    });

    // 描述
    slide.addText(item.desc, {
      x: 3.5, y: y, w: 3, h: 0.5,
      fontSize: 12, fontFace: "Microsoft YaHei",
      color: theme.secondary, bold: false, align: "left"
    });

    // 分隔线
    slide.addShape(pres.shapes.LINE, {
      x: 0.6, y: y + 0.5, w: 5.5, h: 0,
      line: { color: theme.light, width: 0.5 }
    });
  });

  // 右侧装饰
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 6.5, y: 1.5, w: 3, h: 3.5,
    fill: { color: theme.primary, transparency: 10 }
  });

  slide.addShape(pres.shapes.RECTANGLE, {
    x: 7, y: 2, w: 2.5, h: 2.5,
    fill: { color: theme.secondary, transparency: 20 }
  });

  // 页码
  slide.addShape(pres.shapes.OVAL, {
    x: 9.3, y: 5.1, w: 0.4, h: 0.4,
    fill: { color: theme.accent }
  });
  slide.addText("2", {
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
  pres.writeFile({ fileName: "slide-02-preview.pptx" });
}

module.exports = { createSlide, slideConfig };
