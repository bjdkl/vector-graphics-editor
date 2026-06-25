// slide-06.js - 软技能
const pptxgen = require("pptxgenjs");

const slideConfig = {
  type: 'content',
  index: 6,
  title: '软技能'
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
  slide.addText("04", {
    x: 0.5, y: 0.3, w: 0.8, h: 0.6,
    fontSize: 32, fontFace: "Arial",
    color: theme.accent, bold: true, align: "left"
  });

  slide.addText("软技能", {
    x: 1.3, y: 0.35, w: 3, h: 0.5,
    fontSize: 28, fontFace: "Microsoft YaHei",
    color: theme.primary, bold: true, align: "left"
  });

  // 技能网格 - 2x3布局
  const skills = [
    { title: "团队协作", desc: "善于与团队成员沟通配合，积极参与代码评审，具备良好的团队协作意识", icon: "🤝" },
    { title: "学习能力", desc: "保持技术热情，持续学习新技术，通过在线课程和开源项目不断提升", icon: "📚" },
    { title: "问题解决", desc: "具备良好的逻辑思维，能够快速定位问题根源，提出有效的解决方案", icon: "💡" },
    { title: "沟通表达", desc: "能够清晰表达技术方案，善于倾听需求，具备良好的文档编写能力", icon: "🗣️" },
    { title: "时间管理", desc: "能够合理规划任务优先级，在规定时间内高质量完成开发工作", icon: "⏱️" },
    { title: "创新思维", desc: "对新技术保持敏感，敢于尝试新方案，注重用户体验与技术创新", icon: "🚀" }
  ];

  const cardWidth = 2.9;
  const cardHeight = 1.9;
  const startX = 0.5;
  const startY = 1.1;
  const gapX = 0.2;
  const gapY = 0.2;

  skills.forEach((skill, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const x = startX + col * (cardWidth + gapX);
    const y = startY + row * (cardHeight + gapY);

    // 卡片背景
    slide.addShape(pres.shapes.RECTANGLE, {
      x: x, y: y, w: cardWidth, h: cardHeight,
      fill: { color: theme.primary }
    });

    // 顶部装饰
    slide.addShape(pres.shapes.RECTANGLE, {
      x: x, y: y, w: cardWidth, h: 0.06,
      fill: { color: theme.accent }
    });

    // 标题
    slide.addText(skill.title, {
      x: x + 0.2, y: y + 0.2, w: cardWidth - 0.4, h: 0.45,
      fontSize: 16, fontFace: "Microsoft YaHei",
      color: "FFFFFF", bold: true, align: "left"
    });

    // 描述
    slide.addText(skill.desc, {
      x: x + 0.2, y: y + 0.7, w: cardWidth - 0.4, h: 1.1,
      fontSize: 10, fontFace: "Microsoft YaHei",
      color: theme.light, bold: false, align: "left", valign: "top"
    });
  });

  // 底部 - 英语能力
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 5.0, w: 9, h: 0.5,
    fill: { color: theme.light, transparency: 50 }
  });

  slide.addText("语言能力：英语 CET-4 / 听说读写能力", {
    x: 0.7, y: 5.1, w: 8.6, h: 0.3,
    fontSize: 12, fontFace: "Microsoft YaHei",
    color: theme.primary, bold: false, align: "left"
  });

  // 页码
  slide.addShape(pres.shapes.OVAL, {
    x: 9.3, y: 5.1, w: 0.4, h: 0.4,
    fill: { color: theme.accent }
  });
  slide.addText("6", {
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
  pres.writeFile({ fileName: "slide-06-preview.pptx" });
}

module.exports = { createSlide, slideConfig };
