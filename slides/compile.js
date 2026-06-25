// compile.js - 编译所有幻灯片为最终PPT
const pptxgen = require('pptxgenjs');
const pres = new pptxgen();

// 设置PPT基本属性
pres.layout = 'LAYOUT_16x9';
pres.title = '软件工程学生能力展示';
pres.author = 'Lb';
pres.subject = '课程汇报';

// 配色主题 - Vibrant & Tech
const theme = {
  primary: "023047",    // 深蓝 - 标题/深色背景
  secondary: "219ebc",  // 中蓝 - 次级元素
  accent: "ffb703",     // 橙黄 - 高亮强调
  light: "8ecae6",      // 浅蓝 - 辅助装饰
  bg: "ffffff"          // 白色背景
};

// 按顺序加载所有幻灯片
const slideCount = 9;
for (let i = 1; i <= slideCount; i++) {
  const num = String(i).padStart(2, '0');
  const slideModule = require(`./slide-${num}.js`);
  slideModule.createSlide(pres, theme);
  console.log(`✓ 已加载 slide-${num}.js`);
}

// 导出最终PPT
pres.writeFile({ fileName: './output/presentation.pptx' })
  .then(() => {
    console.log('\n✅ PPT生成成功！');
    console.log('📁 输出路径: slides/output/presentation.pptx');
  })
  .catch(err => {
    console.error('❌ PPT生成失败:', err);
  });
