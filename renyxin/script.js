// ==================== 主题切换功能 ====================
const themeToggle = document.getElementById("themeToggle");
const body = document.body;

// 获取系统默认主题或localStorage保存的主题
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
const savedTheme = localStorage.getItem("theme");

// 初始化主题
function initTheme() {
  if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
    body.classList.add("dark-mode");
    updateThemeIcon();
  } else {
    body.classList.remove("dark-mode");
    updateThemeIcon();
  }
}

// 更新主题图标
function updateThemeIcon() {
  const isDark = body.classList.contains("dark-mode");
  themeToggle.textContent = isDark ? "☀️" : "🌙";
}

// 切换主题
themeToggle.addEventListener("click", () => {
  body.classList.toggle("dark-mode");
  const isDark = body.classList.contains("dark-mode");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  updateThemeIcon();
});

// ==================== Pretext视差效果 ====================
class PretextEffect {
  constructor() {
    this.pretextBg = document.getElementById("pretextBg");
    this.pretextBgImage = document.querySelector(".pretext-bg-image");
    this.maxOffset = 50; // 最大偏移像素
    this.init();
  }

  init() {
    window.addEventListener("mousemove", (e) => this.handleMouseMove(e));
    window.addEventListener("scroll", () => this.handleScroll());
  }

  handleMouseMove(e) {
    if (!this.pretextBgImage) return;

    const mouseX = e.clientX / window.innerWidth;
    const mouseY = e.clientY / window.innerHeight;

    const offsetX = (mouseX - 0.5) * this.maxOffset;
    const offsetY = (mouseY - 0.5) * this.maxOffset;

    this.pretextBgImage.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(1.1)`;
  }

  handleScroll() {
    if (!this.pretextBg) return;

    const rect = this.pretextBg.getBoundingClientRect();
    const scrollPercent = -rect.top / window.innerHeight;
    const offset = scrollPercent * 30;

    if (this.pretextBgImage) {
      this.pretextBgImage.style.transform = `translateY(${offset}px) scale(1.1)`;
    }
  }
}

// ==================== 字符浮动动画 ====================
class CharacterAnimation {
  constructor() {
    this.character = document.getElementById("characterImage");
    this.velocity = { x: 0, y: 0 };
    this.position = { x: 0, y: 0 };
    this.init();
  }

  init() {
    window.addEventListener("mousemove", (e) => this.handleMouseMove(e));
    window.addEventListener("scroll", () => this.handleScroll());
  }

  handleMouseMove(e) {
    if (!this.character) return;

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    const moveX = (e.clientX - centerX) * 0.03;
    const moveY = (e.clientY - centerY) * 0.03;

    this.character.style.transform = `translate(${moveX}px, ${moveY}px) scale(1.1)`;
  }

  handleScroll() {
    if (!this.character) return;

    const scrollY = window.scrollY;
    const offset = scrollY * 0.5;

    this.character.style.transform = `translateY(calc(${offset}px + 0px)) scale(1.1)`;
  }
}

// ==================== 滚动动画 ====================
class ScrollAnimation {
  constructor() {
    this.cards = document.querySelectorAll(".gallery-card");
    this.stats = document.querySelectorAll(".stat");
    this.init();
  }

  init() {
    window.addEventListener("scroll", () => this.handleScroll());
    // 初始检查一次
    this.handleScroll();
  }

  handleScroll() {
    [...this.cards, ...this.stats].forEach((element) => {
      const rect = element.getBoundingClientRect();
      const isVisible = rect.top < window.innerHeight * 0.75;

      if (isVisible) {
        element.style.animation = "fadeInUp 0.6s ease-out forwards";
      }
    });
  }
}

// ==================== 平滑滚动与视差 ====================
class SmootherScroll {
  constructor() {
    this.scroll = 0;
    this.smoothScroll = 0;
    this.lerp = 0.1;
    this.init();
  }

  init() {
    window.addEventListener("scroll", () => {
      this.scroll = window.scrollY;
    });

    this.animate();
  }

  animate() {
    this.smoothScroll += (this.scroll - this.smoothScroll) * this.lerp;

    // 应用视差效果到背景元素
    const pretextBg = document.getElementById("pretextBg");
    if (pretextBg) {
      pretextBg.style.transform = `translateY(${this.smoothScroll * 0.5}px)`;
    }

    requestAnimationFrame(() => this.animate());
  }
}

// ==================== 表单处理 ====================
class ContactForm {
  constructor() {
    this.form = document.getElementById("contactForm");
    if (this.form) {
      this.form.addEventListener("submit", (e) => this.handleSubmit(e));
    }
  }

  handleSubmit(e) {
    e.preventDefault();

    // 获取表单数据
    const formData = new FormData(this.form);

    // 这里可以添加实际的表单提交逻辑
    console.log("Form submitted:", {
      name: this.form.elements[0].value,
      email: this.form.elements[1].value,
      message: this.form.elements[2].value,
    });

    // 显示成功消息
    this.showSuccessMessage();

    // 重置表单
    this.form.reset();
  }

  showSuccessMessage() {
    const button = this.form.querySelector(".btn-primary");
    const originalText = button.textContent;

    button.textContent = "✓ 发送成功！";
    button.style.background = "#84d068";

    setTimeout(() => {
      button.textContent = originalText;
      button.style.background = "";
    }, 3000);
  }
}

// ==================== 按钮涟漪效果 ====================
class RippleEffect {
  constructor() {
    this.buttons = document.querySelectorAll(".btn");
    this.init();
  }

  init() {
    this.buttons.forEach((btn) => {
      btn.addEventListener("click", (e) => this.createRipple(e));
    });
  }

  createRipple(e) {
    const btn = e.target;
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    const ripple = document.createElement("span");
    ripple.style.width = ripple.style.height = size + "px";
    ripple.style.left = x + "px";
    ripple.style.top = y + "px";
    ripple.classList.add("ripple");

    btn.appendChild(ripple);

    setTimeout(() => ripple.remove(), 600);
  }
}

// ==================== 导航链接激活 ====================
class NavActivation {
  constructor() {
    this.navLinks = document.querySelectorAll(".nav-menu a");
    this.sections = document.querySelectorAll("section");
    this.init();
  }

  init() {
    window.addEventListener("scroll", () => this.updateActiveLink());
    this.navLinks.forEach((link) => {
      link.addEventListener("click", (e) => this.handleLinkClick(e));
    });
  }

  updateActiveLink() {
    let current = "";

    this.sections.forEach((section) => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.clientHeight;

      if (window.scrollY >= sectionTop - 200) {
        current = section.getAttribute("id");
      }
    });

    this.navLinks.forEach((link) => {
      link.classList.remove("active");
      const href = link.getAttribute("href").slice(1);
      if (href === current) {
        link.classList.add("active");
      }
    });
  }

  handleLinkClick(e) {
    const href = e.target.getAttribute("href");
    const target = document.querySelector(href);

    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth" });
    }
  }
}

// ==================== 初始化 ====================
document.addEventListener("DOMContentLoaded", () => {
  // 初始化所有功能
  initTheme();
  new PretextEffect();
  new CharacterAnimation();
  new ScrollAnimation();
  new SmootherScroll();
  new ContactForm();
  new RippleEffect();
  new NavActivation();

  // 添加一些交互反馈
  console.log(
    "%c🌸 欢迎来到二次元天堂！",
    "font-size: 20px; color: #ff6b9d; font-weight: bold;",
  );
  console.log(
    "%c技术栈：HTML5 + CSS3 + Vanilla JS",
    "font-size: 14px; color: #c06c84;",
  );
});

// ==================== 性能优化 ====================
// 使用RequestAnimationFrame优化动画性能
let ticking = false;

function updateOnScroll() {
  // 更新滚动相关的动画
  ticking = false;
}

window.addEventListener(
  "scroll",
  () => {
    if (!ticking) {
      window.requestAnimationFrame(updateOnScroll);
      ticking = true;
    }
  },
  false,
);

// ==================== 键盘快捷键 ====================
document.addEventListener("keydown", (e) => {
  // Ctrl/Cmd + T 切换主题
  if ((e.ctrlKey || e.metaKey) && e.key === "t") {
    e.preventDefault();
    themeToggle.click();
  }

  // Ctrl/Cmd + D 返回顶部
  if ((e.ctrlKey || e.metaKey) && e.key === "d") {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

// ==================== 网页加载完成提示 ====================
window.addEventListener("load", () => {
  console.log(
    "%c✨ 网页加载完成！",
    "font-size: 16px; color: #84d068; font-weight: bold;",
  );
  document.body.style.opacity = "1";
});
