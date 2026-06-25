// slide-07.js - 荣誉奖项
const pptxgen = require("pptxgenjs");

const slideConfig = {
  type: 'content',
  index: 7,
  title: '荣誉奖项'
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
  slide.addText("05", {
    x: 0.5, y: 0.3, w: 0.8, h: 0.6,
    fontSize: 32, fontFace: "Arial",
    color: theme.accent, bold: true, align: "left"
  });

  slide.addText("荣誉奖项", {
    x: 1.3, y: 0.35, w: 3, h: 0.5,
    fontSize: 28, fontFace: "Microsoft YaHei",
    color: theme.primary, bold: true, align: "left"
  });

  // 荣誉列表
  const awards = [
    { year: "2024", title: "校级一等奖学金", type: "学业" },
    { year: "2024", title: "优秀学生干部", type: "荣誉" },
    { year: "2023", title: "程序设计竞赛二等奖", type: "竞赛" },
    { year: "2023", title: "校级二等奖学金", type: "学业" }
  ];

  awards.forEach((award, index) => {
    const y = 1.2 + index * 0.95;

    // 卡片背景
    slide.addShape(pres.shapes.RECTANGLE, {
      x: 0.5, y: y, w: 5.5, h: 0.8,
      fill: { color: theme.light, transparency: 50 }
    });

    // 年份标签
    slide.addShape(pres.shapes.RECTANGLE, {
      x: 0.5, y: y, w: 0.9, h: 0.8,
      fill: { color: theme.primary }
    });

    slide.addText(award.year, {
      x: 0.5, y: y, w: 0.9, h: 0.8,
      fontSize: 14, fontFace: "Arial",
      color: "FFFFFF", bold: true,
      align: "center", valign: "middle"
    });

    // 奖项名称
    slide.addText(award.title, {
      x: 1.6, y: y + 0.15, w: 3.5, h: 0.5,
      fontSize: 16, fontFace: "Microsoft YaHei",
      color: theme.primary, bold: true, align: "left"
    });

    // 类型标签
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 5.2, y: y + 0.25, w: 0.6, h: 0.3,
      fill: { color: theme.accent },
      rectRadius: 0.05
    });

    slide.addText(award.type, {
      x: 5.2, y: y + 0.25, w: 0.6, h: 0.3,
      fontSize: 10, fontFace: "Microsoft YaHei",
      color: "FFFFFF", bold: false,
      align: "center", valign: "middle"
    });
  });

  // 右侧 - 证书统计
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 6.5, y: 1.2, w: 3, h: 3.5,
    fill: { color: theme.primary }
  });

  slide.addText("在校成就", {
    x: 6.5, y: 1.4, w: 3, h: 0.5,
    fontSize: 18, fontFace: "Microsoft YaHei",
    color: "FFFFFF", bold: true, align: "center"
  });

  // 统计数据
  const stats = [
    { num: "2", label: "次奖学金" },
    { num: "3+", label: "个项目经验" },
    { num: "10+", label: "门核心课程" }
  ];

  stats.forEach((stat, index) => {
    const y = 2.1 + index * 0.9;

    slide.addText(stat.num, {
      x: 6.5, y: y, w: 3, h: 0.5,
      fontSize: 32, fontFace: "Arial",
      color: theme.accent, bold: true, align: "center"
    });

    slide.addText(stat.label, {
      x: 6.5, y: y + 0.5, w: 3, h: 0.3,
      fontSize: 12, fontFace: "Microsoft YaHei",
      color: theme.light, bold: false, align: "center"
    });
  });

  // 底部 - 技能认证
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 5.0, w: 9, h: 0.5,
    fill: { color: theme.secondary, transparency: 30 }
  });

  slide.addText("技能认证：计算机二级（Python） | 普通话水平测试二级甲等", {
    x: 0.7, y: 5.1, w: 8.6, h: 0.3,
    fontSize: 11, fontFace: "Microsoft YaHei",
    color: theme.primary, bold: false, align: "left"
  });

  // 页码
  slide.addShape(pres.shapes.OVAL, {
    x: 9.3, y: 5.1, w: 0.4, h: 0.4,
    fill: { color: theme.accent }
  });
  slide.addText("7", {
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
  pres.writeFile({ fileName: "slide-07-preview.pptx" });
}

module.exports = { createSlide, slideConfig };
