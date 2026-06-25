// slide-04.js - 技术栈
const pptxgen = require("pptxgenjs");

const slideConfig = {
  type: 'content',
  index: 4,
  title: '技术栈'
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
  slide.addText("02", {
    x: 0.5, y: 0.3, w: 0.8, h: 0.6,
    fontSize: 32, fontFace: "Arial",
    color: theme.accent, bold: true, align: "left"
  });

  slide.addText("技术栈", {
    x: 1.3, y: 0.35, w: 3, h: 0.5,
    fontSize: 28, fontFace: "Microsoft YaHei",
    color: theme.primary, bold: true, align: "left"
  });

  // 技术分类卡片
  const techCategories = [
    {
      title: "前端开发",
      items: ["HTML/CSS/JavaScript", "Vue.js / React", "TypeScript", "Webpack / Vite"]
    },
    {
      title: "后端开发",
      items: ["Node.js / Express", "Python / Flask", "Java / Spring", "RESTful API 设计"]
    },
    {
      title: "数据库",
      items: ["MySQL / PostgreSQL", "MongoDB", "Redis 缓存", "数据库优化"]
    },
    {
      title: "工具与平台",
      items: ["Git / GitHub", "Docker 容器化", "Linux 服务器", "CI/CD 持续集成"]
    }
  ];

  const cardWidth = 2.1;
  const cardHeight = 3.0;
  const startX = 0.5;
  const startY = 1.2;
  const gap = 0.3;

  techCategories.forEach((category, index) => {
    const x = startX + index * (cardWidth + gap);

    // 卡片背景
    slide.addShape(pres.shapes.RECTANGLE, {
      x: x, y: startY, w: cardWidth, h: cardHeight,
      fill: { color: theme.primary }
    });

    // 顶部色条
    slide.addShape(pres.shapes.RECTANGLE, {
      x: x, y: startY, w: cardWidth, h: 0.08,
      fill: { color: theme.accent }
    });

    // 分类标题
    slide.addText(category.title, {
      x: x, y: startY + 0.25, w: cardWidth, h: 0.45,
      fontSize: 16, fontFace: "Microsoft YaHei",
      color: "FFFFFF", bold: true, align: "center"
    });

    // 技术列表
    category.items.forEach((item, itemIndex) => {
      const itemY = startY + 0.85 + itemIndex * 0.5;

      slide.addText("●", {
        x: x + 0.15, y: itemY, w: 0.3, h: 0.4,
        fontSize: 8, fontFace: "Arial",
        color: theme.accent, bold: false, align: "left"
      });

      slide.addText(item, {
        x: x + 0.35, y: itemY, w: cardWidth - 0.5, h: 0.4,
        fontSize: 11, fontFace: "Microsoft YaHei",
        color: theme.light, bold: false, align: "left"
      });
    });
  });

  // 底部 - 其他技能
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 4.4, w: 9, h: 0.8,
    fill: { color: theme.light, transparency: 50 }
  });

  slide.addText("其他技能：", {
    x: 0.7, y: 4.55, w: 1.2, h: 0.5,
    fontSize: 13, fontFace: "Microsoft YaHei",
    color: theme.primary, bold: true, align: "left"
  });

  const otherSkills = ["计算机网络", "数据结构与算法", "软件工程原理", "设计模式", "敏捷开发"];
  otherSkills.forEach((skill, index) => {
    const tagX = 2.0 + index * 1.5;

    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: tagX, y: 4.6, w: 1.3, h: 0.4,
      fill: { color: theme.secondary },
      rectRadius: 0.05
    });

    slide.addText(skill, {
      x: tagX, y: 4.6, w: 1.3, h: 0.4,
      fontSize: 10, fontFace: "Microsoft YaHei",
      color: "FFFFFF", bold: false,
      align: "center", valign: "middle"
    });
  });

  // 页码
  slide.addShape(pres.shapes.OVAL, {
    x: 9.3, y: 5.1, w: 0.4, h: 0.4,
    fill: { color: theme.accent }
  });
  slide.addText("4", {
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
  pres.writeFile({ fileName: "slide-04-preview.pptx" });
}

module.exports = { createSlide, slideConfig };
