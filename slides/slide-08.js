// slide-08.js - 未来规划
const pptxgen = require("pptxgenjs");

const slideConfig = {
  type: 'content',
  index: 8,
  title: '未来规划'
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
  slide.addText("06", {
    x: 0.5, y: 0.3, w: 0.8, h: 0.6,
    fontSize: 32, fontFace: "Arial",
    color: theme.accent, bold: true, align: "left"
  });

  slide.addText("未来规划", {
    x: 1.3, y: 0.35, w: 3, h: 0.5,
    fontSize: 28, fontFace: "Microsoft YaHei",
    color: theme.primary, bold: true, align: "left"
  });

  // 时间轴布局
  // 中心线
  slide.addShape(pres.shapes.LINE, {
    x: 2.5, y: 1.3, w: 0, h: 3.5,
    line: { color: theme.secondary, width: 2 }
  });

  // 规划节点
  const plans = [
    { year: "短期", title: "夯实基础", desc: "深入学习系统设计、性能优化等核心技能，参与更多实战项目" },
    { year: "中期", title: "专业深耕", desc: "成为某一技术领域的专家，建立个人技术影响力" },
    { year: "长期", title: "职业发展", desc: "成长为高级工程师或技术管理者，带领团队完成复杂项目" }
  ];

  plans.forEach((plan, index) => {
    const y = 1.3 + index * 1.2;

    // 节点圆点
    slide.addShape(pres.shapes.OVAL, {
      x: 2.35, y: y, w: 0.3, h: 0.3,
      fill: { color: theme.accent }
    });

    // 年份/阶段标签
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.5, y: y - 0.1, w: 1.5, h: 0.5,
      fill: { color: theme.primary },
      rectRadius: 0.08
    });

    slide.addText(plan.year, {
      x: 0.5, y: y - 0.1, w: 1.5, h: 0.5,
      fontSize: 14, fontFace: "Microsoft YaHei",
      color: "FFFFFF", bold: true,
      align: "center", valign: "middle"
    });

    // 内容卡片
    slide.addShape(pres.shapes.RECTANGLE, {
      x: 3.0, y: y - 0.2, w: 6.5, h: 1.0,
      fill: { color: theme.light, transparency: 50 }
    });

    slide.addShape(pres.shapes.RECTANGLE, {
      x: 3.0, y: y - 0.2, w: 0.06, h: 1.0,
      fill: { color: theme.accent }
    });

    slide.addText(plan.title, {
      x: 3.2, y: y - 0.1, w: 6, h: 0.4,
      fontSize: 16, fontFace: "Microsoft YaHei",
      color: theme.primary, bold: true, align: "left"
    });

    slide.addText(plan.desc, {
      x: 3.2, y: y + 0.35, w: 6, h: 0.4,
      fontSize: 12, fontFace: "Microsoft YaHei",
      color: theme.secondary, bold: false, align: "left"
    });
  });

  // 底部 - 目标总结
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 4.85, w: 9, h: 0.6,
    fill: { color: theme.primary }
  });

  slide.addText("目标：成为一名优秀的全栈软件工程师，为社会创造价值", {
    x: 0.7, y: 4.95, w: 8.6, h: 0.4,
    fontSize: 14, fontFace: "Microsoft YaHei",
    color: "FFFFFF", bold: true, align: "center"
  });

  // 页码
  slide.addShape(pres.shapes.OVAL, {
    x: 9.3, y: 5.1, w: 0.4, h: 0.4,
    fill: { color: theme.accent }
  });
  slide.addText("8", {
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
  pres.writeFile({ fileName: "slide-08-preview.pptx" });
}

module.exports = { createSlide, slideConfig };
